/**
 * @hare/api-client
 *
 * Type-safe API clients for the Hare API.
 *
 * Use `orpc` for all type-safe operations - types are automatically inferred from the server.
 * Legacy Hono clients remain only for auth (Better Auth pass-through), webhooks, health, embed, dev, mcp, agentWs.
 *
 * @example
 * ```ts
 * // Recommended: Use oRPC client (full type safety)
 * import { orpc } from '@hare/api-client'
 *
 * // CRUD operations
 * const { agents } = await orpc.agents.list({})
 * const agent = await orpc.agents.create({ name: '...', model: '...', instructions: '...' })
 *
 * // Billing
 * const plans = await orpc.billing.listPlans({ workspaceId: '...' })
 *
 * // Memory
 * const memories = await orpc.memory.list({ id: agentId, workspaceId: '...' })
 *
 * // Chat
 * const conversations = await orpc.chat.listConversations({ id: agentId })
 * ```
 */

import { hc } from 'hono/client'
import type {
	WebhooksRoute,
	AuthRoute,
	HealthRoute,
	EmbedRoute,
	DevRoute,
	McpRoute,
	AgentWsRoute,
} from '@hare/api'

// =============================================================================
// BASE URL DETECTION
// =============================================================================

/**
 * Get base URL for API requests.
 * Supports Vite environment variable (for Tauri) or falls back to window.location.origin.
 */
function getBaseURL(): string {
	if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
		return import.meta.env.VITE_API_URL as string
	}
	if (typeof window !== 'undefined') {
		return window.location.origin
	}
	return ''
}

/** Default client options */
const clientInit = { credentials: 'include' as const }

// =============================================================================
// LEGACY HONO CLIENT TYPES
// =============================================================================

type WebhooksClient = ReturnType<typeof hc<WebhooksRoute>>
type AuthClient = ReturnType<typeof hc<AuthRoute>>
type HealthClient = ReturnType<typeof hc<HealthRoute>>
type EmbedClient = ReturnType<typeof hc<EmbedRoute>>
type DevClient = ReturnType<typeof hc<DevRoute>>
type McpClient = ReturnType<typeof hc<McpRoute>>
type AgentWsClient = ReturnType<typeof hc<AgentWsRoute>>

// =============================================================================
// LEGACY HONO CLIENT FACTORIES
// =============================================================================

const hcWebhooks = (...args: Parameters<typeof hc>): WebhooksClient => hc<WebhooksRoute>(...args)
const hcAuth = (...args: Parameters<typeof hc>): AuthClient => hc<AuthRoute>(...args)
const hcHealth = (...args: Parameters<typeof hc>): HealthClient => hc<HealthRoute>(...args)
const hcEmbed = (...args: Parameters<typeof hc>): EmbedClient => hc<EmbedRoute>(...args)
const hcDev = (...args: Parameters<typeof hc>): DevClient => hc<DevRoute>(...args)
const hcMcp = (...args: Parameters<typeof hc>): McpClient => hc<McpRoute>(...args)
const hcAgentWs = (...args: Parameters<typeof hc>): AgentWsClient => hc<AgentWsRoute>(...args)

// =============================================================================
// LEGACY HONO CLIENTS
// These are kept for routes not yet migrated to oRPC or that have special requirements
// =============================================================================

/**
 * Webhooks API client - /api/agents/*
 * Webhook management for agents.
 */
export const webhooks = hcWebhooks(`${getBaseURL()}/api/agents`, { init: clientInit })

/**
 * Auth API client - /api/auth/*
 * Note: Auth uses Better Auth pass-through and cannot be fully migrated to oRPC.
 */
export const auth = hcAuth(`${getBaseURL()}/api/auth`, { init: clientInit })

/**
 * Health API client - /api/health/*
 */
export const health = hcHealth(`${getBaseURL()}/api/health`, { init: clientInit })

/**
 * Embed API client - /api/embed/*
 */
export const embed = hcEmbed(`${getBaseURL()}/api/embed`, { init: clientInit })

/**
 * Dev API client - /api/dev/*
 */
export const dev = hcDev(`${getBaseURL()}/api/dev`, { init: clientInit })

/**
 * MCP API client - /api/mcp/*
 */
export const mcp = hcMcp(`${getBaseURL()}/api/mcp`, { init: clientInit })

/**
 * Agent WebSocket client - /api/agent-ws/*
 */
export const agentWs = hcAgentWs(`${getBaseURL()}/api/agent-ws`, { init: clientInit })

// =============================================================================
// oRPC CLIENT (Recommended)
// =============================================================================

/**
 * oRPC client with full end-to-end type safety.
 * Recommended for all operations - types are automatically inferred from the server.
 *
 * Covers:
 * - agents (list, get, create, update, delete, deploy, undeploy)
 * - tools (list, get, create, update, delete)
 * - workspaces (list, get, create, update, delete, members)
 * - apiKeys (list, create, update, delete)
 * - schedules (list, get, create, update, delete)
 * - usage (get, getByAgent)
 * - analytics
 * - logs
 * - userSettings
 * - billing (listPlans, createCheckout, createPortal, getStatus, getPaymentHistory)
 * - memory (list, create, search, update, delete, clear)
 * - chat (listConversations, getMessages, exportConversation)
 *
 * @example
 * ```ts
 * import { orpc } from '@hare/api-client'
 *
 * // Types fully inferred!
 * const { agents } = await orpc.agents.list({})
 * const agent = await orpc.agents.create({ name: '...', model: '...', instructions: '...' })
 * ```
 */
export { orpc } from './orpc'
export type { AppRouterClient, AppRouterClient as AppRouter } from './orpc'

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
	WebhooksClient,
	AuthClient,
	HealthClient,
	EmbedClient,
	DevClient,
	McpClient,
	AgentWsClient,
}
