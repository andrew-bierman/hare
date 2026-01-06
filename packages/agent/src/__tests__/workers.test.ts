/**
 * Tests for workers.ts - Workers-only exports verification
 *
 * Validates that the workers entry point exports all expected items,
 * including both main exports and workers-specific exports.
 */

import { describe, expect, it, vi } from 'vitest'

// Mock the agents SDK
vi.mock('agents', () => ({
	Agent: class MockAgent {
		state = {}
		env = {}
		initialState = {}
		setState = vi.fn()
	},
}))

// Mock agents/mcp
vi.mock('agents/mcp', () => ({
	McpAgent: class MockMcpAgent {
		state = {}
		env = {}
		initialState = {}
		setState = vi.fn()
	},
}))

// Mock MCP server SDK
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
	McpServer: vi.fn().mockImplementation(() => ({
		tool: vi.fn(),
		resource: vi.fn(),
	})),
}))

// Mock @hare/tools
vi.mock('@hare/tools', () => ({
	getSystemTools: vi.fn().mockReturnValue([]),
	ToolRegistry: vi.fn().mockImplementation(() => ({
		registerAll: vi.fn(),
		list: vi.fn().mockReturnValue([]),
		has: vi.fn().mockReturnValue(false),
		execute: vi.fn().mockResolvedValue({ success: true, data: 'result' }),
	})),
	getAgentControlTools: vi.fn().mockReturnValue([]),
	AGENT_CONTROL_TOOL_IDS: [],
	agentControlTools: [],
	configureAgentTool: {},
	createAgentTool: {},
	deleteAgentTool: {},
	executeToolTool: {},
	getAgentMetricsTool: {},
	getAgentTool: {},
	listAgentsTool: {},
	listAgentToolsTool: {},
	scheduleTaskTool: {},
	sendMessageTool: {},
}))

// Mock @hare/types
vi.mock('@hare/types', () => ({
	DEFAULT_HARE_AGENT_STATE: {
		agentId: '',
		workspaceId: '',
		name: 'Hare Agent',
		instructions: 'You are a helpful AI assistant.',
		model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
		messages: [],
		isProcessing: false,
		lastActivity: Date.now(),
		connectedUsers: [],
		scheduledTasks: [],
		status: 'idle',
	},
	DEFAULT_MCP_AGENT_STATE: {
		workspaceId: '',
		connectedClients: 0,
		lastActivity: Date.now(),
	},
}))

// Import after mocks
import * as workersExports from '../workers'

describe('@hare/agent/workers exports', () => {
	describe('Workers-specific exports', () => {
		it('exports HareAgent class', () => {
			expect(workersExports.HareAgent).toBeDefined()
			expect(typeof workersExports.HareAgent).toBe('function')
		})

		it('exports HareMcpAgent class', () => {
			expect(workersExports.HareMcpAgent).toBeDefined()
			expect(typeof workersExports.HareMcpAgent).toBe('function')
		})
	})

	describe('Re-exported from main index', () => {
		it('exports HareEdgeAgent class', () => {
			expect(workersExports.HareEdgeAgent).toBeDefined()
			expect(typeof workersExports.HareEdgeAgent).toBe('function')
		})

		it('exports createHareEdgeAgent factory function', () => {
			expect(workersExports.createHareEdgeAgent).toBeDefined()
			expect(typeof workersExports.createHareEdgeAgent).toBe('function')
		})

		it('exports router functions', () => {
			expect(workersExports.routeToHareAgent).toBeDefined()
			expect(workersExports.routeToMcpAgent).toBeDefined()
			expect(workersExports.routeWebSocketToAgent).toBeDefined()
			expect(workersExports.routeHttpToAgent).toBeDefined()
			expect(workersExports.isWebSocketRequest).toBeDefined()
			expect(workersExports.getAgentIdFromRequest).toBeDefined()
			expect(workersExports.createAgentHeaders).toBeDefined()
		})

		it('exports Workers AI provider functions', () => {
			expect(workersExports.createWorkersAIModel).toBeDefined()
			expect(workersExports.getWorkersAIModelId).toBeDefined()
			expect(workersExports.getAvailableModels).toBeDefined()
			expect(workersExports.generateEmbedding).toBeDefined()
			expect(workersExports.generateEmbeddings).toBeDefined()
			expect(workersExports.WORKERS_AI_MODELS).toBeDefined()
			expect(workersExports.EMBEDDING_MODELS).toBeDefined()
		})

		it('exports memory store', () => {
			expect(workersExports.createMemoryStore).toBeDefined()
			expect(workersExports.toAgentMessages).toBeDefined()
			expect(workersExports.D1MemoryStore).toBeDefined()
		})

		it('exports factory functions', () => {
			expect(workersExports.createAgentFromConfig).toBeDefined()
			expect(workersExports.createSimpleAgent).toBeDefined()
			expect(workersExports.loadAgentTools).toBeDefined()
		})

		it('exports agent control tools', () => {
			expect(workersExports.agentControlTools).toBeDefined()
			expect(workersExports.getAgentControlToolsForMcp).toBeDefined()
		})
	})
})

describe('HareAgent class from workers entry', () => {
	it('HareAgent can be instantiated', () => {
		const agent = new workersExports.HareAgent()
		expect(agent).toBeDefined()
		expect(agent.initialState).toBeDefined()
	})

	it('HareAgent has expected initial state', () => {
		const agent = new workersExports.HareAgent()
		expect(agent.initialState.name).toBe('Hare Agent')
		expect(agent.initialState.status).toBe('idle')
	})
})

describe('HareMcpAgent class from workers entry', () => {
	it('HareMcpAgent can be instantiated', () => {
		const agent = new workersExports.HareMcpAgent()
		expect(agent).toBeDefined()
		expect(agent.initialState).toBeDefined()
	})

	it('HareMcpAgent has expected initial state', () => {
		const agent = new workersExports.HareMcpAgent()
		expect(agent.initialState.connectedClients).toBe(0)
	})

	it('HareMcpAgent has MCP server', () => {
		const agent = new workersExports.HareMcpAgent()
		expect(agent.server).toBeDefined()
	})
})
