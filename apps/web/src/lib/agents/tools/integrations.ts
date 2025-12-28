import { z } from 'zod'
import {
	CONTENT_TYPE_JSON,
	HTTP_USER_AGENT,
	WORKSPACE_PREFIX,
	ZAPIER_DEFAULT_TIMEOUT_MS,
	ZAPIER_DESCRIPTION_MAX_LENGTH,
	ZAPIER_INTEGRATION_NAME_MAX_LENGTH,
	ZAPIER_INTEGRATION_PREFIX,
	ZAPIER_WAIT_TIMEOUT_MS,
	ZAPIER_WEBHOOK_HOSTNAME,
} from './constants'
import { createTool, failure, success, type ToolContext } from './types'

/**
 * Integration Philosophy:
 *
 * All external service integrations go through Zapier. This approach:
 *
 * 1. Zero API key management - users connect services in their Zapier account
 * 2. 6,000+ app connections available immediately
 * 3. Users configure integrations visually in Zapier's UI
 * 4. Credentials stay in Zapier, not in Hare
 * 5. No external service testing/maintenance burden
 *
 * Enhanced with "saved integrations" - users save webhook URLs with friendly names,
 * so agents can trigger by name (e.g., "notify-slack") instead of raw URLs.
 */

// ==========================================
// KV Storage Helpers for Zapier Integrations
// ==========================================

const ZAPIER_PREFIX = ZAPIER_INTEGRATION_PREFIX

interface SavedZapierIntegration {
	name: string
	webhookUrl: string
	description: string
	defaultData?: Record<string, unknown>
	createdAt: string
	lastTriggeredAt?: string
	triggerCount: number
}

function integrationKey(workspaceId: string, name: string): string {
	// Validate name doesn't try to escape scope
	if (name.includes('..') || name.includes('/') || name.startsWith('.')) {
		throw new Error('Invalid integration name: special characters not allowed')
	}
	return `${WORKSPACE_PREFIX}${workspaceId}/${ZAPIER_PREFIX}/${name.toLowerCase()}`
}

function listPrefix(workspaceId: string): string {
	return `${WORKSPACE_PREFIX}${workspaceId}/${ZAPIER_PREFIX}/`
}

// ==========================================
// Zapier Save Tool - Save a webhook for reuse
// ==========================================

export const zapierSaveTool = createTool({
	id: 'zapier_save',
	description: `Save a Zapier webhook URL with a friendly name for easy reuse.

**Setup (one-time):**
1. Go to zapier.com and create a new Zap
2. Choose "Webhooks by Zapier" as the trigger → "Catch Hook"
3. Copy the webhook URL
4. Save it here with a memorable name

**Example:**
- name: "notify-slack"
- webhookUrl: "https://hooks.zapier.com/hooks/catch/123/abc"
- description: "Posts messages to #general channel"

Once saved, trigger it anytime with just the name - no URL needed!`,
	inputSchema: z.object({
		name: z
			.string()
			.min(1)
			.max(ZAPIER_INTEGRATION_NAME_MAX_LENGTH)
			.regex(
				/^[a-z0-9]+(-[a-z0-9]+)*$/,
				'Use lowercase letters, numbers, and hyphens (must start/end with alphanumeric)',
			)
			.describe('Friendly name for this integration (e.g., "notify-slack", "create-task")'),
		webhookUrl: z.string().url().describe('Zapier webhook URL (https://hooks.zapier.com/...)'),
		description: z
			.string()
			.max(ZAPIER_DESCRIPTION_MAX_LENGTH)
			.describe('What does this integration do?'),
		defaultData: z
			.record(z.string(), z.unknown())
			.optional()
			.describe('Default data to include with every trigger (can be overridden)'),
	}),
	execute: async (params, context) => {
		const kv = context.env.KV
		if (!kv) {
			return failure('KV namespace not available')
		}

		try {
			const { name, webhookUrl, description, defaultData } = params

			// Validate webhook URL hostname to prevent bypass attacks
			let parsedUrl: URL
			try {
				parsedUrl = new URL(webhookUrl)
			} catch {
				return failure(
					`Invalid URL format. Zapier webhooks must be from ${ZAPIER_WEBHOOK_HOSTNAME}`,
				)
			}

			if (parsedUrl.hostname !== ZAPIER_WEBHOOK_HOSTNAME) {
				return failure(`Invalid URL. Zapier webhooks must be from ${ZAPIER_WEBHOOK_HOSTNAME}`)
			}

			const key = integrationKey(context.workspaceId, name)

			// Check if already exists and preserve stats on update
			const existing = (await kv.get(key, 'json')) as SavedZapierIntegration | null
			const integration: SavedZapierIntegration = {
				name: name.toLowerCase(),
				webhookUrl,
				description,
				defaultData,
				createdAt: existing?.createdAt ?? new Date().toISOString(),
				lastTriggeredAt: existing?.lastTriggeredAt,
				triggerCount: existing?.triggerCount ?? 0,
			}

			await kv.put(key, JSON.stringify(integration))

			return success({
				saved: true,
				name: integration.name,
				description,
				updated: !!existing,
				message: existing
					? `Updated integration "${name}"`
					: `Saved new integration "${name}" - trigger it anytime with zapier_trigger`,
			})
		} catch (error) {
			return failure(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

// ==========================================
// Zapier List Tool - Discover available integrations
// ==========================================

export const zapierListTool = createTool({
	id: 'zapier_list',
	description: `List all saved Zapier integrations for this workspace.

Use this to discover what integrations are available before triggering them.
Shows name, description, and usage stats for each saved integration.`,
	inputSchema: z.object({
		includeStats: z
			.boolean()
			.optional()
			.default(true)
			.describe('Include trigger count and last triggered time'),
	}),
	execute: async (params, context) => {
		const kv = context.env.KV
		if (!kv) {
			return failure('KV namespace not available')
		}

		try {
			const prefix = listPrefix(context.workspaceId)
			const result = await kv.list({ prefix, limit: 100 })

			const integrations: Array<{
				name: string
				description: string
				triggerCount?: number
				lastTriggeredAt?: string
			}> = []

			for (const key of result.keys) {
				const data = await kv.get<SavedZapierIntegration>(key.name, 'json')
				if (data) {
					integrations.push({
						name: data.name,
						description: data.description,
						...(params.includeStats && {
							triggerCount: data.triggerCount,
							lastTriggeredAt: data.lastTriggeredAt,
						}),
					})
				}
			}

			const truncated = result.list_complete === false
			return success({
				integrations,
				count: integrations.length,
				truncated,
				message:
					integrations.length === 0
						? 'No integrations saved yet. Use zapier_save to add one!'
						: truncated
							? `Found ${integrations.length} integration(s) (more available, results truncated)`
							: `Found ${integrations.length} integration(s)`,
			})
		} catch (error) {
			return failure(`Failed to list: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

// ==========================================
// Zapier Trigger Tool - THE main integration tool
// ==========================================

export const zapierTriggerTool = createTool({
	id: 'zapier_trigger',
	description: `Trigger a Zapier integration by name or URL.

**By name (recommended):**
Use a saved integration name like "notify-slack" or "create-task".
The webhook URL is looked up automatically.

**By URL (fallback):**
Provide a raw Zapier webhook URL directly.

**Data:**
Pass any data you want - it will be available in your Zap's trigger step.
If the saved integration has defaultData, it will be merged (your data takes precedence).

**Examples:**
- Trigger by name: { name: "notify-slack", data: { message: "Hello!" } }
- Trigger by URL: { webhookUrl: "https://hooks.zapier.com/...", data: { ... } }`,
	inputSchema: z.object({
		name: z.string().optional().describe('Name of a saved integration (e.g., "notify-slack")'),
		webhookUrl: z
			.string()
			.url()
			.optional()
			.describe('Direct Zapier webhook URL (use if not using a saved name)'),
		data: z
			.record(z.string(), z.unknown())
			.optional()
			.default({})
			.describe('Data to send to the Zap'),
		waitForResponse: z
			.boolean()
			.optional()
			.default(false)
			.describe('Wait for Zap response (requires Webhooks by Zapier premium)'),
	}),
	execute: async (params, context) => {
		const kv = context.env.KV
		if (!kv && params.name) {
			return failure('KV namespace not available (required for named integrations)')
		}

		try {
			const { name, data, waitForResponse } = params
			let { webhookUrl } = params
			let savedIntegration: SavedZapierIntegration | null = null

			// Resolve webhook URL from name if provided
			if (name && kv) {
				const key = integrationKey(context.workspaceId, name)
				savedIntegration = await kv.get<SavedZapierIntegration>(key, 'json')

				if (!savedIntegration) {
					return failure(
						`Integration "${name}" not found. Use zapier_list to see available integrations.`,
					)
				}

				webhookUrl = savedIntegration.webhookUrl
			}

			if (!webhookUrl) {
				return failure('Provide either a name (for saved integration) or webhookUrl')
			}

			// Validate webhook URL hostname to prevent bypass attacks
			let parsedUrl: URL
			try {
				parsedUrl = new URL(webhookUrl)
			} catch {
				return failure(
					`Invalid URL format. Zapier webhooks must be from ${ZAPIER_WEBHOOK_HOSTNAME}`,
				)
			}

			if (parsedUrl.hostname !== ZAPIER_WEBHOOK_HOSTNAME) {
				return failure(`Invalid URL. Zapier webhooks must be from ${ZAPIER_WEBHOOK_HOSTNAME}`)
			}

			// Merge default data with provided data (provided takes precedence)
			const mergedData = {
				...(savedIntegration?.defaultData || {}),
				...data,
			}

			const controller = new AbortController()
			const timeoutId = setTimeout(
				() => controller.abort(),
				waitForResponse ? ZAPIER_WAIT_TIMEOUT_MS : ZAPIER_DEFAULT_TIMEOUT_MS,
			)

			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': CONTENT_TYPE_JSON, 'User-Agent': HTTP_USER_AGENT },
				body: JSON.stringify({
					...mergedData,
					_hare: {
						workspaceId: context.workspaceId,
						integration: name || 'direct',
						timestamp: new Date().toISOString(),
					},
				}),
				signal: controller.signal,
			})

			clearTimeout(timeoutId)

			if (!response.ok) {
				return failure(`Zapier error: ${response.status} ${response.statusText}`)
			}

			const responseData = await response.json().catch(() => response.text())

			// Update trigger stats if using saved integration
			// Note: Stats are best-effort approximate. Concurrent triggers may result in
			// slightly inaccurate counts since KV doesn't support atomic increments.
			if (savedIntegration && kv && name) {
				const key = integrationKey(context.workspaceId, name)
				savedIntegration.triggerCount += 1
				savedIntegration.lastTriggeredAt = new Date().toISOString()
				await kv.put(key, JSON.stringify(savedIntegration))
			}

			return success({
				triggered: true,
				integration: name || 'direct',
				status: response.status,
				response: waitForResponse ? responseData : 'Triggered successfully',
			})
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				return failure('Request timed out')
			}
			return failure(`Error: ${error instanceof Error ? error.message : 'Unknown'}`)
		}
	},
})

// ==========================================
// Zapier Delete Tool - Remove saved integration
// ==========================================

export const zapierDeleteTool = createTool({
	id: 'zapier_delete',
	description: `Delete a saved Zapier integration by name.

This only removes the saved reference - the actual Zap in Zapier is not affected.`,
	inputSchema: z.object({
		name: z.string().describe('Name of the integration to delete'),
	}),
	execute: async (params, context) => {
		const kv = context.env.KV
		if (!kv) {
			return failure('KV namespace not available')
		}

		try {
			const key = integrationKey(context.workspaceId, params.name)
			const existing = await kv.get(key)

			if (!existing) {
				return failure(`Integration "${params.name}" not found`)
			}

			await kv.delete(key)

			return success({
				deleted: true,
				name: params.name,
				message: `Deleted integration "${params.name}"`,
			})
		} catch (error) {
			return failure(
				`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

// ==========================================
// Zapier Test Tool - Test an integration
// ==========================================

export const zapierTestTool = createTool({
	id: 'zapier_test',
	description: `Test a saved Zapier integration with sample data.

Sends a test payload to verify the webhook is working correctly.
The Zap will receive the test data - check Zapier's task history to confirm.`,
	inputSchema: z.object({
		name: z.string().describe('Name of the integration to test'),
		testData: z
			.record(z.string(), z.unknown())
			.optional()
			.default({ test: true, message: 'Test from Hare' })
			.describe('Test data to send'),
	}),
	execute: async (params, context) => {
		const kv = context.env.KV
		if (!kv) {
			return failure('KV namespace not available')
		}

		try {
			const key = integrationKey(context.workspaceId, params.name)
			const integration = await kv.get<SavedZapierIntegration>(key, 'json')

			if (!integration) {
				return failure(`Integration "${params.name}" not found`)
			}

			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), ZAPIER_DEFAULT_TIMEOUT_MS)

			const testPayload = {
				...params.testData,
				_hare: {
					workspaceId: context.workspaceId,
					integration: params.name,
					isTest: true,
					timestamp: new Date().toISOString(),
				},
			}

			const response = await fetch(integration.webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': CONTENT_TYPE_JSON, 'User-Agent': HTTP_USER_AGENT },
				body: JSON.stringify(testPayload),
				signal: controller.signal,
			})

			clearTimeout(timeoutId)

			if (!response.ok) {
				return failure(`Test failed: ${response.status} ${response.statusText}`)
			}

			return success({
				tested: true,
				name: params.name,
				status: response.status,
				message: `Test successful! Check Zapier task history to confirm the Zap received it.`,
			})
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				return failure('Test timed out - webhook may be slow or unreachable')
			}
			return failure(`Test error: ${error instanceof Error ? error.message : 'Unknown'}`)
		}
	},
})

// ==========================================
// Legacy Zapier Tool (backwards compatible)
// ==========================================

/**
 * Original simple Zapier tool - kept for backwards compatibility.
 * For new usage, prefer zapier_trigger with saved integrations.
 */
export const zapierTool = createTool({
	id: 'zapier',
	description: `[Legacy] Direct Zapier webhook trigger - for quick one-off triggers.

For recurring integrations, use zapier_save + zapier_trigger instead.

Connect to 6,000+ apps through Zapier webhooks.`,
	inputSchema: z.object({
		webhookUrl: z.string().url().describe('Zapier webhook URL (https://hooks.zapier.com/...)'),
		data: z.record(z.string(), z.unknown()).describe('Data to send (available in your Zap)'),
		waitForResponse: z
			.boolean()
			.optional()
			.default(false)
			.describe('Wait for Zap response (requires Webhooks by Zapier premium)'),
	}),
	execute: async (params, context) => {
		try {
			const { webhookUrl, data, waitForResponse } = params

			// Validate webhook URL hostname to prevent bypass attacks
			let parsedUrl: URL
			try {
				parsedUrl = new URL(webhookUrl)
			} catch {
				return failure(
					`Invalid URL format. Zapier webhooks must be from ${ZAPIER_WEBHOOK_HOSTNAME}`,
				)
			}

			if (parsedUrl.hostname !== ZAPIER_WEBHOOK_HOSTNAME) {
				return failure(`Invalid URL. Zapier webhooks must be from ${ZAPIER_WEBHOOK_HOSTNAME}`)
			}

			const controller = new AbortController()
			const timeoutId = setTimeout(
				() => controller.abort(),
				waitForResponse ? ZAPIER_WAIT_TIMEOUT_MS : ZAPIER_DEFAULT_TIMEOUT_MS,
			)

			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': CONTENT_TYPE_JSON, 'User-Agent': HTTP_USER_AGENT },
				body: JSON.stringify({
					...data,
					_hare: { workspaceId: context.workspaceId, timestamp: new Date().toISOString() },
				}),
				signal: controller.signal,
			})

			clearTimeout(timeoutId)

			if (!response.ok) {
				return failure(`Zapier error: ${response.status} ${response.statusText}`)
			}

			const responseData = await response.json().catch(() => response.text())

			return success({
				triggered: true,
				status: response.status,
				response: waitForResponse ? responseData : 'Triggered successfully',
			})
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				return failure('Request timed out')
			}
			return failure(`Error: ${error instanceof Error ? error.message : 'Unknown'}`)
		}
	},
})

// ==========================================
// Generic Webhook Tool
// ==========================================

export const webhookTool = createTool({
	id: 'webhook',
	description: 'Send data to any webhook endpoint with authentication support.',
	inputSchema: z.object({
		url: z.string().url().describe('Webhook URL'),
		method: z.enum(['POST', 'PUT', 'PATCH']).optional().default('POST'),
		data: z.unknown().describe('Request body'),
		headers: z.record(z.string(), z.string()).optional().describe('Custom headers'),
		auth: z
			.object({
				type: z.enum(['bearer', 'basic', 'apikey']),
				token: z.string().optional(),
				username: z.string().optional(),
				password: z.string().optional(),
				headerName: z.string().optional().default('X-API-Key'),
			})
			.optional(),
		timeout: z.number().optional().default(30000),
	}),
	execute: async (params, _context) => {
		try {
			const { url, method, data, headers: customHeaders, auth, timeout } = params

			const headers: Record<string, string> = {
				'Content-Type': 'application/json',
				'User-Agent': 'Hare-Agent/1.0',
				...customHeaders,
			}

			if (auth) {
				if (auth.type === 'bearer' && auth.token) {
					headers.Authorization = `Bearer ${auth.token}`
				} else if (auth.type === 'basic' && auth.username && auth.password) {
					headers.Authorization = `Basic ${btoa(`${auth.username}:${auth.password}`)}`
				} else if (auth.type === 'apikey' && auth.token) {
					headers[auth.headerName || 'X-API-Key'] = auth.token
				}
			}

			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), timeout)

			const response = await fetch(url, {
				method,
				headers,
				body: JSON.stringify(data),
				signal: controller.signal,
			})

			clearTimeout(timeoutId)

			const responseData = await response.json().catch(() => response.text())

			return success({
				status: response.status,
				ok: response.ok,
				data: responseData,
			})
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				return failure('Request timed out')
			}
			return failure(`Error: ${error instanceof Error ? error.message : 'Unknown'}`)
		}
	},
})

// ==========================================
// Get all integration tools
// ==========================================

/**
 * Get all integration tools.
 *
 * Zapier tools (for external services via saved integrations) + generic webhook (for custom integrations)
 */
export function getIntegrationTools(_context: ToolContext) {
	return [
		// Zapier integration management
		zapierSaveTool,
		zapierListTool,
		zapierTriggerTool,
		zapierDeleteTool,
		zapierTestTool,
		// Legacy direct trigger (backwards compatible)
		zapierTool,
		// Generic webhook
		webhookTool,
	]
}
