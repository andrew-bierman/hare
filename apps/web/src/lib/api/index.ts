import { OpenAPIHono } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import { getRouterName, showRoutes } from 'hono/dev'
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { timing } from 'hono/timing'
import { serverEnv } from 'web-app/lib/env/server'
import { CloudflareEnvError } from './db'
import { corsMiddleware, securityHeadersMiddleware } from './middleware'
import agentWs from './routes/agent-ws'
// Import route modules
import agents from './routes/agents'
import analytics from './routes/analytics'
import auth from './routes/auth'
import chat from './routes/chat'
import dev from './routes/dev'
import health from './routes/health'
import mcp from './routes/mcp'
import tools from './routes/tools'
import usage from './routes/usage'
import workspaces from './routes/workspaces'
import type { HonoEnv } from './types'

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

// Mount routes - chain for type inference
const routes = app
	.route('/agents', agents)
	.route('/agent-ws', agentWs)
	.route('/analytics', analytics)
	.route('/workspaces', workspaces)
	.route('/tools', tools)
	.route('/auth', auth)
	.route('/chat', chat)
	.route('/usage', usage)
	.route('/dev', dev)
	.route('/mcp', mcp)
	.route('/health', health)

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
		{ name: 'Tools', description: 'Tool management for agents' },
		{ name: 'Chat', description: 'Chat with deployed agents (SSE)' },
		{ name: 'MCP', description: 'Model Context Protocol for external AI clients' },
		{ name: 'Usage', description: 'Usage statistics and analytics' },
		{ name: 'Analytics', description: 'Detailed analytics and visualizations' },
		{ name: 'Health', description: 'System health checks and monitoring endpoints' },
	],
})

// Scalar API reference UI
app.get(
	'/docs',
	apiReference({
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

// Export the chained routes type for RPC client
export type AppType = typeof routes
export { app }
