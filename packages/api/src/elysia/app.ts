/**
 * Elysia API Application
 *
 * Main entry point for the Hare API, built on Elysia with:
 * - Cloudflare Workers adapter
 * - Eden Treaty for type-safe client
 * - Better Auth via .mount()
 * - Zod schemas via Standard Schema support
 * - CORS via @elysiajs/cors
 * - SSE streaming via built-in generators
 */

import { serverEnv } from '@hare/config'
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { CloudflareEnvError } from './context'

// Special route imports (non-RPC)
import { agentWsRoutes, chatAppRoutes } from './routes/agent-ws'
import { authRoutes } from './routes/auth'
import { billingWebhookRoutes } from './routes/billing-webhook'
import { devRoutes } from './routes/dev'
import { embedPublicRoutes } from './routes/embed-public'
import { mcpRoutes } from './routes/mcp'

// RPC route imports (type-safe, used by Eden Treaty)
import { activityRoutes } from './routes/activity'
import { agentRoutes } from './routes/agents'
import { analyticsRoutes } from './routes/analytics'
import { apiKeyRoutes } from './routes/api-keys'
import { auditLogRoutes } from './routes/audit-logs'
import { billingRoutes } from './routes/billing'
import { chatRoutes } from './routes/chat'
import { healthRoutes } from './routes/health'
import { logRoutes } from './routes/logs'
import { memoryRoutes } from './routes/memory'
import { scheduleRoutes } from './routes/schedules'
import { toolRoutes } from './routes/tools'
import { usageRoutes } from './routes/usage'
import { userSettingsRoutes } from './routes/user-settings'
import { webhookRoutes } from './routes/webhooks'
import { workspaceMemberRoutes } from './routes/workspace-members'
import { workspaceRoutes } from './routes/workspaces'

// =============================================================================
// CORS Configuration
// =============================================================================

const corsConfig = cors({
	origin: (request) => {
		const origin = request.headers.get('origin')
		const allowedOrigins = [serverEnv.APP_URL, 'http://localhost:3000', 'http://localhost:8787']
		if (!origin) return true
		return allowedOrigins.includes(origin)
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-ID', 'X-CSRF-Token', 'X-API-Key'],
	exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
	maxAge: 86400,
})

// =============================================================================
// App
// =============================================================================

export const app = new Elysia({ prefix: '/api', name: 'hare-api' })
	// Global CORS
	.use(corsConfig)

	// Global error handler
	.onError(({ error, code }) => {
		if (error instanceof CloudflareEnvError) {
			console.error('CloudflareEnvError:', error.message)
			return Response.json({ error: 'Service unavailable' }, { status: 503 })
		}

		console.error('Unhandled error:', error)
		return Response.json({ error: 'Internal server error' }, { status: 500 })
	})

	// --- Special routes (non-RPC) ---
	.use(billingWebhookRoutes)
	.use(authRoutes)
	.use(agentWsRoutes)
	.use(chatAppRoutes)
	.use(devRoutes)
	.use(embedPublicRoutes)
	.use(mcpRoutes)

	// --- RPC routes (type-safe, used by Eden Treaty) ---
	.use(healthRoutes)
	.use(agentRoutes)
	.use(workspaceRoutes)
	.use(toolRoutes)
	.use(apiKeyRoutes)
	.use(scheduleRoutes)
	.use(workspaceMemberRoutes)
	.use(userSettingsRoutes)
	.use(usageRoutes)
	.use(analyticsRoutes)
	.use(logRoutes)
	.use(memoryRoutes)
	.use(chatRoutes)
	.use(billingRoutes)
	.use(webhookRoutes)
	.use(auditLogRoutes)
	.use(activityRoutes)

// Log routes in dev
if (serverEnv.NODE_ENV === 'development') {
	console.log('\n🐇 Hare API (Elysia) routes registered')
}

// Export app type for Eden Treaty client
export type App = typeof app
