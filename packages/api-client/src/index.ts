/**
 * @hare/api-client
 *
 * Type-safe Hono RPC clients for the Hare API.
 * Split into domain-specific clients for better type inference performance.
 *
 * Uses the hcWithType pattern from Hono docs to pre-compile types at build time.
 * @see https://hono.dev/docs/guides/rpc#compile-your-code-before-using-it-recommended
 * @see https://hono.dev/docs/guides/rpc#split-your-app-and-client-into-multiple-files
 */

import { hc } from 'hono/client'
import type {
	AgentsRoute,
	ToolsRoute,
	WorkspacesRoute,
	AuthRoute,
	BillingRoute,
	AnalyticsRoute,
	UsageRoute,
	ChatRoute,
	ApiKeysRoute,
	UserRoute,
	HealthRoute,
	LogsRoute,
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
// =============================================================================

type AgentsClient = ReturnType<typeof hc<AgentsRoute>>
type ToolsClient = ReturnType<typeof hc<ToolsRoute>>
type WorkspacesClient = ReturnType<typeof hc<WorkspacesRoute>>
type AuthClient = ReturnType<typeof hc<AuthRoute>>
type BillingClient = ReturnType<typeof hc<BillingRoute>>
type AnalyticsClient = ReturnType<typeof hc<AnalyticsRoute>>
type UsageClient = ReturnType<typeof hc<UsageRoute>>
type ChatClient = ReturnType<typeof hc<ChatRoute>>
type ApiKeysClient = ReturnType<typeof hc<ApiKeysRoute>>
type UserClient = ReturnType<typeof hc<UserRoute>>
type HealthClient = ReturnType<typeof hc<HealthRoute>>
type LogsClient = ReturnType<typeof hc<LogsRoute>>
type EmbedClient = ReturnType<typeof hc<EmbedRoute>>
type DevClient = ReturnType<typeof hc<DevRoute>>
type McpClient = ReturnType<typeof hc<McpRoute>>
type AgentWsClient = ReturnType<typeof hc<AgentWsRoute>>

// =============================================================================
// hcWithType FACTORIES (pre-compiled type inference)
// These functions cast the return type to avoid runtime type instantiation
// =============================================================================

const hcAgents = (...args: Parameters<typeof hc>): AgentsClient => hc<AgentsRoute>(...args)
const hcTools = (...args: Parameters<typeof hc>): ToolsClient => hc<ToolsRoute>(...args)
const hcWorkspaces = (...args: Parameters<typeof hc>): WorkspacesClient => hc<WorkspacesRoute>(...args)
const hcAuth = (...args: Parameters<typeof hc>): AuthClient => hc<AuthRoute>(...args)
const hcBilling = (...args: Parameters<typeof hc>): BillingClient => hc<BillingRoute>(...args)
const hcAnalytics = (...args: Parameters<typeof hc>): AnalyticsClient => hc<AnalyticsRoute>(...args)
const hcUsage = (...args: Parameters<typeof hc>): UsageClient => hc<UsageRoute>(...args)
const hcChat = (...args: Parameters<typeof hc>): ChatClient => hc<ChatRoute>(...args)
const hcApiKeys = (...args: Parameters<typeof hc>): ApiKeysClient => hc<ApiKeysRoute>(...args)
const hcUser = (...args: Parameters<typeof hc>): UserClient => hc<UserRoute>(...args)
const hcHealth = (...args: Parameters<typeof hc>): HealthClient => hc<HealthRoute>(...args)
const hcLogs = (...args: Parameters<typeof hc>): LogsClient => hc<LogsRoute>(...args)
const hcEmbed = (...args: Parameters<typeof hc>): EmbedClient => hc<EmbedRoute>(...args)
const hcDev = (...args: Parameters<typeof hc>): DevClient => hc<DevRoute>(...args)
const hcMcp = (...args: Parameters<typeof hc>): McpClient => hc<McpRoute>(...args)
const hcAgentWs = (...args: Parameters<typeof hc>): AgentWsClient => hc<AgentWsRoute>(...args)

// =============================================================================
// DOMAIN-SPECIFIC CLIENTS
// =============================================================================

/**
 * Agents API client - /api/agents/*
 * Includes agent CRUD, schedules, memory, and webhooks.
 *
 * @example
 * ```ts
 * const res = await agents.$get({ query: { workspaceId } })
 * const { agents } = await res.json()
 * ```
 */
export const agents = hcAgents(`${getBaseURL()}/api/agents`, { init: clientInit })

/**
 * Tools API client - /api/tools/*
 *
 * @example
 * ```ts
 * const res = await tools.$get({ query: { workspaceId } })
 * const { tools } = await res.json()
 * ```
 */
export const tools = hcTools(`${getBaseURL()}/api/tools`, { init: clientInit })

/**
 * Workspaces API client - /api/workspaces/*
 *
 * @example
 * ```ts
 * const res = await workspaces.$get()
 * const { workspaces } = await res.json()
 * ```
 */
export const workspaces = hcWorkspaces(`${getBaseURL()}/api/workspaces`, { init: clientInit })

/**
 * Auth API client - /api/auth/*
 */
export const auth = hcAuth(`${getBaseURL()}/api/auth`, { init: clientInit })

/**
 * Billing API client - /api/billing/*
 */
export const billing = hcBilling(`${getBaseURL()}/api/billing`, { init: clientInit })

/**
 * Analytics API client - /api/analytics/*
 */
export const analytics = hcAnalytics(`${getBaseURL()}/api/analytics`, { init: clientInit })

/**
 * Usage API client - /api/usage/*
 */
export const usage = hcUsage(`${getBaseURL()}/api/usage`, { init: clientInit })

/**
 * Chat API client - /api/chat/*
 */
export const chat = hcChat(`${getBaseURL()}/api/chat`, { init: clientInit })

/**
 * API Keys client - /api/api-keys/*
 */
export const apiKeys = hcApiKeys(`${getBaseURL()}/api/api-keys`, { init: clientInit })

/**
 * User settings API client - /api/user/*
 */
export const user = hcUser(`${getBaseURL()}/api/user`, { init: clientInit })

/**
 * Health API client - /api/health/*
 */
export const health = hcHealth(`${getBaseURL()}/api/health`, { init: clientInit })

/**
 * Logs API client - /api/logs/*
 */
export const logs = hcLogs(`${getBaseURL()}/api/logs`, { init: clientInit })

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

export type {
	AgentsClient,
	ToolsClient,
	WorkspacesClient,
	AuthClient,
	BillingClient,
	AnalyticsClient,
	UsageClient,
	ChatClient,
	ApiKeysClient,
	UserClient,
	HealthClient,
	LogsClient,
	EmbedClient,
	DevClient,
	McpClient,
	AgentWsClient,
}
