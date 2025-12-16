import { OpenAPIHono } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

// Import route modules
import agents from './routes/agents'
import auth from './routes/auth'
import chat from './routes/chat'
import tools from './routes/tools'
import usage from './routes/usage'
import workspaces from './routes/workspaces'

// Create app
const app = new OpenAPIHono().basePath('/api')

// Middleware
app.use('*', logger())
app.use('*', cors())

// Mount routes
app.route('/agents', agents)
app.route('/workspaces', workspaces)
app.route('/tools', tools)
app.route('/auth', auth)
app.route('/chat', chat)
app.route('/usage', usage)

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

export type AppType = typeof app
export { app }
