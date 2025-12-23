/**
 * Agent WebSocket API Routes
 *
 * Handles WebSocket connections to Cloudflare Agents SDK Durable Objects.
 * Provides real-time bidirectional communication with agents.
 */

import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { agents } from 'web-app/db/schema'
import {
	isWebSocketRequest,
	routeHttpToAgent,
	routeWebSocketToAgent,
} from 'web-app/lib/agents'
import { getCloudflareEnv, getDb } from '../db'
import { optionalAuthMiddleware } from '../middleware'
import { ErrorSchema, IdParamSchema } from '../schemas'
import type { OptionalAuthEnv } from '../types'

// WebSocket upgrade route
const agentWebSocketRoute = createRoute({
	method: 'get',
	path: '/agents/{id}/ws',
	tags: ['Agent WebSocket'],
	summary: 'Connect to agent via WebSocket',
	description:
		'Upgrade to WebSocket connection for real-time chat with agent. Send JSON messages with type: chat, configure, execute_tool, get_state, or schedule.',
	request: {
		params: IdParamSchema,
	},
	responses: {
		101: {
			description: 'WebSocket upgrade successful',
		},
		400: {
			description: 'Not a WebSocket request or agent not deployed',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		503: {
			description: 'Service unavailable',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

// Get agent state route
const agentStateRoute = createRoute({
	method: 'get',
	path: '/agents/{id}/state',
	tags: ['Agent WebSocket'],
	summary: 'Get agent state',
	description: 'Get the current state of a Cloudflare Agent Durable Object',
	request: {
		params: IdParamSchema,
	},
	responses: {
		200: {
			description: 'Agent state',
			content: {
				'application/json': {
					schema: z.object({
						agentId: z.string(),
						workspaceId: z.string(),
						name: z.string(),
						instructions: z.string(),
						model: z.string(),
						messages: z.array(z.object({
							role: z.enum(['user', 'assistant', 'system']),
							content: z.string(),
						})),
						isProcessing: z.boolean(),
						lastActivity: z.number(),
						connectedUsers: z.array(z.string()),
						status: z.enum(['idle', 'processing', 'error']),
					}),
				},
			},
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		503: {
			description: 'Service unavailable',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

// Configure agent route
const configureAgentRoute = createRoute({
	method: 'post',
	path: '/agents/{id}/configure',
	tags: ['Agent WebSocket'],
	summary: 'Configure agent',
	description: 'Configure a Cloudflare Agent Durable Object with new settings',
	request: {
		params: IdParamSchema,
		body: {
			content: {
				'application/json': {
					schema: z.object({
						name: z.string().optional(),
						instructions: z.string().optional(),
						model: z.string().optional(),
						workspaceId: z.string().optional(),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Agent configured',
			content: {
				'application/json': {
					schema: z.object({
						success: z.boolean(),
						state: z.unknown(),
					}),
				},
			},
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		503: {
			description: 'Service unavailable',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

// Get agent schedules route
const agentSchedulesRoute = createRoute({
	method: 'get',
	path: '/agents/{id}/schedules',
	tags: ['Agent WebSocket'],
	summary: 'Get agent schedules',
	description: 'Get all scheduled tasks for a Cloudflare Agent',
	request: {
		params: IdParamSchema,
	},
	responses: {
		200: {
			description: 'Agent schedules',
			content: {
				'application/json': {
					schema: z.object({
						schedules: z.array(z.object({
							id: z.string(),
							type: z.enum(['one-time', 'recurring']),
							executeAt: z.number().optional(),
							cron: z.string().optional(),
							action: z.string(),
							payload: z.record(z.unknown()).optional(),
						})),
					}),
				},
			},
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		503: {
			description: 'Service unavailable',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

// Create app
const app = new OpenAPIHono<OptionalAuthEnv>()

// Apply optional auth middleware
app.use('*', optionalAuthMiddleware)

// WebSocket upgrade handler
app.openapi(agentWebSocketRoute, async (c) => {
	const { id: agentId } = c.req.valid('param')
	const db = await getDb(c)
	const env = await getCloudflareEnv(c)
	const user = c.get('user')

	// Check if it's a WebSocket request
	if (!isWebSocketRequest(c.req.raw)) {
		return c.json({ error: 'WebSocket upgrade required' }, 400)
	}

	// Verify agent exists and is deployed
	const [agent] = await db.select().from(agents).where(eq(agents.id, agentId))

	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	if (agent.status !== 'deployed') {
		return c.json({ error: 'Agent not deployed' }, 400)
	}

	// Add user context to headers
	const headers = new Headers(c.req.raw.headers)
	headers.set('x-user-id', user?.id || 'anonymous')
	headers.set('x-workspace-id', agent.workspaceId)

	const request = new Request(c.req.raw.url, {
		method: c.req.raw.method,
		headers,
	})

	// Route to the HareAgent Durable Object
	return routeWebSocketToAgent(request, env, agentId)
})

// Get agent state handler
app.openapi(agentStateRoute, async (c) => {
	const { id: agentId } = c.req.valid('param')
	const db = await getDb(c)
	const env = await getCloudflareEnv(c)

	// Verify agent exists
	const [agent] = await db.select().from(agents).where(eq(agents.id, agentId))

	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	// Get state from Durable Object
	const response = await routeHttpToAgent(c.req.raw, env, agentId, '/state')
	const state = await response.json()

	return c.json(state, 200)
})

// Configure agent handler
app.openapi(configureAgentRoute, async (c) => {
	const { id: agentId } = c.req.valid('param')
	const config = c.req.valid('json')
	const db = await getDb(c)
	const env = await getCloudflareEnv(c)

	// Verify agent exists
	const [agent] = await db.select().from(agents).where(eq(agents.id, agentId))

	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	// Configure the Durable Object
	const configRequest = new Request(new URL('/configure', c.req.url).toString(), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			agentId,
			workspaceId: agent.workspaceId,
			name: config.name || agent.name,
			instructions: config.instructions || agent.instructions,
			model: config.model || agent.model,
		}),
	})

	const response = await routeHttpToAgent(configRequest, env, agentId, '/configure')
	const result = await response.json()

	return c.json(result, 200)
})

// Get agent schedules handler
app.openapi(agentSchedulesRoute, async (c) => {
	const { id: agentId } = c.req.valid('param')
	const db = await getDb(c)
	const env = await getCloudflareEnv(c)

	// Verify agent exists
	const [agent] = await db.select().from(agents).where(eq(agents.id, agentId))

	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	// Get schedules from Durable Object
	const response = await routeHttpToAgent(c.req.raw, env, agentId, '/schedules')
	const result = await response.json()

	return c.json(result, 200)
})

export default app
