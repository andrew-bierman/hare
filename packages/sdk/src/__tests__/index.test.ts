/**
 * Tests for hareai (SDK) - Export verification
 *
 * Validates that the SDK re-exports from @hare/agent, @hare/tools, and @hare/types.
 */

import { describe, expect, it } from 'vitest'
import * as sdk from '../index'

describe('hareai SDK exports', () => {
	describe('Agent exports', () => {
		it('exports HareEdgeAgent class', () => {
			expect(sdk.HareEdgeAgent).toBeDefined()
			expect(typeof sdk.HareEdgeAgent).toBe('function')
		})

		it('exports createHareEdgeAgent factory', () => {
			expect(sdk.createHareEdgeAgent).toBeDefined()
			expect(typeof sdk.createHareEdgeAgent).toBe('function')
		})

		it('exports EdgeAgent alias', () => {
			expect(sdk.EdgeAgent).toBeDefined()
			expect(sdk.EdgeAgent).toBe(sdk.HareEdgeAgent)
		})

		it('exports createEdgeAgent alias', () => {
			expect(sdk.createEdgeAgent).toBeDefined()
			expect(sdk.createEdgeAgent).toBe(sdk.createHareEdgeAgent)
		})

		it('exports DEFAULT_HARE_AGENT_STATE', () => {
			expect(sdk.DEFAULT_HARE_AGENT_STATE).toBeDefined()
			expect(sdk.DEFAULT_HARE_AGENT_STATE.name).toBe('Hare Agent')
		})

		it('exports DEFAULT_MCP_AGENT_STATE', () => {
			expect(sdk.DEFAULT_MCP_AGENT_STATE).toBeDefined()
			expect(sdk.DEFAULT_MCP_AGENT_STATE.systemToolsEnabled).toBe(true)
		})
	})

	describe('Router exports', () => {
		it('exports router functions', () => {
			expect(typeof sdk.routeToHareAgent).toBe('function')
			expect(typeof sdk.routeToMcpAgent).toBe('function')
			expect(typeof sdk.routeWebSocketToAgent).toBe('function')
			expect(typeof sdk.routeHttpToAgent).toBe('function')
			expect(typeof sdk.isWebSocketRequest).toBe('function')
			expect(typeof sdk.getAgentIdFromRequest).toBe('function')
			expect(typeof sdk.createAgentHeaders).toBe('function')
		})
	})

	describe('Workers AI Provider exports', () => {
		it('exports createWorkersAIModel', () => {
			expect(typeof sdk.createWorkersAIModel).toBe('function')
		})

		it('exports getWorkersAIModelId', () => {
			expect(typeof sdk.getWorkersAIModelId).toBe('function')
		})

		it('exports getAvailableModels', () => {
			expect(typeof sdk.getAvailableModels).toBe('function')
		})

		it('exports embedding functions', () => {
			expect(typeof sdk.generateEmbedding).toBe('function')
			expect(typeof sdk.generateEmbeddings).toBe('function')
		})

		it('exports model constants', () => {
			expect(sdk.WORKERS_AI_MODELS).toBeDefined()
			expect(sdk.EMBEDDING_MODELS).toBeDefined()
		})
	})

	describe('Memory store exports', () => {
		it('exports createMemoryStore', () => {
			expect(typeof sdk.createMemoryStore).toBe('function')
		})

		it('exports toAgentMessages', () => {
			expect(typeof sdk.toAgentMessages).toBe('function')
		})

		it('exports D1MemoryStore', () => {
			expect(typeof sdk.D1MemoryStore).toBe('function')
		})
	})

	describe('Factory exports', () => {
		it('exports createAgentFromConfig', () => {
			expect(typeof sdk.createAgentFromConfig).toBe('function')
		})

		it('exports createSimpleAgent', () => {
			expect(typeof sdk.createSimpleAgent).toBe('function')
		})

		it('exports loadAgentTools', () => {
			expect(typeof sdk.loadAgentTools).toBe('function')
		})
	})

	describe('Tool exports', () => {
		it('exports createTool', () => {
			expect(typeof sdk.createTool).toBe('function')
		})

		it('exports success and failure helpers', () => {
			expect(typeof sdk.success).toBe('function')
			expect(typeof sdk.failure).toBe('function')
		})

		it('exports ToolRegistry', () => {
			expect(sdk.ToolRegistry).toBeDefined()
		})

		it('exports createRegistry', () => {
			expect(typeof sdk.createRegistry).toBe('function')
		})

		it('exports getSystemTools', () => {
			expect(typeof sdk.getSystemTools).toBe('function')
		})

		it('exports getToolsByCategory', () => {
			expect(typeof sdk.getToolsByCategory).toBe('function')
		})

		it('exports SYSTEM_TOOL_IDS', () => {
			expect(Array.isArray(sdk.SYSTEM_TOOL_IDS)).toBe(true)
			expect(sdk.SYSTEM_TOOL_IDS.length).toBeGreaterThan(0)
		})

		it('exports TOOL_COUNTS', () => {
			expect(sdk.TOOL_COUNTS).toBeDefined()
			expect(typeof sdk.TOOL_COUNTS).toBe('object')
		})

		it('exports delegateTo and delegateToWithValidation', () => {
			expect(typeof sdk.delegateTo).toBe('function')
			expect(typeof sdk.delegateToWithValidation).toBe('function')
		})
	})

	describe('Type/schema exports', () => {
		it('exports ToolConfigSchema', () => {
			expect(sdk.ToolConfigSchema).toBeDefined()
		})

		it('exports ToolTypeSchema', () => {
			expect(sdk.ToolTypeSchema).toBeDefined()
		})

		it('exports AgentStatusSchema', () => {
			expect(sdk.AgentStatusSchema).toBeDefined()
		})

		it('exports AgentConfigSchema', () => {
			expect(sdk.AgentConfigSchema).toBeDefined()
		})

		it('exports AgentSchema', () => {
			expect(sdk.AgentSchema).toBeDefined()
		})

		it('exports ApiErrorSchema and ApiSuccessSchema', () => {
			expect(sdk.ApiErrorSchema).toBeDefined()
			expect(sdk.ApiSuccessSchema).toBeDefined()
		})
	})
})

describe('SDK module structure', () => {
	it('exports a significant number of items', () => {
		const exportKeys = Object.keys(sdk)
		expect(exportKeys.length).toBeGreaterThan(30)
	})

	it('does not export undefined values', () => {
		for (const [key, value] of Object.entries(sdk)) {
			expect(value, `${key} should not be undefined`).toBeDefined()
		}
	})
})
