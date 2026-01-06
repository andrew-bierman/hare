/**
 * @hare/api-client
 *
 * Legacy Hono RPC clients for routes not migrated to oRPC.
 *
 * For type-safe API operations, use `@hare/api/orpc`:
 * ```ts
 * import { orpc } from '@hare/api/orpc'
 * const { agents } = await orpc.agents.list({})
 * ```
 *
 * This package only exports legacy clients for:
 * - auth (Better Auth pass-through)
 * - webhooks
 * - health
 * - embed
 * - dev
 * - mcp
 * - agentWs
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
// TYPE EXPORTS
// =============================================================================

// Note: For oRPC client, import from '@hare/api/orpc' directly:
// import { orpc } from '@hare/api/orpc'

export type {
	WebhooksClient,
	AuthClient,
	HealthClient,
	EmbedClient,
	DevClient,
	McpClient,
	AgentWsClient,
}
