/**
 * TanStack DB Collections
 *
 * Defines reactive collections for the main data entities.
 * Collections enable normalized data storage, live queries, and optimistic mutations.
 *
 * @see https://tanstack.com/db/latest/docs/collections/query-collection
 */

import { orpc } from '@hare/api'
// Types are inferred from API responses for proper compatibility
import type { Schedule } from '@hare/types'
import { createCollection } from '@tanstack/db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import type { QueryClient } from '@tanstack/react-query'
import { agentKeys, scheduleKeys, toolKeys, workspaceKeys } from '../../../api/hooks/query-keys'

// =============================================================================
// Collection Types
// =============================================================================

// Use inferred types from oRPC responses for proper compatibility
type ApiAgentsResponse = Awaited<ReturnType<typeof orpc.agents.list>>
type ApiAgent = ApiAgentsResponse['agents'][number]

type ApiToolsResponse = Awaited<ReturnType<typeof orpc.tools.list>>
type ApiTool = ApiToolsResponse['tools'][number]

type ApiWorkspacesResponse = Awaited<ReturnType<typeof orpc.workspaces.list>>
type ApiWorkspace = ApiWorkspacesResponse['workspaces'][number]

export type AgentRow = ApiAgent & {
	_workspaceId: string
}

export type ToolRow = ApiTool & {
	_workspaceId: string
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
			const response = await orpc.agents.list({})
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
					await orpc.agents.create({
						name: data.name,
						description: data.description ?? undefined,
						model: data.model,
						instructions: data.instructions ?? '',
						config: data.config ?? undefined,
						systemToolsEnabled: data.systemToolsEnabled,
						toolIds: data.toolIds,
					})
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
					await orpc.agents.update({
						id,
						name,
						description: description ?? undefined,
						model,
						instructions: instructions ?? undefined,
						config: config ?? undefined,
						systemToolsEnabled,
						toolIds,
						status,
					})
				}
			}
		},

		onDelete: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'delete' && mutation.original) {
					const { id } = mutation.original
					await orpc.agents.delete({ id })
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
			const response = await orpc.tools.list({})
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
					await orpc.tools.create({
						name: data.name,
						description: data.description ?? data.name,
						type: data.type,
						inputSchema: data.inputSchema ?? undefined,
						config: data.config ?? undefined,
					})
				}
			}
		},

		onUpdate: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'update' && mutation.original && mutation.modified) {
					const { id } = mutation.original
					const { name, description, type, inputSchema, config } = mutation.modified
					await orpc.tools.update({
						id,
						name,
						description: description ?? undefined,
						type,
						inputSchema: inputSchema ?? undefined,
						config: config ?? undefined,
					})
				}
			}
		},

		onDelete: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'delete' && mutation.original) {
					const { id } = mutation.original
					await orpc.tools.delete({ id })
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
			const response = await orpc.workspaces.list({})
			return response.workspaces
		},
		getKey: (workspace) => workspace.id,

		onInsert: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'insert' && mutation.modified) {
					const { name, slug, description } = mutation.modified
					await orpc.workspaces.create({
						name,
						slug,
						description: description ?? undefined,
					})
				}
			}
		},

		onUpdate: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'update' && mutation.original && mutation.modified) {
					const { id } = mutation.original
					const { name, description } = mutation.modified
					await orpc.workspaces.update({
						id,
						name,
						description: description ?? undefined,
					})
				}
			}
		},

		onDelete: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'delete' && mutation.original) {
					const { id } = mutation.original
					await orpc.workspaces.delete({ id })
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
			const response = await orpc.schedules.list({ agentId })
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
					await orpc.schedules.create({
						agentId: aId,
						type,
						executeAt: executeAt ?? undefined,
						cron: cron ?? undefined,
						action,
						payload: payload ?? undefined,
					})
				}
			}
		},

		onUpdate: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'update' && mutation.original && mutation.modified) {
					const { id } = mutation.original
					const { status, executeAt, cron, payload } = mutation.modified
					await orpc.schedules.update({
						id,
						status,
						executeAt: executeAt ?? undefined,
						cron: cron ?? undefined,
						payload: payload ?? undefined,
					})
				}
			}
		},

		onDelete: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'delete' && mutation.original) {
					const { id } = mutation.original
					await orpc.schedules.delete({ id })
				}
			}
		},
	})

	return createCollection(config)
}
