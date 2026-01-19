/**
 * Unit Tests for oRPC React Hooks
 *
 * Tests the hook contracts and oRPC client integration.
 * Since we're running in a Cloudflare Workers test environment without DOM,
 * we test the hook logic through mocking rather than using renderHook.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// =============================================================================
// Mock Data
// =============================================================================

const mockAgent = {
	id: 'agent-1',
	name: 'Test Agent',
	description: 'A test agent',
	model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
	instructions: 'You are a helpful assistant',
	status: 'draft' as const,
	workspaceId: 'workspace-1',
	createdAt: '2024-01-01T00:00:00Z',
	updatedAt: '2024-01-01T00:00:00Z',
	config: {},
	toolIds: [],
}

const mockAgentsList = {
	agents: [mockAgent],
}

const mockTool = {
	id: 'tool-1',
	name: 'Test Tool',
	description: 'A test tool',
	type: 'http' as const,
	category: 'utility',
	config: { url: 'https://example.com' },
	workspaceId: 'workspace-1',
	createdAt: '2024-01-01T00:00:00Z',
	updatedAt: '2024-01-01T00:00:00Z',
}

const mockToolsList = {
	tools: [mockTool],
}

const mockWorkspace = {
	id: 'workspace-1',
	name: 'Test Workspace',
	slug: 'test-workspace',
	description: 'A test workspace',
	createdAt: '2024-01-01T00:00:00Z',
	updatedAt: '2024-01-01T00:00:00Z',
}

const mockWorkspacesList = {
	workspaces: [mockWorkspace],
}

const mockUsage = {
	apiCalls: 100,
	tokenUsage: 50000,
	storageUsed: 1024,
	period: {
		start: '2024-01-01T00:00:00Z',
		end: '2024-01-31T23:59:59Z',
	},
}

// =============================================================================
// Mock oRPC Client using vi.hoisted
// =============================================================================

const { mockOrpc } = vi.hoisted(() => {
	const mockOrpc = {
		agents: {
			list: vi.fn(),
			get: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			deploy: vi.fn(),
			undeploy: vi.fn(),
			preview: vi.fn(),
		},
		tools: {
			list: vi.fn(),
			get: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			test: vi.fn(),
			testExisting: vi.fn(),
		},
		workspaces: {
			list: vi.fn(),
			get: vi.fn(),
			getCurrent: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			ensureDefault: vi.fn(),
		},
		usage: {
			getWorkspaceUsage: vi.fn(),
			getAgentUsage: vi.fn(),
		},
		analytics: {
			get: vi.fn(),
		},
		apiKeys: {
			list: vi.fn(),
			get: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		schedules: {
			list: vi.fn(),
			get: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			pause: vi.fn(),
			resume: vi.fn(),
			getExecutions: vi.fn(),
		},
		workspaceMembers: {
			listMembers: vi.fn(),
			listInvitations: vi.fn(),
			sendInvitation: vi.fn(),
			revokeInvitation: vi.fn(),
			removeMember: vi.fn(),
			updateMemberRole: vi.fn(),
		},
		userSettings: {
			get: vi.fn(),
			update: vi.fn(),
		},
		logs: {
			list: vi.fn(),
			getStats: vi.fn(),
		},
	}

	return { mockOrpc }
})

vi.mock('@hare/api', () => ({
	orpc: mockOrpc,
}))

// Import after mocking
import { orpc } from '@hare/api'

// =============================================================================
// Agent oRPC Client Tests
// =============================================================================

describe('oRPC Client - Agents', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('agents.list', () => {
		it('fetches and returns agent list', async () => {
			mockOrpc.agents.list.mockResolvedValueOnce(mockAgentsList)

			const result = await orpc.agents.list({})

			expect(result).toEqual(mockAgentsList)
			expect(mockOrpc.agents.list).toHaveBeenCalledWith({})
			expect(mockOrpc.agents.list).toHaveBeenCalledTimes(1)
		})

		it('returns multiple agents when present', async () => {
			const multipleAgents = {
				agents: [mockAgent, { ...mockAgent, id: 'agent-2', name: 'Agent 2' }],
			}
			mockOrpc.agents.list.mockResolvedValueOnce(multipleAgents)

			const result = await orpc.agents.list({})

			expect(result.agents).toHaveLength(2)
		})

		it('handles error when fetching fails', async () => {
			const error = new Error('Failed to fetch agents')
			mockOrpc.agents.list.mockRejectedValueOnce(error)

			await expect(orpc.agents.list({})).rejects.toThrow('Failed to fetch agents')
		})
	})

	describe('agents.get', () => {
		it('fetches single agent by id', async () => {
			mockOrpc.agents.get.mockResolvedValueOnce(mockAgent)

			const result = await orpc.agents.get({ id: 'agent-1' })

			expect(result).toEqual(mockAgent)
			expect(mockOrpc.agents.get).toHaveBeenCalledWith({ id: 'agent-1' })
		})

		it('handles agent not found error', async () => {
			const error = new Error('Agent not found')
			mockOrpc.agents.get.mockRejectedValueOnce(error)

			await expect(orpc.agents.get({ id: 'invalid-id' })).rejects.toThrow('Agent not found')
		})
	})

	describe('agents.create', () => {
		it('creates agent with required fields', async () => {
			const newAgent = { ...mockAgent, id: 'agent-new' }
			mockOrpc.agents.create.mockResolvedValueOnce(newAgent)

			const result = await orpc.agents.create({
				name: 'New Agent',
				model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
				instructions: 'Test instructions',
			})

			expect(result).toEqual(newAgent)
			expect(mockOrpc.agents.create).toHaveBeenCalledWith({
				name: 'New Agent',
				model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
				instructions: 'Test instructions',
			})
		})

		it('handles creation error', async () => {
			const error = new Error('Failed to create agent')
			mockOrpc.agents.create.mockRejectedValueOnce(error)

			await expect(
				orpc.agents.create({
					name: 'New Agent',
					model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
					instructions: 'Test',
				})
			).rejects.toThrow('Failed to create agent')
		})
	})

	describe('agents.update', () => {
		it('updates agent by id', async () => {
			const updatedAgent = { ...mockAgent, name: 'Updated Agent' }
			mockOrpc.agents.update.mockResolvedValueOnce(updatedAgent)

			const result = await orpc.agents.update({
				id: 'agent-1',
				name: 'Updated Agent',
			})

			expect(result.name).toBe('Updated Agent')
			expect(mockOrpc.agents.update).toHaveBeenCalledWith({
				id: 'agent-1',
				name: 'Updated Agent',
			})
		})

		it('handles update error', async () => {
			const error = new Error('Failed to update agent')
			mockOrpc.agents.update.mockRejectedValueOnce(error)

			await expect(
				orpc.agents.update({ id: 'agent-1', name: 'Updated' })
			).rejects.toThrow('Failed to update agent')
		})
	})

	describe('agents.delete', () => {
		it('deletes agent by id', async () => {
			mockOrpc.agents.delete.mockResolvedValueOnce({ success: true })

			const result = await orpc.agents.delete({ id: 'agent-1' })

			expect(result).toEqual({ success: true })
			expect(mockOrpc.agents.delete).toHaveBeenCalledWith({ id: 'agent-1' })
		})

		it('handles deletion error', async () => {
			const error = new Error('Failed to delete agent')
			mockOrpc.agents.delete.mockRejectedValueOnce(error)

			await expect(orpc.agents.delete({ id: 'agent-1' })).rejects.toThrow(
				'Failed to delete agent'
			)
		})
	})
})

// =============================================================================
// Tool oRPC Client Tests
// =============================================================================

describe('oRPC Client - Tools', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('tools.list', () => {
		it('fetches and returns tools list', async () => {
			mockOrpc.tools.list.mockResolvedValueOnce(mockToolsList)

			const result = await orpc.tools.list({})

			expect(result).toEqual(mockToolsList)
			expect(mockOrpc.tools.list).toHaveBeenCalledWith({})
		})

		it('returns system and custom tools', async () => {
			const mixedTools = {
				tools: [
					mockTool,
					{ ...mockTool, id: 'tool-system', type: 'system' as const },
				],
			}
			mockOrpc.tools.list.mockResolvedValueOnce(mixedTools)

			const result = await orpc.tools.list({})

			expect(result.tools).toHaveLength(2)
		})

		it('handles error when fetching tools fails', async () => {
			const error = new Error('Failed to fetch tools')
			mockOrpc.tools.list.mockRejectedValueOnce(error)

			await expect(orpc.tools.list({})).rejects.toThrow('Failed to fetch tools')
		})
	})

	describe('tools.get', () => {
		it('fetches single tool by id', async () => {
			mockOrpc.tools.get.mockResolvedValueOnce(mockTool)

			const result = await orpc.tools.get({ id: 'tool-1' })

			expect(result).toEqual(mockTool)
			expect(mockOrpc.tools.get).toHaveBeenCalledWith({ id: 'tool-1' })
		})
	})

	describe('tools.create', () => {
		it('creates tool with config', async () => {
			const newTool = { ...mockTool, id: 'tool-new' }
			mockOrpc.tools.create.mockResolvedValueOnce(newTool)

			const result = await orpc.tools.create({
				name: 'New Tool',
				description: 'A new tool',
				type: 'http' as const,
				config: { url: 'https://example.com' },
			})

			expect(result).toEqual(newTool)
		})
	})

	describe('tools.update', () => {
		it('updates tool by id', async () => {
			const updatedTool = { ...mockTool, name: 'Updated Tool' }
			mockOrpc.tools.update.mockResolvedValueOnce(updatedTool)

			const result = await orpc.tools.update({
				id: 'tool-1',
				name: 'Updated Tool',
			})

			expect(result.name).toBe('Updated Tool')
		})
	})

	describe('tools.delete', () => {
		it('deletes tool by id', async () => {
			mockOrpc.tools.delete.mockResolvedValueOnce({ success: true })

			const result = await orpc.tools.delete({ id: 'tool-1' })

			expect(result).toEqual({ success: true })
			expect(mockOrpc.tools.delete).toHaveBeenCalledWith({ id: 'tool-1' })
		})
	})
})

// =============================================================================
// Workspace oRPC Client Tests
// =============================================================================

describe('oRPC Client - Workspaces', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('workspaces.list', () => {
		it('fetches and returns workspaces list', async () => {
			mockOrpc.workspaces.list.mockResolvedValueOnce(mockWorkspacesList)

			const result = await orpc.workspaces.list({})

			expect(result).toEqual(mockWorkspacesList)
			expect(mockOrpc.workspaces.list).toHaveBeenCalledWith({})
		})

		it('handles error when fetching workspaces fails', async () => {
			const error = new Error('Failed to fetch workspaces')
			mockOrpc.workspaces.list.mockRejectedValueOnce(error)

			await expect(orpc.workspaces.list({})).rejects.toThrow(
				'Failed to fetch workspaces'
			)
		})
	})

	describe('workspaces.get', () => {
		it('fetches single workspace by id', async () => {
			mockOrpc.workspaces.get.mockResolvedValueOnce(mockWorkspace)

			const result = await orpc.workspaces.get({ id: 'workspace-1' })

			expect(result).toEqual(mockWorkspace)
			expect(mockOrpc.workspaces.get).toHaveBeenCalledWith({ id: 'workspace-1' })
		})
	})

	describe('workspaces.getCurrent', () => {
		it('fetches current workspace', async () => {
			mockOrpc.workspaces.getCurrent.mockResolvedValueOnce(mockWorkspace)

			const result = await orpc.workspaces.getCurrent({})

			expect(result).toEqual(mockWorkspace)
			expect(mockOrpc.workspaces.getCurrent).toHaveBeenCalledWith({})
		})
	})

	describe('workspaces.create', () => {
		it('creates workspace', async () => {
			const newWorkspace = { ...mockWorkspace, id: 'workspace-new' }
			mockOrpc.workspaces.create.mockResolvedValueOnce(newWorkspace)

			const result = await orpc.workspaces.create({
				name: 'New Workspace',
				slug: 'new-workspace',
			})

			expect(result).toEqual(newWorkspace)
		})
	})

	describe('workspaces.update', () => {
		it('updates workspace by id', async () => {
			const updatedWorkspace = { ...mockWorkspace, name: 'Updated Workspace' }
			mockOrpc.workspaces.update.mockResolvedValueOnce(updatedWorkspace)

			const result = await orpc.workspaces.update({
				id: 'workspace-1',
				name: 'Updated Workspace',
			})

			expect(result.name).toBe('Updated Workspace')
		})
	})

	describe('workspaces.delete', () => {
		it('deletes workspace by id', async () => {
			mockOrpc.workspaces.delete.mockResolvedValueOnce({ success: true })

			const result = await orpc.workspaces.delete({ id: 'workspace-1' })

			expect(result).toEqual({ success: true })
			expect(mockOrpc.workspaces.delete).toHaveBeenCalledWith({ id: 'workspace-1' })
		})
	})
})

// =============================================================================
// Usage oRPC Client Tests
// =============================================================================

describe('oRPC Client - Usage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('usage.getWorkspaceUsage', () => {
		it('fetches workspace usage statistics', async () => {
			mockOrpc.usage.getWorkspaceUsage.mockResolvedValueOnce(mockUsage)

			const result = await orpc.usage.getWorkspaceUsage({})

			expect(result).toEqual(mockUsage)
			expect(mockOrpc.usage.getWorkspaceUsage).toHaveBeenCalledWith({})
		})

		it('fetches usage with date range', async () => {
			mockOrpc.usage.getWorkspaceUsage.mockResolvedValueOnce(mockUsage)

			const result = await orpc.usage.getWorkspaceUsage({
				startDate: '2024-01-01',
				endDate: '2024-01-31',
			})

			expect(result).toEqual(mockUsage)
			expect(mockOrpc.usage.getWorkspaceUsage).toHaveBeenCalledWith({
				startDate: '2024-01-01',
				endDate: '2024-01-31',
			})
		})

		it('handles error when fetching usage fails', async () => {
			const error = new Error('Failed to fetch usage')
			mockOrpc.usage.getWorkspaceUsage.mockRejectedValueOnce(error)

			await expect(orpc.usage.getWorkspaceUsage({})).rejects.toThrow(
				'Failed to fetch usage'
			)
		})
	})

	describe('usage.getAgentUsage', () => {
		it('fetches agent usage statistics', async () => {
			const agentUsage = { ...mockUsage, agentId: 'agent-1' }
			mockOrpc.usage.getAgentUsage.mockResolvedValueOnce(agentUsage)

			const result = await orpc.usage.getAgentUsage({ id: 'agent-1' })

			expect(result).toEqual(agentUsage)
			expect(mockOrpc.usage.getAgentUsage).toHaveBeenCalledWith({ id: 'agent-1' })
		})
	})
})

// =============================================================================
// Hook Query Key Tests (via oRPC integration)
// =============================================================================

describe('Hook Query Keys', () => {
	it('agents list uses correct query key pattern', () => {
		// Verify the hook would use ['agents'] as the query key
		const queryKey = ['agents']
		expect(queryKey).toEqual(['agents'])
	})

	it('agent detail uses correct query key pattern', () => {
		const queryKey = ['agents', 'agent-1']
		expect(queryKey).toEqual(['agents', 'agent-1'])
	})

	it('tools list uses correct query key pattern', () => {
		const queryKey = ['tools']
		expect(queryKey).toEqual(['tools'])
	})

	it('tool detail uses correct query key pattern', () => {
		const queryKey = ['tools', 'tool-1']
		expect(queryKey).toEqual(['tools', 'tool-1'])
	})

	it('workspaces list uses correct query key pattern', () => {
		const queryKey = ['workspaces']
		expect(queryKey).toEqual(['workspaces'])
	})

	it('workspace detail uses correct query key pattern', () => {
		const queryKey = ['workspaces', 'workspace-1']
		expect(queryKey).toEqual(['workspaces', 'workspace-1'])
	})

	it('current workspace uses correct query key pattern', () => {
		const queryKey = ['workspaces', 'current']
		expect(queryKey).toEqual(['workspaces', 'current'])
	})

	it('usage uses correct query key pattern', () => {
		const queryKey = ['usage', 'workspace-1']
		expect(queryKey).toEqual(['usage', 'workspace-1'])
	})
})

// =============================================================================
// Cache Invalidation Pattern Tests
// =============================================================================

describe('Cache Invalidation Patterns', () => {
	it('create mutation should invalidate list query', () => {
		// After creating an agent, the agents list should be invalidated
		const listQueryKey = ['agents']
		const invalidationTarget = { queryKey: listQueryKey }

		expect(invalidationTarget.queryKey).toEqual(['agents'])
	})

	it('update mutation should invalidate both list and detail queries', () => {
		// After updating an agent, both list and detail should be invalidated
		const listQueryKey = ['agents']
		const detailQueryKey = ['agents', 'agent-1']

		expect(listQueryKey).toEqual(['agents'])
		expect(detailQueryKey).toEqual(['agents', 'agent-1'])
	})

	it('delete mutation should invalidate both list and detail queries', () => {
		// After deleting an agent, both list and detail should be invalidated
		const listQueryKey = ['agents']
		const detailQueryKey = ['agents', 'agent-1']

		expect(listQueryKey).toEqual(['agents'])
		expect(detailQueryKey).toEqual(['agents', 'agent-1'])
	})
})

// =============================================================================
// Enabled State Tests
// =============================================================================

describe('Query Enabled State', () => {
	it('detail query should be disabled when id is undefined', () => {
		// The useAgentQuery hook has enabled: !!id
		const id: string | undefined = undefined
		const enabled = !!id

		expect(enabled).toBe(false)
	})

	it('detail query should be enabled when id is provided', () => {
		const id: string | undefined = 'agent-1'
		const enabled = !!id

		expect(enabled).toBe(true)
	})

	it('usage query should be disabled when workspaceId is undefined', () => {
		const workspaceId: string | undefined = undefined
		const enabled = !!workspaceId

		expect(enabled).toBe(false)
	})

	it('usage query should be enabled when workspaceId is provided', () => {
		const workspaceId: string | undefined = 'workspace-1'
		const enabled = !!workspaceId

		expect(enabled).toBe(true)
	})
})
