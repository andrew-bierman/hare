/**
 * TanStack DB Collections
 *
 * Defines reactive collections for the main data entities.
 * Collections enable normalized data storage, live queries, and optimistic mutations.
 *
 * @see https://tanstack.com/db/latest/docs/collections/query-collection
 */

import { client } from '@hare/api/client'
import type { ToolType } from '@hare/config'
import type { Schedule } from '@hare/types'

// Helper to unwrap Eden Treaty response
async function unwrap<T>(promise: Promise<{ data: T | null; error: unknown }>): Promise<T> {
	const { data, error } = await promise
	if (error) throw error
	return data as T
}

import { createCollection } from '@tanstack/db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import type { QueryClient } from '@tanstack/react-query'
import { agentKeys, scheduleKeys, toolKeys, workspaceKeys } from '../../../api/hooks/query-keys'

// =============================================================================
// Collection Types
// =============================================================================

// Types from API responses — must match Elysia serialization
interface ApiAgent {
	id: string
	workspaceId: string
	name: string
	description: string | null
	model: string
	instructions: string | null
	config?: Record<string, unknown> | null
	status: 'draft' | 'deployed' | 'archived'
	systemToolsEnabled: boolean
	toolIds?: string[]
	createdAt: string
	updatedAt: string
}

interface ApiTool {
	id: string
	workspaceId: string
	name: string
	description: string | null
	type: string
	config?: Record<string, unknown>
	inputSchema?: Record<string, unknown> | null
	isSystem: boolean
	createdAt: string
	updatedAt: string
}

interface ApiWorkspace {
	id: string
	name: string
	slug: string
	description: string | null
	createdAt: string
	updatedAt: string
}

export type AgentRow = ApiAgent & {
	_workspaceId: string
	[key: string]: unknown
}

export type ToolRow = ApiTool & {
	_workspaceId: string
	[key: string]: unknown
}

export type WorkspaceRow = ApiWorkspace

export type ScheduleRow = Schedule & {
	_workspaceId: string
}

// Collection type aliases for use in provider
export type AgentCollection = ReturnType<typeof createAgentCollection>
export type ToolCollection = ReturnType<typeof createToolCollection>
export type WorkspaceCollection = ReturnType<typeof createWorkspaceCollection>
export type ScheduleCollection = ReturnType<typeof createScheduleCollection>

// =============================================================================
// Agent Collection
// =============================================================================

/**
 * Create an agent collection scoped to a workspace.
 * Uses TanStack Query for data fetching and handles optimistic mutations.
 */
export function createAgentCollection(options: { workspaceId: string; queryClient: QueryClient }) {
	const { workspaceId, queryClient } = options

	const config = queryCollectionOptions({
		queryClient,
		queryKey: agentKeys.list(workspaceId),
		queryFn: async (): Promise<AgentRow[]> => {
			const response = await unwrap(client.api.agents.get())
			return response.agents.map((agent) => ({
				...agent,
				_workspaceId: workspaceId,
			}))
		},
		getKey: (agent) => agent.id,

		onInsert: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'insert' && mutation.modified) {
					const { _workspaceId: _, ...data } = mutation.modified
					await unwrap(
						client.api.agents.post({
							name: data.name,
							description: data.description ?? undefined,
							model: data.model,
							instructions: data.instructions ?? '',
							config: data.config ?? undefined,
							systemToolsEnabled: data.systemToolsEnabled,
							toolIds: data.toolIds,
						}),
					)
				}
			}
		},

		onUpdate: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'update' && mutation.original && mutation.modified) {
					const { id } = mutation.original
					const {
						name,
						description,
						model,
						instructions,
						config,
						systemToolsEnabled,
						toolIds,
						status,
					} = mutation.modified
					await unwrap(
						client.api.agents({ id }).patch({
							name,
							description: description ?? undefined,
							model,
							instructions: instructions ?? undefined,
							config: (config ?? undefined) as Record<string, unknown> | undefined,
							systemToolsEnabled,
							toolIds,
							status,
						}),
					)
				}
			}
		},

		onDelete: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'delete' && mutation.original) {
					const { id } = mutation.original
					await unwrap(client.api.agents({ id }).delete())
				}
			}
		},
	})

	return createCollection(config)
}

// =============================================================================
// Tool Collection
// =============================================================================

/**
 * Create a tool collection scoped to a workspace.
 */
export function createToolCollection(options: { workspaceId: string; queryClient: QueryClient }) {
	const { workspaceId, queryClient } = options

	const config = queryCollectionOptions({
		queryClient,
		queryKey: toolKeys.list(workspaceId),
		queryFn: async (): Promise<ToolRow[]> => {
			const response = await unwrap(client.api.tools.get())
			return response.tools.map((tool) => ({
				...tool,
				_workspaceId: workspaceId,
			}))
		},
		getKey: (tool) => tool.id,

		onInsert: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'insert' && mutation.modified) {
					const { _workspaceId: _, ...data } = mutation.modified
					await unwrap(
						client.api.tools.post({
							name: data.name,
							description: data.description ?? data.name,
							type: data.type as ToolType,
							inputSchema: data.inputSchema ?? undefined,
							config: data.config ?? undefined,
						}),
					)
				}
			}
		},

		onUpdate: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'update' && mutation.original && mutation.modified) {
					const { id } = mutation.original
					const { name, description, inputSchema, config } = mutation.modified
					await unwrap(
						client.api.tools({ id }).patch({
							name,
							description: description ?? undefined,
							type: mutation.modified.type as ToolType,
							inputSchema: (inputSchema ?? undefined) as Record<string, unknown> | undefined,
							config: (config ?? undefined) as Record<string, unknown> | undefined,
						}),
					)
				}
			}
		},

		onDelete: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'delete' && mutation.original) {
					const { id } = mutation.original
					await unwrap(client.api.tools({ id }).delete())
				}
			}
		},
	})

	return createCollection(config)
}

// =============================================================================
// Workspace Collection
// =============================================================================

/**
 * Create a workspace collection for the current user.
 */
export function createWorkspaceCollection(options: { queryClient: QueryClient }) {
	const { queryClient } = options

	const config = queryCollectionOptions({
		queryClient,
		queryKey: workspaceKeys.list(),
		queryFn: async (): Promise<WorkspaceRow[]> => {
			const response = await unwrap(client.api.workspaces.get())
			return response.workspaces
		},
		getKey: (workspace) => workspace.id,

		onInsert: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'insert' && mutation.modified) {
					const { name, slug, description } = mutation.modified
					await unwrap(
						client.api.workspaces.post({
							name,
							slug,
							description: description ?? undefined,
						}),
					)
				}
			}
		},

		onUpdate: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'update' && mutation.original && mutation.modified) {
					const { id } = mutation.original
					const { name, description } = mutation.modified
					await unwrap(
						client.api.workspaces({ id }).patch({
							name,
							description: description ?? undefined,
						}),
					)
				}
			}
		},

		onDelete: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'delete' && mutation.original) {
					const { id } = mutation.original
					await unwrap(client.api.workspaces({ id }).delete())
				}
			}
		},
	})

	return createCollection(config)
}

// =============================================================================
// Schedule Collection
// =============================================================================

/**
 * Create a schedule collection scoped to an agent.
 */
export function createScheduleCollection(options: {
	agentId: string
	workspaceId: string
	queryClient: QueryClient
}) {
	const { agentId, workspaceId, queryClient } = options

	const config = queryCollectionOptions({
		queryClient,
		queryKey: scheduleKeys.list(agentId, workspaceId),
		queryFn: async (): Promise<ScheduleRow[]> => {
			const response = await unwrap(client.api.schedules.get({ query: { agentId } }))
			return response.schedules.map((schedule) => ({
				...schedule,
				_workspaceId: workspaceId,
			}))
		},
		getKey: (schedule) => schedule.id,

		onInsert: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'insert' && mutation.modified) {
					const {
						agentId: aId,
						_workspaceId: _,
						type,
						executeAt,
						cron,
						action,
						payload,
					} = mutation.modified
					await unwrap(
						client.api.schedules.post({
							agentId: aId,
							type,
							executeAt: executeAt ?? undefined,
							cron: cron ?? undefined,
							action,
							payload: payload ?? undefined,
						}),
					)
				}
			}
		},

		onUpdate: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'update' && mutation.original && mutation.modified) {
					const { id } = mutation.original
					const { status, executeAt, cron, payload } = mutation.modified
					await unwrap(
						client.api.schedules({ id }).patch({
							status,
							executeAt: executeAt ?? undefined,
							cron: cron ?? undefined,
							payload: payload ?? undefined,
						}),
					)
				}
			}
		},

		onDelete: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'delete' && mutation.original) {
					const { id } = mutation.original
					await unwrap(client.api.schedules({ id }).delete())
				}
			}
		},
	})

	return createCollection(config)
}
