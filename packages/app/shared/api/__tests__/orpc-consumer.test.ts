/**
 * Type Inference Tests for oRPC Client (Consumer Level)
 *
 * These tests verify that the oRPC client types are properly inferred
 * when imported from @hare/api as a consumer package would.
 *
 * This is the critical test - if types work here, they work for all consumers.
 * If any of these fail to compile, the end-to-end type safety is broken.
 */

import { type AppRouterClient, orpc } from '@hare/api'
import { describe, expect, it } from 'vitest'

// Type utility to check if a type is NOT 'any'
// Returns true if T is a specific type, false if T is 'any'
type IsNotAny<T> = 0 extends 1 & T ? false : true

// Type utility to assert a type is true at compile time
type AssertTrue<T extends true> = T

describe('oRPC Type Inference (Consumer Level - @hare/api)', () => {
	describe('Cross-Package Type Inference', () => {
		it('should export orpc client that is not typed as any', () => {
			// CRITICAL: This is the main regression test for the 'any' type bug
			// If this fails, createORPCClient is not being called with the generic
			type OrpcIsNotAny = IsNotAny<typeof orpc>
			type _assert = AssertTrue<OrpcIsNotAny>

			expect(orpc).toBeDefined()
		})

		it('should have agents router that is not typed as any', () => {
			type AgentsIsNotAny = IsNotAny<typeof orpc.agents>
			type _assert = AssertTrue<AgentsIsNotAny>

			expect(orpc.agents).toBeDefined()
		})

		it('should have agents.list that is not typed as any', () => {
			type ListIsNotAny = IsNotAny<typeof orpc.agents.list>
			type _assert = AssertTrue<ListIsNotAny>

			expect(orpc.agents.list).toBeDefined()
		})
	})

	describe('Router Structure', () => {
		it('should have all expected router keys', () => {
			type RouterKeys = keyof typeof orpc
			type HasAgents = 'agents' extends RouterKeys ? true : false
			type HasTools = 'tools' extends RouterKeys ? true : false
			type HasWorkspaces = 'workspaces' extends RouterKeys ? true : false
			type HasBilling = 'billing' extends RouterKeys ? true : false
			type HasMemory = 'memory' extends RouterKeys ? true : false
			type HasChat = 'chat' extends RouterKeys ? true : false

			const checks = {
				hasAgents: true as HasAgents,
				hasTools: true as HasTools,
				hasWorkspaces: true as HasWorkspaces,
				hasBilling: true as HasBilling,
				hasMemory: true as HasMemory,
				hasChat: true as HasChat,
			}

			expect(Object.values(checks).every(Boolean)).toBe(true)
		})
	})

	describe('Agents CRUD Operations', () => {
		it('should have typed list procedure', () => {
			type ListProcedure = typeof orpc.agents.list
			type ListIsFunction = ListProcedure extends (...args: any[]) => any ? true : false
			type _assert = AssertTrue<ListIsFunction>

			expect(typeof orpc.agents.list).toBe('function')
		})

		it('should have typed get procedure', () => {
			type GetProcedure = typeof orpc.agents.get
			type GetIsFunction = GetProcedure extends (...args: any[]) => any ? true : false
			type _assert = AssertTrue<GetIsFunction>

			expect(typeof orpc.agents.get).toBe('function')
		})

		it('should have typed create procedure', () => {
			type CreateProcedure = typeof orpc.agents.create
			type CreateIsFunction = CreateProcedure extends (...args: any[]) => any ? true : false
			type _assert = AssertTrue<CreateIsFunction>

			expect(typeof orpc.agents.create).toBe('function')
		})

		it('should have typed update procedure', () => {
			type UpdateProcedure = typeof orpc.agents.update
			type UpdateIsFunction = UpdateProcedure extends (...args: any[]) => any ? true : false
			type _assert = AssertTrue<UpdateIsFunction>

			expect(typeof orpc.agents.update).toBe('function')
		})

		it('should have typed delete procedure', () => {
			type DeleteProcedure = typeof orpc.agents.delete
			type DeleteIsFunction = DeleteProcedure extends (...args: any[]) => any ? true : false
			type _assert = AssertTrue<DeleteIsFunction>

			expect(typeof orpc.agents.delete).toBe('function')
		})
	})

	describe('Return Type Inference', () => {
		it('should infer agents list return type', () => {
			type ListReturn = Awaited<ReturnType<typeof orpc.agents.list>>
			type HasAgentsArray = ListReturn extends { agents: any[] } ? true : false
			type _assert = AssertTrue<HasAgentsArray>

			expect(true).toBe(true)
		})

		it('should infer agent properties from list', () => {
			type ListReturn = Awaited<ReturnType<typeof orpc.agents.list>>
			type AgentsArray = ListReturn extends { agents: infer A } ? A : never
			type Agent = AgentsArray extends (infer E)[] ? E : never

			// These should all be true if types are properly inferred
			type HasId = Agent extends { id: string } ? true : false
			type HasName = Agent extends { name: string } ? true : false
			type HasModel = Agent extends { model: string } ? true : false

			const checks = {
				hasId: true as HasId,
				hasName: true as HasName,
				hasModel: true as HasModel,
			}

			expect(Object.values(checks).every(Boolean)).toBe(true)
		})
	})

	describe('Input Type Inference', () => {
		it('should infer create input type', () => {
			type CreateProcedure = typeof orpc.agents.create
			type CreateInput = CreateProcedure extends (input: infer I) => any ? I : never

			// Create input should require name, model, instructions
			type HasNameInput = CreateInput extends { name: string } ? true : false
			type HasModelInput = CreateInput extends { model: string } ? true : false

			const hasName: HasNameInput = true
			const hasModel: HasModelInput = true

			expect(hasName).toBe(true)
			expect(hasModel).toBe(true)
		})
	})

	describe('AppRouterClient Type Export', () => {
		it('should export AppRouterClient type that matches orpc', () => {
			// Verify the exported type matches the client
			type ClientMatchesExport = typeof orpc extends AppRouterClient ? true : false
			type _assert = AssertTrue<ClientMatchesExport>

			expect(true).toBe(true)
		})
	})

	describe('Type Safety Guardrails', () => {
		it('should reject invalid router access at compile time', () => {
			// @ts-expect-error - 'invalidRouter' does not exist
			type _Invalid = typeof orpc.invalidRouter

			expect(true).toBe(true)
		})

		it('should reject invalid procedure access at compile time', () => {
			// @ts-expect-error - 'invalidProcedure' does not exist on agents
			type _Invalid = typeof orpc.agents.invalidProcedure

			expect(true).toBe(true)
		})
	})
})
