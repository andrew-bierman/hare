import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import {
	AgentUsageResponseSchema,
	IdParamSchema,
	UsageQuerySchema,
	UsageResponseSchema,
} from '../schemas'

// Define routes
const getWorkspaceUsageRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Usage'],
	summary: 'Get workspace usage statistics',
	description:
		'Retrieve usage statistics for the workspace, optionally filtered by date range and agent',
	request: {
		query: UsageQuerySchema,
	},
	responses: {
		200: {
			description: 'Usage statistics',
			content: {
				'application/json': {
					schema: UsageResponseSchema,
				},
			},
		},
	},
})

const getAgentUsageRoute = createRoute({
	method: 'get',
	path: '/agents/{id}',
	tags: ['Usage'],
	summary: 'Get agent usage statistics',
	description: 'Retrieve usage statistics for a specific agent',
	request: {
		params: IdParamSchema,
	},
	responses: {
		200: {
			description: 'Agent usage statistics',
			content: {
				'application/json': {
					schema: AgentUsageResponseSchema,
				},
			},
		},
	},
})

// Create app and register routes
const app = new OpenAPIHono()
	.openapi(getWorkspaceUsageRoute, async (c) => {
		const { startDate, endDate } = c.req.valid('query')

		// TODO: Query usage data from DB
		// TODO: Aggregate by groupBy parameter

		const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
		const defaultEndDate = new Date().toISOString()

		return c.json({
			usage: {
				totalMessages: 1234,
				totalTokensIn: 50000,
				totalTokensOut: 75000,
				totalCost: 1.25,
				byAgent: [
					{
						agentId: 'agent_xxx',
						agentName: 'Customer Support Agent',
						messages: 800,
						tokensIn: 30000,
						tokensOut: 45000,
						cost: 0.75,
					},
					{
						agentId: 'agent_yyy',
						agentName: 'Sales Agent',
						messages: 434,
						tokensIn: 20000,
						tokensOut: 30000,
						cost: 0.5,
					},
				],
				byDay: [
					{
						date: '2024-12-01',
						messages: 100,
						tokensIn: 4000,
						tokensOut: 6000,
						cost: 0.1,
					},
					{
						date: '2024-12-02',
						messages: 150,
						tokensIn: 6000,
						tokensOut: 9000,
						cost: 0.15,
					},
				],
			},
			period: {
				startDate: startDate || defaultStartDate,
				endDate: endDate || defaultEndDate,
			},
		})
	})
	.openapi(getAgentUsageRoute, async (c) => {
		const { id: agentId } = c.req.valid('param')

		// TODO: Query usage data from DB for specific agent

		return c.json({
			agentId,
			usage: {
				totalMessages: 800,
				totalTokensIn: 30000,
				totalTokensOut: 45000,
				totalCost: 0.75,
				averageLatencyMs: 250,
				byModel: [
					{
						model: 'llama-3.3-70b-instruct',
						messages: 800,
						tokensIn: 30000,
						tokensOut: 45000,
						cost: 0.75,
					},
				],
				byDay: [
					{
						date: '2024-12-01',
						messages: 50,
						tokensIn: 2000,
						tokensOut: 3000,
						cost: 0.05,
					},
				],
			},
		})
	})

export default app
