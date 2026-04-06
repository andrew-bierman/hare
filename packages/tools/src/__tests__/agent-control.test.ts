import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	AGENT_CONTROL_TOOL_IDS,
	configureAgentTool,
	createAgentTool,
	createWebhookTool,
	deleteAgentTool,
	deleteWebhookTool,
	deployAgentTool,
	executeToolTool,
	getAgentControlTools,
	getAgentMetricsTool,
	getAgentTool,
	listAgentsTool,
	listAgentToolsTool,
	listWebhooksTool,
	rollbackAgentTool,
	scheduleTaskTool,
	sendMessageTool,
	undeployAgentTool,
} from '../agent-control'
import type { ToolContext } from '../types'

// Mock D1 database
const createMockDB = () => {
	const mockStatement = {
		bind: vi.fn().mockReturnThis(),
		all: vi.fn().mockResolvedValue({
			results: [],
		}),
		first: vi.fn().mockResolvedValue(null),
		run: vi.fn().mockResolvedValue({ success: true }),
	}

	return {
		prepare: vi.fn().mockReturnValue(mockStatement),
		_statement: mockStatement,
	}
}

const createMockContext = (hasDB = true): ToolContext => ({
	env: hasDB ? { DB: createMockDB() as unknown as D1Database } : ({} as ToolContext['env']),
	workspaceId: 'test-workspace',
	userId: 'test-user',
})

describe('Agent Control Tools', () => {
	let context: ToolContext
	let mockDB: ReturnType<typeof createMockDB>

	beforeEach(() => {
		mockDB = createMockDB()
		context = {
			env: { DB: mockDB as unknown as D1Database } as ToolContext['env'],
			workspaceId: 'test-workspace',
			userId: 'test-user',
		}
	})

	describe('listAgentsTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(listAgentsTool.id).toBe('agent_list')
			})

			it('has descriptive description', () => {
				expect(listAgentsTool.description).toContain('agent')
			})

			it('validates basic request', () => {
				const result = listAgentsTool.inputSchema.safeParse({})
				expect(result.success).toBe(true)
			})

			it('validates with status filter', () => {
				const result = listAgentsTool.inputSchema.safeParse({
					status: 'deployed',
				})
				expect(result.success).toBe(true)
			})

			it('validates with limit', () => {
				const result = listAgentsTool.inputSchema.safeParse({
					limit: 25,
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('lists agents successfully', async () => {
				mockDB._statement.all.mockResolvedValueOnce({
					results: [
						{
							id: 'agent1',
							name: 'Test Agent',
							description: 'A test agent',
							model: 'llama-3.3-70b',
							status: 'deployed',
							instructions: 'Be helpful',
							config: '{}',
							createdAt: Date.now(),
							updatedAt: Date.now(),
						},
					],
				})

				const result = await listAgentsTool.execute({ status: 'all', limit: 50 }, context)

				expect(result.success).toBe(true)
				expect(result.data?.agents).toHaveLength(1)
			})

			it('fails when DB is not available', async () => {
				const contextWithoutDB = createMockContext(false)

				const result = await listAgentsTool.execute({ status: 'all', limit: 50 }, contextWithoutDB)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Database not available')
			})
		})
	})

	describe('getAgentTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(getAgentTool.id).toBe('agent_get')
			})

			it('validates with agentId', () => {
				const result = getAgentTool.inputSchema.safeParse({
					agentId: 'agent-123',
				})
				expect(result.success).toBe(true)
			})

			it('validates with options', () => {
				const result = getAgentTool.inputSchema.safeParse({
					agentId: 'agent-123',
					includeHistory: true,
					includeTools: true,
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('gets agent details', async () => {
				mockDB._statement.first.mockResolvedValueOnce({
					id: 'agent-123',
					name: 'Test Agent',
					description: 'Description',
					model: 'llama-3.3-70b',
					status: 'deployed',
					instructions: 'Be helpful',
					config: '{}',
					createdBy: 'user1',
					createdAt: Date.now(),
					updatedAt: Date.now(),
				})

				const result = await getAgentTool.execute(
					{ agentId: 'agent-123', includeHistory: false, includeTools: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.id).toBe('agent-123')
			})

			it('returns failure for non-existent agent', async () => {
				mockDB._statement.first.mockResolvedValueOnce(null)

				const result = await getAgentTool.execute(
					{ agentId: 'nonexistent', includeHistory: false, includeTools: false },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('not found')
			})
		})
	})

	describe('createAgentTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(createAgentTool.id).toBe('agent_create')
			})

			it('validates basic creation', () => {
				const result = createAgentTool.inputSchema.safeParse({
					name: 'New Agent',
				})
				expect(result.success).toBe(true)
			})

			it('validates with all options', () => {
				const result = createAgentTool.inputSchema.safeParse({
					name: 'New Agent',
					description: 'A new agent',
					instructions: 'Be helpful',
					model: 'llama-3.3-70b',
					config: { temperature: 0.7 },
				})
				expect(result.success).toBe(true)
			})

			it('rejects missing name', () => {
				const result = createAgentTool.inputSchema.safeParse({})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('creates agent successfully', async () => {
				const result = await createAgentTool.execute(
					{
						name: 'New Agent',
						description: 'Description',
						model: 'gpt-4',
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.name).toBe('New Agent')
				expect(result.data?.id).toMatch(/^ag_/)
			})
		})
	})

	describe('deleteAgentTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(deleteAgentTool.id).toBe('agent_delete')
			})

			it('validates with agentId', () => {
				const result = deleteAgentTool.inputSchema.safeParse({
					agentId: 'agent-123',
				})
				expect(result.success).toBe(true)
			})

			it('validates with force option', () => {
				const result = deleteAgentTool.inputSchema.safeParse({
					agentId: 'agent-123',
					force: true,
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('deletes agent', async () => {
				mockDB._statement.first.mockResolvedValueOnce({
					id: 'agent-123',
					name: 'Test Agent',
					status: 'draft',
				})

				const result = await deleteAgentTool.execute(
					{ agentId: 'agent-123', force: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.deleted).toBe(true)
			})

			it('prevents deleting deployed agent without force', async () => {
				mockDB._statement.first.mockResolvedValueOnce({
					id: 'agent-123',
					name: 'Test Agent',
					status: 'deployed',
				})

				const result = await deleteAgentTool.execute(
					{ agentId: 'agent-123', force: false },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('deployed')
			})
		})
	})

	describe('configureAgentTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(configureAgentTool.id).toBe('agent_configure')
			})

			it('validates configuration update', () => {
				const result = configureAgentTool.inputSchema.safeParse({
					agentId: 'agent-123',
					name: 'Updated Name',
				})
				expect(result.success).toBe(true)
			})
		})
	})

	describe('sendMessageTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(sendMessageTool.id).toBe('agent_send_message')
			})

			it('validates message request', () => {
				const result = sendMessageTool.inputSchema.safeParse({
					agentId: 'agent-123',
					message: 'Hello!',
				})
				expect(result.success).toBe(true)
			})
		})
	})

	describe('scheduleTaskTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(scheduleTaskTool.id).toBe('agent_schedule')
			})

			it('validates with executeAt', () => {
				const result = scheduleTaskTool.inputSchema.safeParse({
					agentId: 'agent-123',
					action: 'send_report',
					executeAt: Date.now() + 60000,
				})
				expect(result.success).toBe(true)
			})

			it('validates with cron', () => {
				const result = scheduleTaskTool.inputSchema.safeParse({
					agentId: 'agent-123',
					action: 'daily_update',
					cron: '0 9 * * *',
				})
				expect(result.success).toBe(true)
			})
		})
	})

	describe('executeToolTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(executeToolTool.id).toBe('agent_execute_tool')
			})

			it('validates tool execution request', () => {
				const result = executeToolTool.inputSchema.safeParse({
					agentId: 'agent-123',
					toolId: 'tool-456',
					params: { query: 'test' },
				})
				expect(result.success).toBe(true)
			})
		})
	})

	describe('listAgentToolsTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(listAgentToolsTool.id).toBe('agent_list_tools')
			})

			it('validates request', () => {
				const result = listAgentToolsTool.inputSchema.safeParse({
					agentId: 'agent-123',
				})
				expect(result.success).toBe(true)
			})
		})
	})

	describe('getAgentMetricsTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(getAgentMetricsTool.id).toBe('agent_metrics')
			})

			it('validates request with period', () => {
				const result = getAgentMetricsTool.inputSchema.safeParse({
					agentId: 'agent-123',
					period: 'week',
				})
				expect(result.success).toBe(true)
			})
		})
	})

	describe('deployAgentTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(deployAgentTool.id).toBe('agent_deploy')
			})

			it('validates with agentId', () => {
				const result = deployAgentTool.inputSchema.safeParse({
					agentId: 'agent-123',
				})
				expect(result.success).toBe(true)
			})

			it('rejects missing agentId', () => {
				const result = deployAgentTool.inputSchema.safeParse({})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('deploys agent successfully', async () => {
				mockDB._statement.first.mockResolvedValueOnce({
					id: 'agent-123',
					status: 'draft',
				})

				const result = await deployAgentTool.execute({ agentId: 'agent-123' }, context)

				expect(result.success).toBe(true)
				expect(result.data?.status).toBe('deployed')
				expect(result.data?.previousStatus).toBe('draft')
			})

			it('fails when agent is already deployed', async () => {
				mockDB._statement.first.mockResolvedValueOnce({
					id: 'agent-123',
					status: 'deployed',
				})

				const result = await deployAgentTool.execute({ agentId: 'agent-123' }, context)

				expect(result.success).toBe(false)
				expect(result.error).toContain('already deployed')
			})

			it('fails when agent not found', async () => {
				mockDB._statement.first.mockResolvedValueOnce(null)

				const result = await deployAgentTool.execute({ agentId: 'nonexistent' }, context)

				expect(result.success).toBe(false)
				expect(result.error).toContain('not found')
			})

			it('fails when DB is not available', async () => {
				const contextWithoutDB = createMockContext(false)

				const result = await deployAgentTool.execute({ agentId: 'agent-123' }, contextWithoutDB)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Database not available')
			})
		})
	})

	describe('undeployAgentTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(undeployAgentTool.id).toBe('agent_undeploy')
			})

			it('validates with agentId', () => {
				const result = undeployAgentTool.inputSchema.safeParse({
					agentId: 'agent-123',
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('undeploys agent successfully', async () => {
				mockDB._statement.first.mockResolvedValueOnce({
					id: 'agent-123',
					status: 'deployed',
				})

				const result = await undeployAgentTool.execute({ agentId: 'agent-123' }, context)

				expect(result.success).toBe(true)
				expect(result.data?.status).toBe('draft')
				expect(result.data?.previousStatus).toBe('deployed')
			})

			it('fails when agent is not deployed', async () => {
				mockDB._statement.first.mockResolvedValueOnce({
					id: 'agent-123',
					status: 'draft',
				})

				const result = await undeployAgentTool.execute({ agentId: 'agent-123' }, context)

				expect(result.success).toBe(false)
				expect(result.error).toContain('not deployed')
			})

			it('fails when agent not found', async () => {
				mockDB._statement.first.mockResolvedValueOnce(null)

				const result = await undeployAgentTool.execute({ agentId: 'nonexistent' }, context)

				expect(result.success).toBe(false)
				expect(result.error).toContain('not found')
			})
		})
	})

	describe('rollbackAgentTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(rollbackAgentTool.id).toBe('agent_rollback')
			})

			it('validates with agentId only (defaults to most recent)', () => {
				const result = rollbackAgentTool.inputSchema.safeParse({
					agentId: 'agent-123',
				})
				expect(result.success).toBe(true)
			})

			it('validates with agentId and snapshotId', () => {
				const result = rollbackAgentTool.inputSchema.safeParse({
					agentId: 'agent-123',
					snapshotId: 'snap_abc123',
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('rolls back agent to a snapshot', async () => {
				// First call: agent lookup
				mockDB._statement.first
					.mockResolvedValueOnce({
						id: 'agent-123',
						config: '{"temperature":0.9}',
						instructions: 'Current instructions',
						model: 'llama-3.3-70b',
					})
					// Second call: snapshot lookup
					.mockResolvedValueOnce({
						id: 'snap_old',
						config: '{"temperature":0.5}',
						instructions: 'Old instructions',
						model: 'llama-3.1-8b',
						createdAt: Date.now() - 86400000,
					})

				const result = await rollbackAgentTool.execute({ agentId: 'agent-123' }, context)

				expect(result.success).toBe(true)
				expect(result.data?.rolledBackTo).toBe('snap_old')
			})

			it('fails when no snapshot exists', async () => {
				mockDB._statement.first
					.mockResolvedValueOnce({
						id: 'agent-123',
						config: '{}',
						instructions: '',
						model: 'llama-3.3-70b',
					})
					.mockResolvedValueOnce(null)

				const result = await rollbackAgentTool.execute({ agentId: 'agent-123' }, context)

				expect(result.success).toBe(false)
				expect(result.error).toContain('No snapshot found')
			})

			it('fails when agent not found', async () => {
				mockDB._statement.first.mockResolvedValueOnce(null)

				const result = await rollbackAgentTool.execute({ agentId: 'nonexistent' }, context)

				expect(result.success).toBe(false)
				expect(result.error).toContain('not found')
			})
		})
	})

	describe('listWebhooksTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(listWebhooksTool.id).toBe('agent_webhook_list')
			})

			it('validates with agentId', () => {
				const result = listWebhooksTool.inputSchema.safeParse({
					agentId: 'agent-123',
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('lists webhooks for an agent', async () => {
				// Agent lookup
				mockDB._statement.first.mockResolvedValueOnce({ id: 'agent-123' })
				// Webhooks query
				mockDB._statement.all.mockResolvedValueOnce({
					results: [
						{
							id: 'wh_1',
							url: 'https://example.com/hook',
							events: '["agent.message"]',
							status: 'active',
							createdAt: Date.now(),
						},
					],
				})

				const result = await listWebhooksTool.execute({ agentId: 'agent-123' }, context)

				expect(result.success).toBe(true)
				expect(result.data?.webhooks).toHaveLength(1)
				expect(result.data?.total).toBe(1)
			})

			it('fails when agent not found', async () => {
				mockDB._statement.first.mockResolvedValueOnce(null)

				const result = await listWebhooksTool.execute({ agentId: 'nonexistent' }, context)

				expect(result.success).toBe(false)
				expect(result.error).toContain('not found')
			})
		})
	})

	describe('createWebhookTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(createWebhookTool.id).toBe('agent_webhook_create')
			})

			it('validates with required fields', () => {
				const result = createWebhookTool.inputSchema.safeParse({
					agentId: 'agent-123',
					url: 'https://example.com/webhook',
					events: ['agent.message'],
				})
				expect(result.success).toBe(true)
			})

			it('validates with optional secret', () => {
				const result = createWebhookTool.inputSchema.safeParse({
					agentId: 'agent-123',
					url: 'https://example.com/webhook',
					events: ['agent.message', 'agent.deployed'],
					secret: 'my-secret',
				})
				expect(result.success).toBe(true)
			})

			it('rejects empty events array', () => {
				const result = createWebhookTool.inputSchema.safeParse({
					agentId: 'agent-123',
					url: 'https://example.com/webhook',
					events: [],
				})
				expect(result.success).toBe(false)
			})

			it('rejects invalid URL', () => {
				const result = createWebhookTool.inputSchema.safeParse({
					agentId: 'agent-123',
					url: 'not-a-url',
					events: ['agent.message'],
				})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('creates a webhook', async () => {
				mockDB._statement.first.mockResolvedValueOnce({ id: 'agent-123' })

				const result = await createWebhookTool.execute(
					{
						agentId: 'agent-123',
						url: 'https://example.com/webhook',
						events: ['agent.message'],
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.id).toMatch(/^wh_/)
				expect(result.data?.url).toBe('https://example.com/webhook')
				expect(result.data?.events).toEqual(['agent.message'])
				expect(result.data?.status).toBe('active')
			})

			it('fails when agent not found', async () => {
				mockDB._statement.first.mockResolvedValueOnce(null)

				const result = await createWebhookTool.execute(
					{
						agentId: 'nonexistent',
						url: 'https://example.com/webhook',
						events: ['agent.message'],
					},
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('not found')
			})
		})
	})

	describe('deleteWebhookTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(deleteWebhookTool.id).toBe('agent_webhook_delete')
			})

			it('validates with agentId and webhookId', () => {
				const result = deleteWebhookTool.inputSchema.safeParse({
					agentId: 'agent-123',
					webhookId: 'wh_abc',
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('deletes a webhook', async () => {
				// Agent lookup
				mockDB._statement.first
					.mockResolvedValueOnce({ id: 'agent-123' })
					// Webhook lookup
					.mockResolvedValueOnce({ id: 'wh_abc' })

				const result = await deleteWebhookTool.execute(
					{ agentId: 'agent-123', webhookId: 'wh_abc' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.deleted).toBe(true)
				expect(result.data?.webhookId).toBe('wh_abc')
			})

			it('fails when agent not found', async () => {
				mockDB._statement.first.mockResolvedValueOnce(null)

				const result = await deleteWebhookTool.execute(
					{ agentId: 'nonexistent', webhookId: 'wh_abc' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('not found')
			})

			it('fails when webhook not found', async () => {
				mockDB._statement.first
					.mockResolvedValueOnce({ id: 'agent-123' })
					.mockResolvedValueOnce(null)

				const result = await deleteWebhookTool.execute(
					{ agentId: 'agent-123', webhookId: 'nonexistent' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('not found')
			})
		})
	})

	describe('getAgentControlTools', () => {
		it('returns all agent control tools', () => {
			const tools = getAgentControlTools(context)

			expect(tools).toHaveLength(16)
			expect(tools.map((t) => t.id)).toEqual(Array.from(AGENT_CONTROL_TOOL_IDS))
		})

		it('returns tools with correct structure', () => {
			const tools = getAgentControlTools(context)

			for (const tool of tools) {
				expect(tool).toHaveProperty('id')
				expect(tool).toHaveProperty('description')
				expect(tool).toHaveProperty('inputSchema')
				expect(tool).toHaveProperty('execute')
				expect(typeof tool.execute).toBe('function')
			}
		})
	})
})
