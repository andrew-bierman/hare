/**
 * @hare/api-client
 *
 * Type-safe Hono RPC clients for the Hare API.
 * Split into domain-specific clients for better type inference performance.
 *
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
// PRE-COMPILED CLIENT TYPES
// Each domain has its own type to avoid TypeScript inference overload
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
export const agents: AgentsClient = hc<AgentsRoute>(`${getBaseURL()}/api/agents`, { init: clientInit })

/**
 * Tools API client - /api/tools/*
 *
 * @example
 * ```ts
 * const res = await tools.$get({ query: { workspaceId } })
 * const { tools } = await res.json()
 * ```
 */
export const tools: ToolsClient = hc<ToolsRoute>(`${getBaseURL()}/api/tools`, { init: clientInit })

/**
 * Workspaces API client - /api/workspaces/*
 *
 * @example
 * ```ts
 * const res = await workspaces.$get()
 * const { workspaces } = await res.json()
 * ```
 */
export const workspaces: WorkspacesClient = hc<WorkspacesRoute>(`${getBaseURL()}/api/workspaces`, { init: clientInit })

/**
 * Auth API client - /api/auth/*
 */
export const auth: AuthClient = hc<AuthRoute>(`${getBaseURL()}/api/auth`, { init: clientInit })

/**
 * Billing API client - /api/billing/*
 */
export const billing: BillingClient = hc<BillingRoute>(`${getBaseURL()}/api/billing`, { init: clientInit })

/**
 * Analytics API client - /api/analytics/*
 */
export const analytics: AnalyticsClient = hc<AnalyticsRoute>(`${getBaseURL()}/api/analytics`, { init: clientInit })

/**
 * Usage API client - /api/usage/*
 */
export const usage: UsageClient = hc<UsageRoute>(`${getBaseURL()}/api/usage`, { init: clientInit })

/**
 * Chat API client - /api/chat/*
 */
export const chat: ChatClient = hc<ChatRoute>(`${getBaseURL()}/api/chat`, { init: clientInit })

/**
 * API Keys client - /api/api-keys/*
 */
export const apiKeys: ApiKeysClient = hc<ApiKeysRoute>(`${getBaseURL()}/api/api-keys`, { init: clientInit })

/**
 * User settings API client - /api/user/*
 */
export const user: UserClient = hc<UserRoute>(`${getBaseURL()}/api/user`, { init: clientInit })

/**
 * Health API client - /api/health/*
 */
export const health: HealthClient = hc<HealthRoute>(`${getBaseURL()}/api/health`, { init: clientInit })

/**
 * Logs API client - /api/logs/*
 */
export const logs: LogsClient = hc<LogsRoute>(`${getBaseURL()}/api/logs`, { init: clientInit })

/**
 * Embed API client - /api/embed/*
 */
export const embed: EmbedClient = hc<EmbedRoute>(`${getBaseURL()}/api/embed`, { init: clientInit })

/**
 * Dev API client - /api/dev/*
 */
export const dev: DevClient = hc<DevRoute>(`${getBaseURL()}/api/dev`, { init: clientInit })

/**
 * MCP API client - /api/mcp/*
 */
export const mcp: McpClient = hc<McpRoute>(`${getBaseURL()}/api/mcp`, { init: clientInit })

/**
 * Agent WebSocket client - /api/agent-ws/*
 */
export const agentWs: AgentWsClient = hc<AgentWsRoute>(`${getBaseURL()}/api/agent-ws`, { init: clientInit })

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
