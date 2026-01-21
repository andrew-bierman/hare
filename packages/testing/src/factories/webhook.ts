/**
 * Webhook factory for creating test webhook data.
 */

import { createId } from '@hare/db'

/**
 * Webhook event types.
 */
export const WEBHOOK_EVENT_TYPES = [
	'message.received',
	'message.sent',
	'tool.called',
	'error',
	'agent.deployed',
] as const

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number]

/**
 * Webhook status options.
 */
export const WEBHOOK_STATUSES = ['active', 'inactive', 'failed'] as const

export type WebhookStatus = (typeof WEBHOOK_STATUSES)[number]

/**
 * Webhook log status options.
 */
export const WEBHOOK_LOG_STATUSES = ['success', 'failed', 'pending'] as const

export type WebhookLogStatus = (typeof WEBHOOK_LOG_STATUSES)[number]

/**
 * Webhook data shape matching the database schema.
 */
export interface TestWebhook {
	id: string
	agentId: string
	url: string
	secret: string
	events: WebhookEventType[]
	status: WebhookStatus
	description: string | null
	createdAt: Date
	updatedAt: Date
}

/**
 * Webhook log data shape matching the database schema.
 */
export interface TestWebhookLog {
	id: string
	webhookId: string
	event: string
	payload: Record<string, unknown>
	status: WebhookLogStatus
	responseStatus: number | null
	responseBody: string | null
	attempts: number
	error: string | null
	createdAt: Date
	completedAt: Date | null
}

export type TestWebhookOverrides = Partial<TestWebhook>
export type TestWebhookLogOverrides = Partial<TestWebhookLog>

let webhookCounter = 0

/**
 * Creates a test webhook with sensible defaults.
 *
 * @example
 * ```ts
 * // Create a webhook for all events
 * const webhook = createTestWebhook({
 *   agentId: agent.id
 * })
 *
 * // Create a webhook for specific events
 * const webhook = createTestWebhook({
 *   agentId: agent.id,
 *   events: ['message.received', 'error']
 * })
 *
 * // Create an inactive webhook
 * const inactiveWebhook = createTestWebhook({
 *   agentId: agent.id,
 *   status: 'inactive'
 * })
 * ```
 */
export function createTestWebhook(
	overrides: TestWebhookOverrides & { agentId: string },
): TestWebhook {
	webhookCounter++
	const now = new Date()

	return {
		id: overrides.id ?? createId(),
		agentId: overrides.agentId,
		url: overrides.url ?? `https://webhook.example.com/endpoint/${webhookCounter}`,
		secret: overrides.secret ?? `test-secret-${createId()}`,
		events: overrides.events ?? ['message.received', 'message.sent'],
		status: overrides.status ?? 'active',
		description: overrides.description ?? null,
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
	}
}

/**
 * Creates a test webhook log entry.
 *
 * @example
 * ```ts
 * // Create a successful log
 * const log = createTestWebhookLog({
 *   webhookId: webhook.id,
 *   event: 'message.received',
 *   status: 'success',
 *   responseStatus: 200
 * })
 *
 * // Create a failed log
 * const failedLog = createTestWebhookLog({
 *   webhookId: webhook.id,
 *   event: 'error',
 *   status: 'failed',
 *   error: 'Connection timeout'
 * })
 * ```
 */
export function createTestWebhookLog(
	overrides: TestWebhookLogOverrides & { webhookId: string },
): TestWebhookLog {
	const now = new Date()

	return {
		id: overrides.id ?? createId(),
		webhookId: overrides.webhookId,
		event: overrides.event ?? 'message.received',
		payload: overrides.payload ?? { message: 'test payload' },
		status: overrides.status ?? 'pending',
		responseStatus: overrides.responseStatus ?? null,
		responseBody: overrides.responseBody ?? null,
		attempts: overrides.attempts ?? 1,
		error: overrides.error ?? null,
		createdAt: overrides.createdAt ?? now,
		completedAt: overrides.completedAt ?? null,
	}
}

/**
 * Creates multiple test webhooks at once.
 */
export function createTestWebhooks(
	count: number,
	overrides: TestWebhookOverrides & { agentId: string },
): TestWebhook[] {
	return Array.from({ length: count }, () => createTestWebhook(overrides))
}

/**
 * Reset the webhook counter. Useful for test isolation.
 */
export function __resetWebhookCounter(): void {
	webhookCounter = 0
}
