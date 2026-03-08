/**
 * Agent deployment operations (deploy, undeploy, rollback, history, get-deployment)
 */

import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { desc, eq } from 'drizzle-orm'
import { agents, deployments } from '@hare/db/schema'
import { routeHttpToAgent } from '@hare/agent'
import { getCloudflareEnv, getDb } from '../../db'
import { commonResponses, requireAdminAccess } from '../../helpers'
import { authMiddleware, workspaceMiddleware } from '../../middleware'
import {
	DeployAgentSchema,
	DeploymentSchema,
	ErrorSchema,
	IdParamSchema,
	SuccessSchema,
} from '../../schemas'
import {
	deactivateDeployment,
	getDeploymentHistory,
	rollbackDeployment,
} from '../../services/deployment'
import { findAgentByIdAndWorkspace } from './helpers'
import type { WorkspaceEnv } from '@hare/types'

// =============================================================================
// Route Definitions
// =============================================================================

const deployAgentRoute = createRoute({
	method: 'post',
	path: '/{id}/deploy',
	tags: ['Agents'],
	summary: 'Deploy agent',
	description: 'Deploy an agent to production with endpoint URLs',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: DeployAgentSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Agent deployed successfully',
			content: {
				'application/json': {
					schema: DeploymentSchema,
				},
			},
		},
		400: {
			description: 'Agent not ready for deployment',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		403: {
			description: 'Admin access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Agent not found',
			content: {
				'application/json': {
					schema: ErrorSchema,
				},
			},
		},
		500: {
			description: 'Failed to create deployment',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const getDeploymentRoute = createRoute({
	method: 'get',
	path: '/{id}/deployment',
	tags: ['Agents'],
	summary: 'Get deployment info',
	description: 'Get deployment information and endpoints for a deployed agent',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'Deployment information',
			content: {
				'application/json': {
					schema: DeploymentSchema,
				},
			},
		},
		400: {
			description: 'Agent not deployed',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Agent or deployment not found',
			content: {
				'application/json': {
					schema: ErrorSchema,
				},
			},
		},
		...commonResponses,
	},
})

const undeployAgentRoute = createRoute({
	method: 'post',
	path: '/{id}/undeploy',
	tags: ['Agents'],
	summary: 'Undeploy agent',
	description: 'Remove an agent from production',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'Agent undeployed successfully',
			content: {
				'application/json': {
					schema: SuccessSchema,
				},
			},
		},
		403: {
			description: 'Admin access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const rollbackAgentRoute = createRoute({
	method: 'post',
	path: '/{id}/rollback',
	tags: ['Agents'],
	summary: 'Rollback agent deployment',
	description: 'Rollback to a previous deployment version',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: z.object({
						version: z.string().optional().describe('Target version to rollback to'),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Rollback successful',
			content: {
				'application/json': {
					schema: z.object({
						success: z.boolean(),
						previousVersion: z.string().optional(),
						currentVersion: z.string().optional(),
						message: z.string(),
					}),
				},
			},
		},
		403: {
			description: 'Admin access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const deploymentHistoryRoute = createRoute({
	method: 'get',
	path: '/{id}/deployments',
	tags: ['Agents'],
	summary: 'Get deployment history',
	description: 'Get the deployment history for an agent',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
			limit: z.coerce.number().optional().default(10).describe('Maximum number of results'),
		}),
	},
	responses: {
		200: {
			description: 'Deployment history',
			content: {
				'application/json': {
					schema: z.object({
						deployments: z.array(DeploymentSchema),
					}),
				},
			},
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

// =============================================================================
// App and Route Handlers
// =============================================================================

const baseApp = new OpenAPIHono<WorkspaceEnv>()

baseApp.use('*', authMiddleware)
baseApp.use('*', workspaceMiddleware)

export const deploymentApp = baseApp
	.openapi(deployAgentRoute, async (c) => {
		const { id } = c.req.valid('param')
		const data = c.req.valid('json')
		const db = getDb(c)
		const env = getCloudflareEnv(c)
		const user = c.get('user')
		const workspace = c.get('workspace')
		const role = c.get('workspaceRole')

		requireAdminAccess(role)

		const existing = await findAgentByIdAndWorkspace({ db, id, workspaceId: workspace.id })
		if (!existing) {
			return c.json({ error: 'Agent not found' }, 404)
		}

		if (!existing.instructions) {
			return c.json({ error: 'Agent must have instructions before deployment' }, 400)
		}

		// Generate deployment URL based on request origin
		const requestUrl = new URL(c.req.url)
		const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
		const agentBaseUrl = `${baseUrl}/api/agents/${id}`

		// Configure the Durable Object with agent settings
		const configRequest = new Request(`${agentBaseUrl}/configure`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				agentId: id,
				workspaceId: workspace.id,
				name: existing.name,
				instructions: existing.instructions,
				model: existing.model,
				systemToolsEnabled: existing.systemToolsEnabled,
			}),
		})

		try {
			const configResponse = await routeHttpToAgent({
				request: configRequest,
				env,
				agentId: id,
				path: '/configure',
			})

			if (!configResponse.ok) {
				console.error('Failed to configure Durable Object:', await configResponse.text())
			}
		} catch (error) {
			console.error('Error configuring Durable Object:', error)
		}

		await db
			.update(agents)
			.set({
				status: 'deployed',
				updatedAt: new Date(),
			})
			.where(eq(agents.id, id))

		const version = data.version || '1.0.0'

		// Generate WebSocket URL
		const wsProtocol = requestUrl.protocol === 'https:' ? 'wss:' : 'ws:'
		const wsBaseUrl = `${wsProtocol}//${requestUrl.host}`

		const [deployment] = await db
			.insert(deployments)
			.values({
				agentId: id,
				version,
				status: 'active',
				url: agentBaseUrl,
				deployedBy: user.id,
				metadata: existing.config ? { config: existing.config } : undefined,
			})
			.returning()

		if (!deployment) {
			return c.json({ error: 'Failed to create deployment' }, 500)
		}

		return c.json(
			{
				id: deployment.id,
				status: 'deployed' as const,
				deployedAt: deployment.deployedAt.toISOString(),
				version,
				url: agentBaseUrl,
				endpoints: {
					chat: `${agentBaseUrl}/chat`,
					websocket: `${wsBaseUrl}/api/agents/${id}/ws`,
					state: `${agentBaseUrl}/state`,
				},
			},
			200,
		)
	})
	.openapi(getDeploymentRoute, async (c) => {
		const { id } = c.req.valid('param')
		const db = getDb(c)
		const workspace = c.get('workspace')

		const existing = await findAgentByIdAndWorkspace({ db, id, workspaceId: workspace.id })
		if (!existing) {
			return c.json({ error: 'Agent not found' }, 404)
		}

		if (existing.status !== 'deployed') {
			return c.json({ error: 'Agent is not deployed' }, 400)
		}

		const [deployment] = await db
			.select()
			.from(deployments)
			.where(eq(deployments.agentId, id))
			.orderBy(desc(deployments.deployedAt))
			.limit(1)

		if (!deployment) {
			return c.json({ error: 'Deployment not found' }, 404)
		}

		const requestUrl = new URL(c.req.url)
		const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
		const agentBaseUrl = deployment.url || `${baseUrl}/api/agents/${id}`
		const wsProtocol = requestUrl.protocol === 'https:' ? 'wss:' : 'ws:'
		const wsBaseUrl = `${wsProtocol}//${requestUrl.host}`

		return c.json(
			{
				id: deployment.id,
				status: 'deployed' as const,
				deployedAt: deployment.deployedAt.toISOString(),
				version: deployment.version,
				url: agentBaseUrl,
				endpoints: {
					chat: `${agentBaseUrl}/chat`,
					websocket: `${wsBaseUrl}/api/agents/${id}/ws`,
					state: `${agentBaseUrl}/state`,
				},
			},
			200,
		)
	})
	.openapi(undeployAgentRoute, async (c) => {
		const { id } = c.req.valid('param')
		const db = getDb(c)
		const workspace = c.get('workspace')
		const role = c.get('workspaceRole')

		requireAdminAccess(role)

		const existing = await findAgentByIdAndWorkspace({ db, id, workspaceId: workspace.id })
		if (!existing) {
			return c.json({ error: 'Agent not found' }, 404)
		}

		const result = await deactivateDeployment({ db, agentId: id })
		return c.json(result, 200)
	})
	.openapi(rollbackAgentRoute, async (c) => {
		const { id } = c.req.valid('param')
		const data = c.req.valid('json')
		const db = getDb(c)
		const user = c.get('user')
		const workspace = c.get('workspace')
		const role = c.get('workspaceRole')

		requireAdminAccess(role)

		const existing = await findAgentByIdAndWorkspace({ db, id, workspaceId: workspace.id })
		if (!existing) {
			return c.json({ error: 'Agent not found' }, 404)
		}

		const result = await rollbackDeployment({
			db,
			agentId: id,
			targetVersion: data.version,
			deployedBy: user.id,
		})

		return c.json(result, 200)
	})
	.openapi(deploymentHistoryRoute, async (c) => {
		const { id } = c.req.valid('param')
		const { limit } = c.req.valid('query')
		const db = getDb(c)
		const workspace = c.get('workspace')

		const existing = await findAgentByIdAndWorkspace({ db, id, workspaceId: workspace.id })
		if (!existing) {
			return c.json({ error: 'Agent not found' }, 404)
		}

		const history = await getDeploymentHistory({ db, agentId: id, limit })

		const requestUrl = new URL(c.req.url)
		const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
		const wsProtocol = requestUrl.protocol === 'https:' ? 'wss:' : 'ws:'
		const wsBaseUrl = `${wsProtocol}//${requestUrl.host}`

		return c.json(
			{
				deployments: history.map((d) => {
					const agentBaseUrl = d.url || `${baseUrl}/api/agents/${id}`
					return {
						id: d.id,
						status: d.status,
						deployedAt: d.deployedAt.toISOString(),
						version: d.version,
						url: agentBaseUrl,
						endpoints: {
							chat: `${agentBaseUrl}/chat`,
							websocket: `${wsBaseUrl}/api/agents/${id}/ws`,
							state: `${agentBaseUrl}/state`,
						},
					}
				}),
			},
			200,
		)
	})
