/**
 * Type Inference Tests for oRPC Client
 *
 * These tests verify that the oRPC client types are properly inferred.
 * If any of these fail to compile, types are broken.
 */
import { describe, it, expect } from 'vitest'
import type { AppRouterClient } from '../client'

describe('oRPC Type Inference', () => {
	it('should have properly typed router keys', () => {
		// This test verifies that the router structure is correct
		type HasAgents = 'agents' extends keyof AppRouterClient ? true : false
		type HasBilling = 'billing' extends keyof AppRouterClient ? true : false
		type HasMemory = 'memory' extends keyof AppRouterClient ? true : false

		const hasAgents: HasAgents = true
		const hasBilling: HasBilling = true
		const hasMemory: HasMemory = true

		expect(hasAgents).toBe(true)
		expect(hasBilling).toBe(true)
		expect(hasMemory).toBe(true)
	})

	it('should have properly typed procedure methods', () => {
		// Verify agents has expected methods
		type AgentsMethods = keyof AppRouterClient['agents']
		type HasList = 'list' extends AgentsMethods ? true : false
		type HasGet = 'get' extends AgentsMethods ? true : false
		type HasCreate = 'create' extends AgentsMethods ? true : false

		const hasList: HasList = true
		const hasGet: HasGet = true
		const hasCreate: HasCreate = true

		expect(hasList).toBe(true)
		expect(hasGet).toBe(true)
		expect(hasCreate).toBe(true)
	})

	it('should infer return types with proper structure', () => {
		// Extract the list return type
		type ListProcedure = AppRouterClient['agents']['list']
		type ListReturn = ListProcedure extends (...args: any[]) => Promise<infer R> ? R : never

		// Verify it has 'agents' property
		type HasAgentsProperty = ListReturn extends { agents: any } ? true : false
		const hasAgentsProperty: HasAgentsProperty = true

		expect(hasAgentsProperty).toBe(true)
	})

	it('should infer agent properties correctly', () => {
		// Extract single agent type from the list response
		type ListProcedure = AppRouterClient['agents']['list']
		type ListReturn = ListProcedure extends (...args: any[]) => Promise<infer R> ? R : never
		type AgentsArray = ListReturn extends { agents: infer A } ? A : never
		type SingleAgent = AgentsArray extends (infer E)[] ? E : never

		// Verify agent has expected properties
		type HasId = SingleAgent extends { id: string } ? true : false
		type HasName = SingleAgent extends { name: string } ? true : false
		type HasModel = SingleAgent extends { model: string } ? true : false
		type HasInstructions = SingleAgent extends { instructions: string | null } ? true : false

		const hasId: HasId = true
		const hasName: HasName = true
		const hasModel: HasModel = true
		const hasInstructions: HasInstructions = true

		expect(hasId).toBe(true)
		expect(hasName).toBe(true)
		expect(hasModel).toBe(true)
		expect(hasInstructions).toBe(true)
	})

	it('should reject invalid property access at compile time', () => {
		// This should be 'never' because 'invalidKey' doesn't exist
		// @ts-expect-error - 'invalidKey' does not exist on AppRouterClient
		type InvalidAccess = AppRouterClient['invalidKey']

		// If this compiles without error, types are working
		expect(true).toBe(true)
	})
})
