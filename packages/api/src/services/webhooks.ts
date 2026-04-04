/**
 * Webhook Service
 *
 * Handles webhook delivery with:
 * - HMAC signature verification
 * - Exponential backoff retry logic
 * - Delivery logging
 */

import { and, eq } from 'drizzle-orm'
import {
	WEBHOOK_EVENT_TYPES,
	type WebhookEventType,
	webhookDeliveries,
	webhooks,
	type Database,
} from '@hare/db'

// =============================================================================
// Types
// =============================================================================

export interface TriggerWebhookOptions {
	db: Database
	agentId: string
	event: WebhookEventType
	payload: Record<string, unknown>
}

export interface WebhookDeliveryResult {
	webhookId: string
	success: boolean
	statusCode?: number
	error?: string
	attempts: number
}

export interface WebhookPayload {
	event: WebhookEventType
	timestamp: string
	agentId: string
	data: Record<string, unknown>
	[key: string]: unknown
}

// =============================================================================
// Constants
// =============================================================================

/** Maximum number of retry attempts for failed webhooks */
const MAX_RETRY_ATTEMPTS = 3

/** Retry delays in milliseconds: 1 minute, 5 minutes, 30 minutes */
const RETRY_DELAYS_MS = [60_000, 300_000, 1_800_000] as const

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 10000

// =============================================================================
// HMAC Signature
// =============================================================================

/**
 * Generate HMAC-SHA256 signature for webhook payload.
 *
 * @param payload - The JSON payload to sign
 * @param secret - The webhook secret key
 * @returns The hex-encoded signature
 */
export async function generateSignature(options: {
	payload: string
	secret: string
}): Promise<string> {
	const { payload, secret } = options
	const encoder = new TextEncoder()
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	)

	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))

	// Convert to hex string
	return Array.from(new Uint8Array(signature))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
}

/**
 * Verify HMAC-SHA256 signature for webhook payload.
 *
 * @param payload - The raw payload string
 * @param signature - The signature to verify (hex-encoded)
 * @param secret - The webhook secret key
 * @returns True if signature is valid
 */
export async function verifySignature(options: {
	payload: string
	signature: string
	secret: string
}): Promise<boolean> {
	const { payload, signature, secret } = options
	const expectedSignature = await generateSignature({ payload, secret })
	return signature === expectedSignature
}

// =============================================================================
// SSRF Protection (delegated to consolidated module)
// =============================================================================

import { isUrlSafe } from '@hare/tools/security/ssrf'

/**
 * Check if a webhook URL is safe to deliver to.
 * Delegates to the consolidated SSRF module for consistency.
 */
export function isWebhookUrlSafe(url: string): { safe: boolean; reason?: string } {
	return isUrlSafe(url)
}

// =============================================================================
// Webhook Delivery
// =============================================================================

/**
 * Deliver a webhook to its configured URL.
 *
 * @param webhook - The webhook configuration
 * @param payload - The payload to send
 * @returns Delivery result with status
 */
async function deliverWebhook(options: {
	webhook: {
		id: string
		url: string
		secret: string
	}
	payload: WebhookPayload
}): Promise<{
	success: boolean
	statusCode?: number
	responseBody?: string
	error?: string
}> {
	const { webhook, payload } = options

	// SSRF protection: validate URL before making request
	const urlCheck = isWebhookUrlSafe(webhook.url)
	if (!urlCheck.safe) {
		return { success: false, error: `Blocked URL: ${urlCheck.reason}` }
	}

	const payloadString = JSON.stringify(payload)
	const signature = await generateSignature({ payload: payloadString, secret: webhook.secret })

	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

	try {
		// Use redirect: 'manual' to prevent SSRF via open redirects
		// (attacker could redirect from public URL to internal IP)
		const response = await fetch(webhook.url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Webhook-Signature': signature,
				'X-Webhook-Event': payload.event,
				'X-Webhook-Timestamp': payload.timestamp,
				'X-Webhook-Id': webhook.id,
			},
			body: payloadString,
			redirect: 'manual',
			signal: controller.signal,
		})

		clearTimeout(timeoutId)

		const responseBody = await response.text().catch(() => '')

		return {
			success: response.ok,
			statusCode: response.status,
			responseBody: responseBody.slice(0, 1000), // Limit response body storage
			error: response.ok ? undefined : `HTTP ${response.status}`,
		}
	} catch (error) {
		clearTimeout(timeoutId)
		const errorMessage =
			error instanceof Error
				? error.name === 'AbortError'
					? 'Request timeout'
					: error.message
				: 'Unknown error'

		return {
			success: false,
			error: errorMessage,
		}
	}
}

/**
 * Calculate the next retry time based on attempt count.
 * Retry delays: 1 minute, 5 minutes, 30 minutes.
 *
 * @param attemptCount - Current attempt count (1-based)
 * @returns Next retry timestamp or null if max retries exceeded
 */
function calculateNextRetryAt(attemptCount: number): Date | null {
	if (attemptCount >= MAX_RETRY_ATTEMPTS) {
		return null
	}
	const delayIndex = attemptCount - 1
	const delayMs = RETRY_DELAYS_MS[delayIndex] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]
	if (delayMs === undefined) {
		return null
	}
	return new Date(Date.now() + delayMs)
}

/**
 * Attempt a single webhook delivery and update the delivery record.
 *
 * @returns Updated delivery result
 */
async function attemptDelivery(options: {
	db: Database
	deliveryId: string
	webhook: {
		id: string
		url: string
		secret: string
	}
	payload: WebhookPayload
	attemptCount: number
}): Promise<WebhookDeliveryResult> {
	const { db, deliveryId, webhook, payload, attemptCount } = options

	const result = await deliverWebhook({ webhook, payload })

	if (result.success) {
		// Update delivery record with success
		await db
			.update(webhookDeliveries)
			.set({
				status: 'success',
				statusCode: result.statusCode,
				responseBody: result.responseBody,
				attemptCount,
				nextRetryAt: null,
			})
			.where(eq(webhookDeliveries.id, deliveryId))

		return {
			webhookId: webhook.id,
			success: true,
			statusCode: result.statusCode,
			attempts: attemptCount,
		}
	}

	// Delivery failed - calculate next retry or mark as failed
	const nextRetryAt = calculateNextRetryAt(attemptCount)

	if (nextRetryAt) {
		// Schedule retry
		await db
			.update(webhookDeliveries)
			.set({
				status: 'pending',
				statusCode: result.statusCode,
				responseBody: result.responseBody,
				attemptCount,
				nextRetryAt,
			})
			.where(eq(webhookDeliveries.id, deliveryId))

		return {
			webhookId: webhook.id,
			success: false,
			statusCode: result.statusCode,
			error: result.error,
			attempts: attemptCount,
		}
	}

	// Max retries exceeded - mark as failed
	await db
		.update(webhookDeliveries)
		.set({
			status: 'failed',
			statusCode: result.statusCode,
			responseBody: result.responseBody,
			attemptCount,
			nextRetryAt: null,
		})
		.where(eq(webhookDeliveries.id, deliveryId))

	// Update webhook status to failed
	await db
		.update(webhooks)
		.set({
			status: 'failed',
			updatedAt: new Date(),
		})
		.where(eq(webhooks.id, webhook.id))

	return {
		webhookId: webhook.id,
		success: false,
		statusCode: result.statusCode,
		error: result.error ?? 'Max retries exceeded',
		attempts: attemptCount,
	}
}

/**
 * Deliver webhook with exponential backoff retry.
 * Implements retry delays of 1 minute, 5 minutes, and 30 minutes.
 */
async function deliverWithRetry(options: {
	db: Database
	webhook: {
		id: string
		url: string
		secret: string
	}
	payload: WebhookPayload
	deliveryId: string
}): Promise<WebhookDeliveryResult> {
	const { db, webhook, payload, deliveryId } = options
	let attemptCount = 0
	let lastResult: WebhookDeliveryResult | null = null

	while (attemptCount < MAX_RETRY_ATTEMPTS) {
		attemptCount++

		// Apply retry delay (except for first attempt)
		if (attemptCount > 1) {
			const delayMs = RETRY_DELAYS_MS[attemptCount - 2] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]
			await new Promise((resolve) => setTimeout(resolve, delayMs))
		}

		lastResult = await attemptDelivery({
			db,
			deliveryId,
			webhook,
			payload,
			attemptCount,
		})

		if (lastResult.success) {
			return lastResult
		}
	}

	return lastResult ?? {
		webhookId: webhook.id,
		success: false,
		error: 'No delivery attempts made',
		attempts: 0,
	}
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Trigger webhooks for an agent event.
 *
 * Finds all active webhooks subscribed to the event type and delivers
 * the payload with HMAC signature and retry logic.
 *
 * @param options - Trigger options
 * @returns Array of delivery results
 */
export async function triggerWebhook(
	options: TriggerWebhookOptions,
): Promise<WebhookDeliveryResult[]> {
	const { db, agentId, event, payload } = options

	// Validate event type
	if (!WEBHOOK_EVENT_TYPES.includes(event)) {
		throw new Error(`Invalid webhook event type: ${event}`)
	}

	// Find all active webhooks for this agent subscribed to this event
	const activeWebhooks = await db
		.select()
		.from(webhooks)
		.where(and(eq(webhooks.agentId, agentId), eq(webhooks.status, 'active')))

	// Filter to webhooks subscribed to this event
	const matchingWebhooks = activeWebhooks.filter((w) => w.events.includes(event))

	if (matchingWebhooks.length === 0) {
		return []
	}

	// Build the webhook payload
	const webhookPayload: WebhookPayload = {
		event,
		timestamp: new Date().toISOString(),
		agentId,
		data: payload,
	}

	// Deliver to all matching webhooks in parallel
	const results = await Promise.all(
		matchingWebhooks.map(async (webhook) => {
			// Create delivery record before sending
			const [delivery] = await db
				.insert(webhookDeliveries)
				.values({
					webhookId: webhook.id,
					event,
					payload: webhookPayload as unknown as Record<string, unknown>,
					status: 'pending',
					attemptCount: 0,
				})
				.returning()

			if (!delivery) {
				return {
					webhookId: webhook.id,
					success: false,
					error: 'Failed to create delivery record',
					attempts: 0,
				}
			}

			return deliverWithRetry({
				db,
				webhook: {
					id: webhook.id,
					url: webhook.url,
					secret: webhook.secret,
				},
				payload: webhookPayload,
				deliveryId: delivery.id,
			})
		}),
	)

	return results
}

/**
 * Generate a secure webhook secret.
 *
 * @returns A random 32-byte hex string
 */
export function generateWebhookSecret(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32))
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
}

/**
 * Get webhook delivery statistics for an agent.
 */
export async function getWebhookStats(options: { db: Database; agentId: string }): Promise<{
	totalDeliveries: number
	successfulDeliveries: number
	failedDeliveries: number
	activeWebhooks: number
}> {
	const { db, agentId } = options

	// Get all webhooks for this agent
	const agentWebhooks = await db.select().from(webhooks).where(eq(webhooks.agentId, agentId))

	const webhookIds = agentWebhooks.map((w) => w.id)

	if (webhookIds.length === 0) {
		return {
			totalDeliveries: 0,
			successfulDeliveries: 0,
			failedDeliveries: 0,
			activeWebhooks: 0,
		}
	}

	// Get all deliveries for these webhooks
	const deliveries = await Promise.all(
		webhookIds.map((id) =>
			db.select().from(webhookDeliveries).where(eq(webhookDeliveries.webhookId, id))
		),
	)

	const allDeliveries = deliveries.flat()
	const successfulDeliveries = allDeliveries.filter((d) => d.status === 'success')
	const failedDeliveries = allDeliveries.filter((d) => d.status === 'failed')
	const activeWebhooksList = agentWebhooks.filter((w) => w.status === 'active')

	return {
		totalDeliveries: allDeliveries.length,
		successfulDeliveries: successfulDeliveries.length,
		failedDeliveries: failedDeliveries.length,
		activeWebhooks: activeWebhooksList.length,
	}
}

/**
 * Reactivate a failed webhook (reset status to active).
 */
export async function reactivateWebhook(options: {
	db: Database
	webhookId: string
}): Promise<boolean> {
	const { db, webhookId } = options

	const result = await db
		.update(webhooks)
		.set({
			status: 'active',
			updatedAt: new Date(),
		})
		.where(eq(webhooks.id, webhookId))
		.returning()

	return result.length > 0
}

/**
 * Retry a failed or pending webhook delivery.
 *
 * @returns The updated delivery record
 */
export async function retryDelivery(options: {
	db: Database
	deliveryId: string
	webhook: {
		id: string
		url: string
		secret: string
	}
}): Promise<typeof webhookDeliveries.$inferSelect> {
	const { db, deliveryId, webhook } = options

	// SSRF protection: validate URL before making request
	const urlCheck = isWebhookUrlSafe(webhook.url)
	if (!urlCheck.safe) {
		throw new Error(`Blocked URL: ${urlCheck.reason}`)
	}

	// Get the delivery record
	const [delivery] = await db
		.select()
		.from(webhookDeliveries)
		.where(eq(webhookDeliveries.id, deliveryId))

	if (!delivery) {
		throw new Error('Delivery not found')
	}

	// Build the payload
	const webhookPayload: WebhookPayload = delivery.payload as WebhookPayload

	// Deliver the webhook
	const payloadString = JSON.stringify(webhookPayload)
	const signature = await generateSignature({ payload: payloadString, secret: webhook.secret })

	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

	let result: {
		success: boolean
		statusCode?: number
		responseBody?: string
		error?: string
	}

	try {
		const response = await fetch(webhook.url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Webhook-Signature': signature,
				'X-Webhook-Event': webhookPayload.event,
				'X-Webhook-Timestamp': webhookPayload.timestamp,
				'X-Webhook-Id': webhook.id,
			},
			body: payloadString,
			redirect: 'manual',
			signal: controller.signal,
		})

		clearTimeout(timeoutId)

		const responseBody = await response.text().catch(() => '')

		result = {
			success: response.ok,
			statusCode: response.status,
			responseBody: responseBody.slice(0, 1000),
			error: response.ok ? undefined : `HTTP ${response.status}`,
		}
	} catch (error) {
		clearTimeout(timeoutId)
		const errorMessage =
			error instanceof Error
				? error.name === 'AbortError'
					? 'Request timeout'
					: error.message
				: 'Unknown error'

		result = {
			success: false,
			error: errorMessage,
		}
	}

	const newAttemptCount = delivery.attemptCount + 1

	// Update the delivery record
	const [updatedDelivery] = await db
		.update(webhookDeliveries)
		.set({
			status: result.success ? 'success' : newAttemptCount >= MAX_RETRY_ATTEMPTS ? 'failed' : 'pending',
			statusCode: result.statusCode ?? null,
			responseBody: result.responseBody ?? null,
			attemptCount: newAttemptCount,
			nextRetryAt: result.success || newAttemptCount >= MAX_RETRY_ATTEMPTS ? null : calculateNextRetryAt(newAttemptCount),
		})
		.where(eq(webhookDeliveries.id, deliveryId))
		.returning()

	if (!updatedDelivery) {
		throw new Error('Failed to update delivery')
	}

	// If delivery failed after max retries, mark webhook as failed
	if (!result.success && newAttemptCount >= MAX_RETRY_ATTEMPTS) {
		await db
			.update(webhooks)
			.set({
				status: 'failed',
				updatedAt: new Date(),
			})
			.where(eq(webhooks.id, webhook.id))
	}

	return updatedDelivery
}
