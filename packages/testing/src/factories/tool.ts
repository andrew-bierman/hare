/**
 * Tool factory for creating test tool data.
 */

import { createId } from '@hare/db'
import type { ToolType } from '@hare/config'

/**
 * Tool input schema type matching the database schema.
 */
export interface ToolInputSchema {
	type: 'object'
	properties?: Record<
		string,
		{
			type: 'string' | 'number' | 'boolean' | 'array' | 'object'
			description?: string
			default?: unknown
			enum?: string[]
			required?: boolean
		}
	>
	required?: string[]
}

/**
 * Tool config type matching the database schema.
 */
export interface ToolConfig {
	url?: string
	method?: string
	headers?: Record<string, string>
	body?: string
	bodyType?: 'json' | 'form' | 'text'
	responseMapping?: {
		path?: string
		transform?: string
	}
	timeout?: number
	query?: string
	database?: string
	searchEngine?: string
	webhookUrl?: string
	apiKey?: string
	apiEndpoint?: string
	channel?: string
	from?: string
	customCode?: string
}

/**
 * Tool data shape matching the database schema.
 */
export interface TestTool {
	id: string
	workspaceId: string
	name: string
	description: string | null
	type: ToolType
	inputSchema: ToolInputSchema | null
	config: ToolConfig | null
	createdBy: string
	createdAt: Date
	updatedAt: Date
}

/**
 * Agent-tool junction data shape.
 */
export interface TestAgentTool {
	id: string
	agentId: string
	toolId: string
	createdAt: Date
}

export type TestToolOverrides = Partial<TestTool>
export type TestAgentToolOverrides = Partial<TestAgentTool>

let toolCounter = 0

/**
 * Creates a test tool with sensible defaults.
 *
 * @example
 * ```ts
 * // Create an HTTP tool
 * const httpTool = createTestTool({
 *   workspaceId: workspace.id,
 *   createdBy: user.id,
 *   type: 'http',
 *   config: { url: 'https://api.example.com', method: 'GET' }
 * })
 *
 * // Create a custom tool
 * const customTool = createTestTool({
 *   workspaceId: workspace.id,
 *   createdBy: user.id,
 *   type: 'custom',
 *   config: { customCode: 'return { result: "hello" }' }
 * })
 * ```
 */
export function createTestTool(
	overrides: TestToolOverrides & { workspaceId: string; createdBy: string },
): TestTool {
	toolCounter++
	const now = new Date()

	return {
		id: overrides.id ?? createId(),
		workspaceId: overrides.workspaceId,
		name: overrides.name ?? `Test Tool ${toolCounter}`,
		description: overrides.description ?? null,
		type: overrides.type ?? 'http',
		inputSchema: overrides.inputSchema ?? null,
		config: overrides.config ?? null,
		createdBy: overrides.createdBy,
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
	}
}

/**
 * Creates a test HTTP tool with common defaults.
 */
export function createTestHttpTool(
	overrides: TestToolOverrides & { workspaceId: string; createdBy: string },
): TestTool {
	return createTestTool({
		...overrides,
		type: 'http',
		config: {
			url: 'https://api.example.com/endpoint',
			method: 'GET',
			headers: {},
			...overrides.config,
		},
		inputSchema: overrides.inputSchema ?? {
			type: 'object',
			properties: {
				query: { type: 'string', description: 'Search query' },
			},
		},
	})
}

/**
 * Creates a test custom tool.
 */
export function createTestCustomTool(
	overrides: TestToolOverrides & { workspaceId: string; createdBy: string },
): TestTool {
	return createTestTool({
		...overrides,
		type: 'custom',
		config: {
			customCode: 'return { result: params.input }',
			...overrides.config,
		},
		inputSchema: overrides.inputSchema ?? {
			type: 'object',
			properties: {
				input: { type: 'string', description: 'Input value' },
			},
			required: ['input'],
		},
	})
}

/**
 * Creates an agent-tool junction record.
 *
 * @example
 * ```ts
 * const agentTool = createTestAgentTool({
 *   agentId: agent.id,
 *   toolId: tool.id
 * })
 * ```
 */
export function createTestAgentTool(
	overrides: TestAgentToolOverrides & { agentId: string; toolId: string },
): TestAgentTool {
	const now = new Date()

	return {
		id: overrides.id ?? createId(),
		agentId: overrides.agentId,
		toolId: overrides.toolId,
		createdAt: overrides.createdAt ?? now,
	}
}

/**
 * Creates multiple test tools at once.
 */
export function createTestTools(
	count: number,
	overrides: TestToolOverrides & { workspaceId: string; createdBy: string },
): TestTool[] {
	return Array.from({ length: count }, () => createTestTool(overrides))
}

/**
 * Reset the tool counter. Useful for test isolation.
 */
export function __resetToolCounter(): void {
	toolCounter = 0
}
