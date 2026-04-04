import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
	listAgentsTool,
	getAgentTool,
	sendMessageTool,
	configureAgentTool,
	createAgentTool,
	deleteAgentTool,
	scheduleTaskTool,
	executeToolTool,
	listAgentToolsTool,
	getAgentMetricsTool,
	getAgentControlTools,
	AGENT_CONTROL_TOOL_IDS,
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
	env: hasDB
		? { DB: createMockDB() as unknown as D1Database }
		: ({} as ToolContext['env']),
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

				const result = await listAgentsTool.execute(
					{ status: 'all', limit: 50 },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.agents).toHaveLength(1)
			})

			it('fails when DB is not available', async () => {
				const contextWithoutDB = createMockContext(false)

				const result = await listAgentsTool.execute(
					{ status: 'all', limit: 50 },
					contextWithoutDB,
				)

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
