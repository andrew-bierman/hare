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
	webhookLogs,
	webhooks,
} from 'web-app/db/schema'
import type { Database } from 'web-app/db/types'

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

/** Base delay in milliseconds for exponential backoff */
const BASE_RETRY_DELAY_MS = 1000

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
	const payloadString = JSON.stringify(payload)
	const signature = await generateSignature({ payload: payloadString, secret: webhook.secret })

	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

	try {
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
 * Deliver webhook with exponential backoff retry.
 */
async function deliverWithRetry(options: {
	db: Database
	webhook: {
		id: string
		url: string
		secret: string
	}
	payload: WebhookPayload
	logId: string
}): Promise<WebhookDeliveryResult> {
	const { db, webhook, payload, logId } = options
	let attempts = 0
	let lastResult: Awaited<ReturnType<typeof deliverWebhook>> | null = null

	while (attempts < MAX_RETRY_ATTEMPTS) {
		attempts++

		// Apply exponential backoff delay (except for first attempt)
		if (attempts > 1) {
			const delay = BASE_RETRY_DELAY_MS * 2 ** (attempts - 1)
			await new Promise((resolve) => setTimeout(resolve, delay))
		}

		lastResult = await deliverWebhook({ webhook, payload })

		// Update log with attempt count
		await db
			.update(webhookLogs)
			.set({
				attempts,
				status: lastResult.success ? 'success' : 'pending',
				responseStatus: lastResult.statusCode,
				responseBody: lastResult.responseBody,
				error: lastResult.error,
				completedAt: lastResult.success ? new Date() : undefined,
			})
			.where(eq(webhookLogs.id, logId))

		if (lastResult.success) {
			return {
				webhookId: webhook.id,
				success: true,
				statusCode: lastResult.statusCode,
				attempts,
			}
		}
	}

	// Mark as failed after all retries exhausted
	await db
		.update(webhookLogs)
		.set({
			status: 'failed',
			completedAt: new Date(),
		})
		.where(eq(webhookLogs.id, logId))

	// Update webhook status to failed if too many failures
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
		statusCode: lastResult?.statusCode,
		error: lastResult?.error ?? 'Max retries exceeded',
		attempts,
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
			// Create log entry first
			const [log] = await db
				.insert(webhookLogs)
				.values({
					webhookId: webhook.id,
					event,
					payload: webhookPayload as unknown as Record<string, unknown>,
					status: 'pending',
					attempts: 0,
				})
				.returning()

			if (!log) {
				return {
					webhookId: webhook.id,
					success: false,
					error: 'Failed to create log entry',
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
				logId: log.id,
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

	// Get all logs for these webhooks
	const logs = await Promise.all(
		webhookIds.map((id) => db.select().from(webhookLogs).where(eq(webhookLogs.webhookId, id))),
	)

	const allLogs = logs.flat()
	const successfulLogs = allLogs.filter((l) => l.status === 'success')
	const failedLogs = allLogs.filter((l) => l.status === 'failed')
	const activeWebhooks = agentWebhooks.filter((w) => w.status === 'active')

	return {
		totalDeliveries: allLogs.length,
		successfulDeliveries: successfulLogs.length,
		failedDeliveries: failedLogs.length,
		activeWebhooks: activeWebhooks.length,
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
