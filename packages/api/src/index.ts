/**
 * @hare/api - Hono API for Hare AI agents platform
 *
 * This package provides the complete API for the Hare platform,
 * built on Hono with OpenAPI support.
 *
 * @example
 * ```ts
 * import { app } from '@hare/api'
 *
 * // Use in Cloudflare Workers
 * export default {
 *   fetch: app.fetch
 * }
 * ```
 */

import { OpenAPIHono } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import { getRouterName, showRoutes } from 'hono/dev'
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { timing } from 'hono/timing'
import { serverEnv } from '@hare/config'
import { CloudflareEnvError } from './db'
import { corsMiddleware, loggingMiddleware, securityHeadersMiddleware } from './middleware'
import agentWs from './routes/agent-ws'
// Import route modules
import agents from './routes/agents'
import analytics from './routes/analytics'
import apiKeysRoutes from './routes/api-keys'
import auth from './routes/auth'
import billing from './routes/billing'
import chat from './routes/chat'
import dev from './routes/dev'
import embed from './routes/embed'
import health from './routes/health'
import logs from './routes/logs'
import mcp from './routes/mcp'
import memory from './routes/memory'
import schedules from './routes/schedules'
import tools from './routes/tools'
import usage from './routes/usage'
import userSettings from './routes/user-settings'
import webhooksRoutes from './routes/webhooks'
import workspaceMembers from './routes/workspace-members'
import workspaces from './routes/workspaces'
import type { HonoEnv } from '@hare/types'

// =============================================================================
// ROUTE TYPE EXPORTS (for split RPC clients)
// Using typeof from the individual route modules
// =============================================================================

/** Agents routes: /api/agents/* */
export type AgentsRoute = typeof agents

/** Schedules routes: mounted under /api/agents/* */
export type SchedulesRoute = typeof schedules

/** Memory routes: mounted under /api/agents/* */
export type MemoryRoute = typeof memory

/** Webhooks routes: mounted under /api/agents/* */
export type WebhooksRoute = typeof webhooksRoutes

/** Tools routes: /api/tools/* */
export type ToolsRoute = typeof tools

/** Workspaces routes: /api/workspaces/* */
export type WorkspacesRoute = typeof workspaces

/** Workspace members routes: mounted under /api/workspaces/* */
export type WorkspaceMembersRoute = typeof workspaceMembers

/** Auth routes: /api/auth/* */
export type AuthRoute = typeof auth

/** Billing routes: /api/billing/* */
export type BillingRoute = typeof billing

/** Analytics routes: /api/analytics/* */
export type AnalyticsRoute = typeof analytics

/** Usage routes: /api/usage/* */
export type UsageRoute = typeof usage

/** Chat routes: /api/chat/* */
export type ChatRoute = typeof chat

/** API Keys routes: /api/api-keys/* */
export type ApiKeysRoute = typeof apiKeysRoutes

/** User settings routes: /api/user/* */
export type UserRoute = typeof userSettings

/** Health routes: /api/health/* */
export type HealthRoute = typeof health

/** Logs routes: /api/logs/* */
export type LogsRoute = typeof logs

/** Embed routes: /api/embed/* */
export type EmbedRoute = typeof embed

/** Dev routes: /api/dev/* */
export type DevRoute = typeof dev

/** MCP routes: /api/mcp/* */
export type McpRoute = typeof mcp

/** Agent WebSocket routes: /api/agent-ws/* */
export type AgentWsRoute = typeof agentWs

// =============================================================================
// APP CREATION
// =============================================================================

// Create base app with proper Cloudflare bindings type
const app = new OpenAPIHono<HonoEnv>().basePath('/api')

// Global error handler
app.onError((error, c) => {
	if (error instanceof CloudflareEnvError) {
		console.error('CloudflareEnvError:', error.message)
		return c.json({ error: 'Service unavailable' }, 503)
	}

	console.error('Unhandled error:', error)
	return c.json({ error: 'Internal server error' }, 500)
})

// Middleware
app.use('*', requestId()) // Adds X-Request-Id header for tracing
app.use('*', logger()) // Request logging (uses requestId)
app.use('*', timing()) // Adds Server-Timing headers for performance monitoring
app.use('*', secureHeaders()) // Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
app.use('*', corsMiddleware)
app.use('*', securityHeadersMiddleware)
app.use('*', loggingMiddleware) // Request logging to KV for observability

// Mount routes - chain for type inference
const routes = app
	.route('/agents', agents)
	.route('/agents', schedules)
	.route('/agents', memory)
	.route('/agents', webhooksRoutes)
	.route('/agent-ws', agentWs)
	.route('/analytics', analytics)
	.route('/api-keys', apiKeysRoutes)
	.route('/billing', billing)
	.route('/workspaces', workspaces)
	.route('/workspaces', workspaceMembers)
	.route('/tools', tools)
	.route('/auth', auth)
	.route('/chat', chat)
	.route('/usage', usage)
	.route('/user', userSettings)
	.route('/dev', dev)
	.route('/mcp', mcp)
	.route('/health', health)
	.route('/logs', logs)
	.route('/embed', embed)

// OpenAPI documentation - must be registered before showRoutes
app.doc('/openapi.json', {
	openapi: '3.1.0',
	info: {
		title: 'Hare API',
		version: '1.0.0',
		description: 'Build and deploy AI agents to the edge',
	},
	servers: [
		{
			url: '/api',
			description: 'API server',
		},
	],
	tags: [
		{ name: 'Authentication', description: 'User authentication and session management' },
		{ name: 'Workspaces', description: 'Workspace management' },
		{ name: 'Agents', description: 'AI agent creation and deployment' },
		{
			name: 'Agent WebSocket',
			description: 'Real-time WebSocket connections to Cloudflare Agents',
		},
		{ name: 'API Keys', description: 'API key management for programmatic access' },
		{ name: 'Billing', description: 'Subscription and payment management' },
		{ name: 'Schedules', description: 'Scheduled task management for agents' },
		{ name: 'Webhooks', description: 'Webhook management for agent event notifications' },
		{ name: 'Tools', description: 'Tool management for agents' },
		{ name: 'Chat', description: 'Chat with deployed agents (SSE)' },
		{ name: 'MCP', description: 'Model Context Protocol for external AI clients' },
		{ name: 'Usage', description: 'Usage statistics and analytics' },
		{ name: 'Analytics', description: 'Detailed analytics and visualizations' },
		{ name: 'Health', description: 'System health checks and monitoring endpoints' },
		{ name: 'Logs', description: 'Request logging and observability' },
		{ name: 'Embed', description: 'Embeddable chat widget endpoints' },
		{ name: 'User Settings', description: 'User preferences and notification settings' },
	],
})

// Scalar API reference UI
app.get(
	'/docs',
	apiReference({
		url: '/api/openapi.json',
		theme: 'kepler',
		layout: 'modern',
		defaultHttpClient: {
			targetKey: 'js',
			clientKey: 'fetch',
		},
	}),
)

// Development: Show registered routes on startup (after all routes are defined)
if (serverEnv.NODE_ENV === 'development') {
	console.log(`\n🚀 Hare API using ${getRouterName(app)} router`)
	showRoutes(app, { verbose: true, colorize: true })
	console.log('')
}

// =============================================================================
// EXPORTS
// =============================================================================

// Main app export
export { app }

// Type for RPC client
export type AppType = typeof routes

// Re-export types from @hare/types (canonical source)
export type {
	Agent,
	AgentConfig,
	AgentStatus,
	AgentUsage,
	ApiError,
	ApiKeyEnv,
	ApiKeyInfo,
	ApiKeyVariables,
	ApiSuccess,
	AuthEnv,
	AuthSession,
	AuthUser,
	AuthVariables,
	ChatMessage,
	ChatRequest,
	ChatStreamEvent,
	CreateAgentInput,
	CreateScheduleInput,
	CreateToolInput,
	CreateWorkspaceInput,
	ExecutionResult,
	ExecutionStatus,
	HonoEnv,
	InvitationStatus,
	MemberRole,
	MessageRole,
	OptionalAuthEnv,
	Schedule,
	ScheduleExecution,
	ScheduleStatus,
	ScheduleType,
	SendInvitationInput,
	Tool,
	ToolType,
	UpdateAgentInput,
	UpdateMemberRoleInput,
	UpdateScheduleInput,
	UsageSummary,
	Workspace,
	WorkspaceEnv,
	WorkspaceInfo,
	WorkspaceMember,
	WorkspaceInvitation,
	WorkspaceRole,
	WorkspaceVariables,
} from '@hare/types'

// Re-export type guards from @hare/types
export { isMessageRole, isWorkspaceRole } from '@hare/types'

// Re-export schemas
export * from './schemas'

// Re-export middleware
export {
	apiKeyMiddleware,
	authMiddleware,
	corsMiddleware,
	generateApiKey,
	hasAgentAccess,
	hasPermission,
	hasScope,
	loggingMiddleware,
	optionalAuthMiddleware,
	requirePermission,
	securityHeadersMiddleware,
	workspaceMiddleware,
} from './middleware'

// Re-export helpers
export { acceptsJson, acceptsSSE } from './helpers'

// Re-export db utilities
export { CloudflareEnvError, getCloudflareEnv, getD1, getDb } from './db'

// Re-export email service and templates from @hare/email
export {
	createEmailService,
	EmailService,
	PasswordResetEmail,
	WorkspaceInvitationEmail,
	type EmailEnv,
	type EmailResult,
} from '@hare/email'
