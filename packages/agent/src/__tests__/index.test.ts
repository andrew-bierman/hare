/**
 * Tests for index.ts - Package exports verification
 *
 * Validates that all expected exports are available from the main package entry point.
 */

import { describe, expect, it } from 'vitest'
import * as agentExports from '../index'

describe('@hare/agent exports', () => {
	describe('Type exports (re-exported from @hare/types)', () => {
		it('exports DEFAULT_HARE_AGENT_STATE', () => {
			expect(agentExports.DEFAULT_HARE_AGENT_STATE).toBeDefined()
		})

		it('exports DEFAULT_MCP_AGENT_STATE', () => {
			expect(agentExports.DEFAULT_MCP_AGENT_STATE).toBeDefined()
		})
	})

	describe('Edge Agent exports', () => {
		it('exports HareEdgeAgent class', () => {
			expect(agentExports.HareEdgeAgent).toBeDefined()
			expect(typeof agentExports.HareEdgeAgent).toBe('function')
		})

		it('exports createHareEdgeAgent factory function', () => {
			expect(agentExports.createHareEdgeAgent).toBeDefined()
			expect(typeof agentExports.createHareEdgeAgent).toBe('function')
		})

		it('exports EdgeAgent alias (deprecated)', () => {
			expect(agentExports.EdgeAgent).toBeDefined()
			expect(agentExports.EdgeAgent).toBe(agentExports.HareEdgeAgent)
		})

		it('exports createEdgeAgent alias (deprecated)', () => {
			expect(agentExports.createEdgeAgent).toBeDefined()
			expect(agentExports.createEdgeAgent).toBe(agentExports.createHareEdgeAgent)
		})
	})

	describe('Router exports', () => {
		it('exports routeToHareAgent function', () => {
			expect(agentExports.routeToHareAgent).toBeDefined()
			expect(typeof agentExports.routeToHareAgent).toBe('function')
		})

		it('exports routeToMcpAgent function', () => {
			expect(agentExports.routeToMcpAgent).toBeDefined()
			expect(typeof agentExports.routeToMcpAgent).toBe('function')
		})

		it('exports routeWebSocketToAgent function', () => {
			expect(agentExports.routeWebSocketToAgent).toBeDefined()
			expect(typeof agentExports.routeWebSocketToAgent).toBe('function')
		})

		it('exports routeHttpToAgent function', () => {
			expect(agentExports.routeHttpToAgent).toBeDefined()
			expect(typeof agentExports.routeHttpToAgent).toBe('function')
		})

		it('exports isWebSocketRequest function', () => {
			expect(agentExports.isWebSocketRequest).toBeDefined()
			expect(typeof agentExports.isWebSocketRequest).toBe('function')
		})

		it('exports getAgentIdFromRequest function', () => {
			expect(agentExports.getAgentIdFromRequest).toBeDefined()
			expect(typeof agentExports.getAgentIdFromRequest).toBe('function')
		})

		it('exports createAgentHeaders function', () => {
			expect(agentExports.createAgentHeaders).toBeDefined()
			expect(typeof agentExports.createAgentHeaders).toBe('function')
		})
	})

	describe('Workers AI Provider exports', () => {
		it('exports createWorkersAIModel function', () => {
			expect(agentExports.createWorkersAIModel).toBeDefined()
			expect(typeof agentExports.createWorkersAIModel).toBe('function')
		})

		it('exports getWorkersAIModelId function', () => {
			expect(agentExports.getWorkersAIModelId).toBeDefined()
			expect(typeof agentExports.getWorkersAIModelId).toBe('function')
		})

		it('exports getAvailableModels function', () => {
			expect(agentExports.getAvailableModels).toBeDefined()
			expect(typeof agentExports.getAvailableModels).toBe('function')
		})

		it('exports generateEmbedding function', () => {
			expect(agentExports.generateEmbedding).toBeDefined()
			expect(typeof agentExports.generateEmbedding).toBe('function')
		})

		it('exports generateEmbeddings function', () => {
			expect(agentExports.generateEmbeddings).toBeDefined()
			expect(typeof agentExports.generateEmbeddings).toBe('function')
		})

		it('exports WORKERS_AI_MODELS constant', () => {
			expect(agentExports.WORKERS_AI_MODELS).toBeDefined()
			expect(typeof agentExports.WORKERS_AI_MODELS).toBe('object')
		})

		it('exports EMBEDDING_MODELS constant', () => {
			expect(agentExports.EMBEDDING_MODELS).toBeDefined()
			expect(typeof agentExports.EMBEDDING_MODELS).toBe('object')
		})
	})

	describe('Memory store exports', () => {
		it('exports createMemoryStore function', () => {
			expect(agentExports.createMemoryStore).toBeDefined()
			expect(typeof agentExports.createMemoryStore).toBe('function')
		})

		it('exports toAgentMessages function', () => {
			expect(agentExports.toAgentMessages).toBeDefined()
			expect(typeof agentExports.toAgentMessages).toBe('function')
		})

		it('exports D1MemoryStore class', () => {
			expect(agentExports.D1MemoryStore).toBeDefined()
			expect(typeof agentExports.D1MemoryStore).toBe('function')
		})
	})

	describe('Agent control tools exports', () => {
		it('exports agentControlTools', () => {
			expect(agentExports.agentControlTools).toBeDefined()
		})

		it('exports configureAgentTool', () => {
			expect(agentExports.configureAgentTool).toBeDefined()
		})

		it('exports createAgentTool', () => {
			expect(agentExports.createAgentTool).toBeDefined()
		})

		it('exports deleteAgentTool', () => {
			expect(agentExports.deleteAgentTool).toBeDefined()
		})

		it('exports executeToolTool', () => {
			expect(agentExports.executeToolTool).toBeDefined()
		})

		it('exports getAgentControlToolsForMcp function', () => {
			expect(agentExports.getAgentControlToolsForMcp).toBeDefined()
			expect(typeof agentExports.getAgentControlToolsForMcp).toBe('function')
		})

		it('exports getAgentMetricsTool', () => {
			expect(agentExports.getAgentMetricsTool).toBeDefined()
		})

		it('exports getAgentTool', () => {
			expect(agentExports.getAgentTool).toBeDefined()
		})

		it('exports listAgentsTool', () => {
			expect(agentExports.listAgentsTool).toBeDefined()
		})

		it('exports listAgentToolsTool', () => {
			expect(agentExports.listAgentToolsTool).toBeDefined()
		})

		it('exports scheduleTaskTool', () => {
			expect(agentExports.scheduleTaskTool).toBeDefined()
		})

		it('exports sendMessageTool', () => {
			expect(agentExports.sendMessageTool).toBeDefined()
		})
	})

	describe('Factory exports', () => {
		it('exports createAgentFromConfig function', () => {
			expect(agentExports.createAgentFromConfig).toBeDefined()
			expect(typeof agentExports.createAgentFromConfig).toBe('function')
		})

		it('exports createSimpleAgent function', () => {
			expect(agentExports.createSimpleAgent).toBeDefined()
			expect(typeof agentExports.createSimpleAgent).toBe('function')
		})

		it('exports loadAgentTools function', () => {
			expect(agentExports.loadAgentTools).toBeDefined()
			expect(typeof agentExports.loadAgentTools).toBe('function')
		})
	})
})

describe('Export module structure', () => {
	it('exports expected number of items', () => {
		const exportKeys = Object.keys(agentExports)
		// Should have a reasonable number of exports (not too few, not excessive)
		expect(exportKeys.length).toBeGreaterThan(20)
		expect(exportKeys.length).toBeLessThan(100)
	})

	it('does not export undefined values', () => {
		for (const value of Object.values(agentExports)) {
			expect(value).toBeDefined()
		}
	})
})
