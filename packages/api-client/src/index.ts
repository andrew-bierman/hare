/**
 * @hare/api-client
 *
 * Type-safe API clients for the Hare API.
 *
 * MIGRATION NOTE: Most CRUD operations have been migrated to oRPC.
 * Use `orpc` for agents, tools, workspaces, api-keys, schedules, usage, analytics, logs.
 * Legacy Hono clients remain for auth, billing, chat, memory, webhooks, health, embed, dev, mcp.
 *
 * @example
 * ```ts
 * // Recommended: Use oRPC client (full type safety)
 * import { orpc } from '@hare/api-client'
 * const { agents } = await orpc.agents.list({})
 *
 * // Legacy: Use Hono client for non-migrated routes
 * import { chat, billing } from '@hare/api-client'
 * ```
 */

import { hc } from 'hono/client'
import type {
	MemoryRoute,
	WebhooksRoute,
	AuthRoute,
	BillingRoute,
	ChatRoute,
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
// PRE-COMPILED CLIENT TYPES (computed at build time)
// Note: Most clients migrated to oRPC - see orpc.ts
// =============================================================================

type MemoryClient = ReturnType<typeof hc<MemoryRoute>>
type WebhooksClient = ReturnType<typeof hc<WebhooksRoute>>
type AuthClient = ReturnType<typeof hc<AuthRoute>>
type BillingClient = ReturnType<typeof hc<BillingRoute>>
type ChatClient = ReturnType<typeof hc<ChatRoute>>
type HealthClient = ReturnType<typeof hc<HealthRoute>>
type EmbedClient = ReturnType<typeof hc<EmbedRoute>>
type DevClient = ReturnType<typeof hc<DevRoute>>
type McpClient = ReturnType<typeof hc<McpRoute>>
type AgentWsClient = ReturnType<typeof hc<AgentWsRoute>>

// =============================================================================
// hcWithType FACTORIES (pre-compiled type inference)
// =============================================================================

const hcMemory = (...args: Parameters<typeof hc>): MemoryClient => hc<MemoryRoute>(...args)
const hcWebhooks = (...args: Parameters<typeof hc>): WebhooksClient => hc<WebhooksRoute>(...args)
const hcAuth = (...args: Parameters<typeof hc>): AuthClient => hc<AuthRoute>(...args)
const hcBilling = (...args: Parameters<typeof hc>): BillingClient => hc<BillingRoute>(...args)
const hcChat = (...args: Parameters<typeof hc>): ChatClient => hc<ChatRoute>(...args)
const hcHealth = (...args: Parameters<typeof hc>): HealthClient => hc<HealthRoute>(...args)
const hcEmbed = (...args: Parameters<typeof hc>): EmbedClient => hc<EmbedRoute>(...args)
const hcDev = (...args: Parameters<typeof hc>): DevClient => hc<DevRoute>(...args)
const hcMcp = (...args: Parameters<typeof hc>): McpClient => hc<McpRoute>(...args)
const hcAgentWs = (...args: Parameters<typeof hc>): AgentWsClient => hc<AgentWsRoute>(...args)

// =============================================================================
// LEGACY HONO CLIENTS (not yet migrated to oRPC)
// =============================================================================

/**
 * Memory API client - /api/agents/*
 * Vector memory operations for agents.
 */
export const memory = hcMemory(`${getBaseURL()}/api/agents`, { init: clientInit })

/**
 * Webhooks API client - /api/agents/*
 * Webhook management for agents.
 */
export const webhooks = hcWebhooks(`${getBaseURL()}/api/agents`, { init: clientInit })

/**
 * Auth API client - /api/auth/*
 */
export const auth = hcAuth(`${getBaseURL()}/api/auth`, { init: clientInit })

/**
 * Billing API client - /api/billing/*
 */
export const billing = hcBilling(`${getBaseURL()}/api/billing`, { init: clientInit })

/**
 * Chat API client - /api/chat/*
 */
export const chat = hcChat(`${getBaseURL()}/api/chat`, { init: clientInit })

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
 * Recommended for all CRUD operations - types are automatically inferred from the server.
 *
 * Covers: agents, tools, workspaces, api-keys, schedules, usage, analytics, logs, user-settings
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
export type { AppRouter } from './orpc'

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
	MemoryClient,
	WebhooksClient,
	AuthClient,
	BillingClient,
	ChatClient,
	HealthClient,
	EmbedClient,
	DevClient,
	McpClient,
	AgentWsClient,
}
