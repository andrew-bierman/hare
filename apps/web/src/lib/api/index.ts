import { OpenAPIHono } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import { cors } from 'hono/cors'
import { getRouterName, showRoutes } from 'hono/dev'
import { logger } from 'hono/logger'
import { CloudflareEnvError } from './db'
import { requestId, secureHeaders, timing } from './middleware'
// Import route modules
import agents from './routes/agents'
import auth from './routes/auth'
import chat from './routes/chat'
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
app.use('*', cors())

// Mount routes - chain for type inference
const routes = app
	.route('/agents', agents)
	.route('/workspaces', workspaces)
	.route('/tools', tools)
	.route('/auth', auth)
	.route('/chat', chat)
	.route('/usage', usage)

// Development: Show registered routes on startup
if (process.env.NODE_ENV === 'development') {
	console.log(`\n🚀 Hare API using ${getRouterName(app)} router`)
	showRoutes(app, { verbose: true, colorize: true })
	console.log('')
}

// OpenAPI documentation
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
		{ name: 'Tools', description: 'Tool management for agents' },
		{ name: 'Chat', description: 'Chat with deployed agents' },
		{ name: 'Usage', description: 'Usage statistics and analytics' },
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

// Health check
app.get('/health', (c) =>
	c.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		version: '1.0.0',
	}),
)

// Export the chained routes type for RPC client
export type AppType = typeof routes
export { app }
