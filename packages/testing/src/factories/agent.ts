/**
 * Agent factory for creating test agent data.
 */

import { createId } from '@hare/db'
import type { AgentStatus } from '@hare/config'

/**
 * Agent config type matching the database schema.
 */
export interface AgentConfig {
	temperature?: number
	maxTokens?: number
	topP?: number
	topK?: number
	stopSequences?: string[]
}

/**
 * Agent data shape matching the database schema.
 */
export interface TestAgent {
	id: string
	workspaceId: string
	name: string
	description: string | null
	instructions: string | null
	model: string
	status: AgentStatus
	systemToolsEnabled: boolean
	config: AgentConfig | null
	createdBy: string
	createdAt: Date
	updatedAt: Date
}

/**
 * Agent version data shape matching the database schema.
 */
export interface TestAgentVersion {
	id: string
	agentId: string
	version: number
	instructions: string | null
	model: string
	config: AgentConfig | null
	toolIds: string[] | null
	createdAt: Date
	createdBy: string
}

export type TestAgentOverrides = Partial<TestAgent>
export type TestAgentVersionOverrides = Partial<TestAgentVersion>

let agentCounter = 0
let versionCounter = 0

/**
 * Creates a test agent with sensible defaults.
 *
 * @example
 * ```ts
 * // Create with required fields
 * const agent = createTestAgent({
 *   workspaceId: workspace.id,
 *   createdBy: user.id
 * })
 *
 * // Create a deployed agent
 * const deployedAgent = createTestAgent({
 *   workspaceId: workspace.id,
 *   createdBy: user.id,
 *   status: 'deployed'
 * })
 *
 * // Create with custom config
 * const customAgent = createTestAgent({
 *   workspaceId: workspace.id,
 *   createdBy: user.id,
 *   config: { temperature: 0.7, maxTokens: 1000 }
 * })
 * ```
 */
export function createTestAgent(
	overrides: TestAgentOverrides & { workspaceId: string; createdBy: string },
): TestAgent {
	agentCounter++
	const now = new Date()

	return {
		id: overrides.id ?? createId(),
		workspaceId: overrides.workspaceId,
		name: overrides.name ?? `Test Agent ${agentCounter}`,
		description: overrides.description ?? null,
		instructions: overrides.instructions ?? 'You are a helpful assistant.',
		model: overrides.model ?? '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
		status: overrides.status ?? 'draft',
		systemToolsEnabled: overrides.systemToolsEnabled ?? true,
		config: overrides.config ?? null,
		createdBy: overrides.createdBy,
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
	}
}

/**
 * Creates a test agent version.
 *
 * @example
 * ```ts
 * const version = createTestAgentVersion({
 *   agentId: agent.id,
 *   createdBy: user.id,
 *   version: 1
 * })
 * ```
 */
export function createTestAgentVersion(
	overrides: TestAgentVersionOverrides & {
		agentId: string
		createdBy: string
	},
): TestAgentVersion {
	versionCounter++
	const now = new Date()

	return {
		id: overrides.id ?? createId(),
		agentId: overrides.agentId,
		version: overrides.version ?? versionCounter,
		instructions: overrides.instructions ?? 'You are a helpful assistant.',
		model: overrides.model ?? '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
		config: overrides.config ?? null,
		toolIds: overrides.toolIds ?? null,
		createdAt: overrides.createdAt ?? now,
		createdBy: overrides.createdBy,
	}
}

/**
 * Creates multiple test agents at once.
 */
export function createTestAgents(
	count: number,
	overrides: TestAgentOverrides & { workspaceId: string; createdBy: string },
): TestAgent[] {
	return Array.from({ length: count }, () => createTestAgent(overrides))
}

/**
 * Reset the agent counters. Useful for test isolation.
 */
export function __resetAgentCounters(): void {
	agentCounter = 0
	versionCounter = 0
}
