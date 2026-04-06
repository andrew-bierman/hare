/**
 * Tests for tools/index.ts and tools/agent-control.ts - Tools exports verification
 *
 * Validates that all expected tool exports are available.
 */

import type { ToolContext } from '@hare/tools'
import { describe, expect, it, vi } from 'vitest'
import * as toolsExports from '../tools'
import { getAgentControlToolsForMcp } from '../tools/agent-control'

// Mock @hare/tools
vi.mock('@hare/tools', () => ({
	getAgentControlTools: vi.fn().mockReturnValue([
		{ id: 'get_agent', description: 'Get agent' },
		{ id: 'list_agents', description: 'List agents' },
	]),
	AGENT_CONTROL_TOOL_IDS: ['get_agent', 'list_agents', 'create_agent'],
	agentControlTools: [
		{ id: 'get_agent', description: 'Get agent' },
		{ id: 'list_agents', description: 'List agents' },
	],
	configureAgentTool: { id: 'configure_agent' },
	createAgentTool: { id: 'create_agent' },
	deleteAgentTool: { id: 'delete_agent' },
	executeToolTool: { id: 'execute_tool' },
	getAgentMetricsTool: { id: 'get_agent_metrics' },
	getAgentTool: { id: 'get_agent' },
	listAgentsTool: { id: 'list_agents' },
	listAgentToolsTool: { id: 'list_agent_tools' },
	scheduleTaskTool: { id: 'schedule_task' },
	sendMessageTool: { id: 'send_message' },
}))

describe('tools/index.ts exports', () => {
	describe('Agent control tool exports', () => {
		it('exports AGENT_CONTROL_TOOL_IDS', () => {
			expect(toolsExports.AGENT_CONTROL_TOOL_IDS).toBeDefined()
			expect(Array.isArray(toolsExports.AGENT_CONTROL_TOOL_IDS)).toBe(true)
		})

		it('exports agentControlTools', () => {
			expect(toolsExports.agentControlTools).toBeDefined()
		})

		it('exports configureAgentTool', () => {
			expect(toolsExports.configureAgentTool).toBeDefined()
		})

		it('exports createAgentTool', () => {
			expect(toolsExports.createAgentTool).toBeDefined()
		})

		it('exports deleteAgentTool', () => {
			expect(toolsExports.deleteAgentTool).toBeDefined()
		})

		it('exports executeToolTool', () => {
			expect(toolsExports.executeToolTool).toBeDefined()
		})

		it('exports getAgentControlTools function', () => {
			expect(toolsExports.getAgentControlTools).toBeDefined()
			expect(typeof toolsExports.getAgentControlTools).toBe('function')
		})

		it('exports getAgentControlToolsForMcp function', () => {
			expect(toolsExports.getAgentControlToolsForMcp).toBeDefined()
			expect(typeof toolsExports.getAgentControlToolsForMcp).toBe('function')
		})

		it('exports getAgentMetricsTool', () => {
			expect(toolsExports.getAgentMetricsTool).toBeDefined()
		})

		it('exports getAgentTool', () => {
			expect(toolsExports.getAgentTool).toBeDefined()
		})

		it('exports listAgentsTool', () => {
			expect(toolsExports.listAgentsTool).toBeDefined()
		})

		it('exports listAgentToolsTool', () => {
			expect(toolsExports.listAgentToolsTool).toBeDefined()
		})

		it('exports scheduleTaskTool', () => {
			expect(toolsExports.scheduleTaskTool).toBeDefined()
		})

		it('exports sendMessageTool', () => {
			expect(toolsExports.sendMessageTool).toBeDefined()
		})
	})
})

describe('tools/agent-control.ts', () => {
	describe('getAgentControlToolsForMcp', () => {
		it('is a function that wraps getAgentControlTools', () => {
			expect(typeof getAgentControlToolsForMcp).toBe('function')
		})

		it('returns tools when called with context', async () => {
			const mockContext = {
				env: {},
				workspaceId: 'test_workspace',
				userId: 'test_user',
			}

			const tools = getAgentControlToolsForMcp(mockContext as unknown as ToolContext)
			expect(tools).toBeDefined()
			expect(Array.isArray(tools)).toBe(true)
		})

		it('calls getAgentControlTools with the provided context', async () => {
			const { getAgentControlTools } = await import('@hare/tools')
			vi.mocked(getAgentControlTools).mockClear()

			const mockContext = {
				env: { DB: {} },
				workspaceId: 'workspace_123',
				userId: 'user_456',
			}

			getAgentControlToolsForMcp(mockContext as unknown as ToolContext)

			expect(getAgentControlTools).toHaveBeenCalledWith(mockContext)
		})
	})
})

describe('Tool exports consistency', () => {
	it('agentControlTools matches expected tool structure', () => {
		const tools = toolsExports.agentControlTools
		expect(Array.isArray(tools)).toBe(true)

		for (const tool of tools) {
			expect(tool).toHaveProperty('id')
			expect(typeof tool.id).toBe('string')
		}
	})

	it('AGENT_CONTROL_TOOL_IDS contains expected tool IDs', () => {
		const toolIds = toolsExports.AGENT_CONTROL_TOOL_IDS
		expect(toolIds).toContain('get_agent')
		expect(toolIds).toContain('list_agents')
		expect(toolIds).toContain('create_agent')
	})
})
