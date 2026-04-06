/**
 * Elysia API Application
 *
 * Main entry point for the Hare API, built on Elysia with:
 * - Cloudflare Workers adapter
 * - Eden Treaty for type-safe client
 * - OpenAPI spec + Scalar API reference (auto-generated)
 * - Better Auth via .mount()
 * - Zod schemas via Standard Schema support
 * - CORS via @elysiajs/cors
 * - SSE streaming via built-in generators
 */

import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'
import { serverEnv } from '@hare/config'
import { Elysia } from 'elysia'
import { CloudflareEnvError } from './context'
// RPC route imports (type-safe, used by Eden Treaty)
import { activityRoutes } from './routes/activity'
// Special route imports (non-RPC)
import { agentWsRoutes, chatAppRoutes } from './routes/agent-ws'
import { agentRoutes } from './routes/agents'
import { analyticsRoutes } from './routes/analytics'
import { apiKeyRoutes } from './routes/api-keys'
import { auditLogRoutes } from './routes/audit-logs'
import { authRoutes } from './routes/auth'
import { billingRoutes } from './routes/billing'
import { billingWebhookRoutes } from './routes/billing-webhook'
import { chatRoutes } from './routes/chat'
import { devRoutes } from './routes/dev'
import { embedPublicRoutes } from './routes/embed-public'
import { healthRoutes } from './routes/health'
import { logRoutes } from './routes/logs'
import { mcpRoutes } from './routes/mcp'
import { memoryRoutes } from './routes/memory'
import { scheduleRoutes } from './routes/schedules'
import { toolRoutes } from './routes/tools'
import { usageRoutes } from './routes/usage'
import { userSettingsRoutes } from './routes/user-settings'
import { webhookRoutes } from './routes/webhooks'
import { workspaceMemberRoutes } from './routes/workspace-members'
import { workspaceRoutes } from './routes/workspaces'

// =============================================================================
// App
// =============================================================================

export const app = new Elysia({ prefix: '/api', name: 'hare-api' })
	// OpenAPI spec + Scalar API reference UI
	// - Spec: /api/openapi/json
	// - Scalar UI: /api/openapi
	.use(
		openapi({
			documentation: {
				info: {
					title: 'Hare API',
					version: '2.0.0',
					description: 'Build and deploy AI agents to the edge',
				},
				tags: [
					{ name: 'Agents', description: 'Agent CRUD, deployment, versioning, and health' },
					{ name: 'Tools', description: 'Custom tool management' },
					{ name: 'Workspaces', description: 'Workspace management' },
					{ name: 'Workspace Members', description: 'Member and invitation management' },
					{ name: 'API Keys', description: 'API key management' },
					{ name: 'Schedules', description: 'Scheduled agent tasks' },
					{ name: 'Chat', description: 'AI SDK streaming chat and conversation history' },
					{ name: 'Memory', description: 'Agent vector memory (Vectorize)' },
					{ name: 'Billing', description: 'Stripe billing and subscriptions' },
					{ name: 'Usage', description: 'Token and request usage stats' },
					{ name: 'Analytics', description: 'Usage analytics and trends' },
					{ name: 'Webhooks', description: 'Webhook CRUD and delivery tracking' },
					{ name: 'Audit Logs', description: 'Workspace audit trail' },
					{ name: 'Activity', description: 'Real-time activity feed' },
					{ name: 'Health', description: 'System health checks' },
					{ name: 'Auth', description: 'Authentication (Better Auth)' },
					{ name: 'Agent WebSocket', description: 'Real-time agent communication' },
					{ name: 'MCP', description: 'Model Context Protocol for external AI clients' },
					{ name: 'Embed', description: 'Public embeddable agent widgets' },
				],
			},
		}),
	)

	// Global CORS
	.use(
		cors({
			origin: (request) => {
				const origin = request.headers.get('origin')
				const allowedOrigins = [serverEnv.APP_URL, 'http://localhost:3000', 'http://localhost:8787']
				if (!origin) return true
				return allowedOrigins.includes(origin)
			},
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			allowedHeaders: [
				'Content-Type',
				'Authorization',
				'X-Workspace-ID',
				'X-CSRF-Token',
				'X-API-Key',
			],
			exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
			maxAge: 86400,
		}),
	)

	// Global error handler
	.onError(({ error }) => {
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
	console.log('📖 OpenAPI docs: /api/openapi')
	console.log('📋 OpenAPI spec: /api/openapi/json')
}

// Export app type for Eden Treaty client
export type App = typeof app
