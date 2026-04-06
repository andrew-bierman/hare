/**
 * Type Inference Tests for oRPC Client (API Package Level)
 *
 * These tests verify that the oRPC client types are properly inferred
 * when imported directly from the api package.
 *
 * If any of these fail to compile, types are broken.
 */
import { describe, expect, it } from 'vitest'
import { type AppRouterClient, orpc } from '../client'

// Type utility to check if a type is NOT 'any'
// Returns true if T is a specific type, false if T is 'any'
type IsNotAny<T> = 0 extends 1 & T ? false : true

// Type utility to assert a type is true at compile time
type AssertTrue<T extends true> = T

describe('oRPC Type Inference (API Package Level)', () => {
	describe('Client Export Types', () => {
		it('should export orpc client that is not typed as any', () => {
			// This is the critical test - orpc should NOT be 'any'
			type OrpcIsNotAny = IsNotAny<typeof orpc>
			type _assert = AssertTrue<OrpcIsNotAny>

			// Runtime check that orpc exists
			expect(orpc).toBeDefined()
		})

		it('should have properly typed router keys', () => {
			type HasAgents = 'agents' extends keyof AppRouterClient ? true : false
			type HasBilling = 'billing' extends keyof AppRouterClient ? true : false
			type HasMemory = 'memory' extends keyof AppRouterClient ? true : false
			type HasTools = 'tools' extends keyof AppRouterClient ? true : false
			type HasWorkspaces = 'workspaces' extends keyof AppRouterClient ? true : false

			const hasAgents: HasAgents = true
			const hasBilling: HasBilling = true
			const hasMemory: HasMemory = true
			const hasTools: HasTools = true
			const hasWorkspaces: HasWorkspaces = true

			expect(hasAgents).toBe(true)
			expect(hasBilling).toBe(true)
			expect(hasMemory).toBe(true)
			expect(hasTools).toBe(true)
			expect(hasWorkspaces).toBe(true)
		})
	})

	describe('Agents Router Types', () => {
		it('should have properly typed procedure methods', () => {
			type AgentsMethods = keyof AppRouterClient['agents']
			type HasList = 'list' extends AgentsMethods ? true : false
			type HasGet = 'get' extends AgentsMethods ? true : false
			type HasCreate = 'create' extends AgentsMethods ? true : false
			type HasUpdate = 'update' extends AgentsMethods ? true : false
			type HasDelete = 'delete' extends AgentsMethods ? true : false

			const hasList: HasList = true
			const hasGet: HasGet = true
			const hasCreate: HasCreate = true
			const hasUpdate: HasUpdate = true
			const hasDelete: HasDelete = true

			expect(hasList).toBe(true)
			expect(hasGet).toBe(true)
			expect(hasCreate).toBe(true)
			expect(hasUpdate).toBe(true)
			expect(hasDelete).toBe(true)
		})

		it('should infer list return type with proper structure', () => {
			type ListProcedure = AppRouterClient['agents']['list']
			type ListReturn = ListProcedure extends (...args: any[]) => Promise<infer R> ? R : never

			// Verify it has 'agents' property
			type HasAgentsProperty = ListReturn extends { agents: any } ? true : false
			const hasAgentsProperty: HasAgentsProperty = true

			expect(hasAgentsProperty).toBe(true)
		})

		it('should infer agent properties correctly', () => {
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
	})

	describe('Tools Router Types', () => {
		it('should have properly typed tools methods', () => {
			type ToolsMethods = keyof AppRouterClient['tools']
			type HasList = 'list' extends ToolsMethods ? true : false
			type HasGet = 'get' extends ToolsMethods ? true : false
			type HasCreate = 'create' extends ToolsMethods ? true : false

			const hasList: HasList = true
			const hasGet: HasGet = true
			const hasCreate: HasCreate = true

			expect(hasList).toBe(true)
			expect(hasGet).toBe(true)
			expect(hasCreate).toBe(true)
		})
	})

	describe('Type Safety', () => {
		it('should reject invalid property access at compile time', () => {
			// @ts-expect-error - 'invalidKey' does not exist on AppRouterClient
			type _InvalidAccess = AppRouterClient['invalidKey']

			expect(true).toBe(true)
		})

		it('should reject invalid agent router methods', () => {
			// @ts-expect-error - 'nonExistentMethod' does not exist
			type _InvalidMethod = AppRouterClient['agents']['nonExistentMethod']

			expect(true).toBe(true)
		})
	})
})
