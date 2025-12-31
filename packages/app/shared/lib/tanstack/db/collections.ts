/**
 * TanStack DB Collections
 *
 * Defines reactive collections for the main data entities.
 * Collections enable normalized data storage, live queries, and optimistic mutations.
 *
 * @see https://tanstack.com/db/latest/docs/collections/query-collection
 */

import type { Agent, Schedule, Tool, Workspace } from '@hare/types'
import type { QueryClient } from '@tanstack/react-query'
import { createCollection, type Collection } from '@tanstack/db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { api, handleResponse } from '../../../api/client'
import { agentKeys, scheduleKeys, toolKeys, workspaceKeys } from '../../../api/hooks/query-keys'

// =============================================================================
// Collection Types
// =============================================================================

export interface AgentRow extends Agent {
	_workspaceId: string
}

export interface ToolRow extends Tool {
	_workspaceId: string
}

export interface WorkspaceRow extends Workspace {}

export interface ScheduleRow extends Schedule {
	_workspaceId: string
}

// =============================================================================
// Agent Collection
// =============================================================================

/**
 * Create an agent collection scoped to a workspace.
 * Uses TanStack Query for data fetching and handles optimistic mutations.
 */
export function createAgentCollection(options: {
	workspaceId: string
	queryClient: QueryClient
}): Collection<AgentRow> {
	const { workspaceId, queryClient } = options

	const config = queryCollectionOptions({
		queryClient,
		queryKey: agentKeys.list(workspaceId),
		queryFn: async (): Promise<AgentRow[]> => {
			const res = await api.agents.$get({ query: { workspaceId } })
			const response = await handleResponse<{ agents: Agent[] }>(res)
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
					const { _workspaceId, ...data } = mutation.modified
					const res = await api.agents.$post({
						query: { workspaceId: _workspaceId },
						json: {
							name: data.name,
							description: data.description ?? undefined,
							model: data.model,
							instructions: data.instructions,
							config: data.config ?? undefined,
							systemToolsEnabled: data.systemToolsEnabled,
							toolIds: data.toolIds,
						},
					})
					await handleResponse(res)
				}
			}
		},

		onUpdate: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'update' && mutation.original && mutation.modified) {
					const { id, _workspaceId } = mutation.original
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
					const res = await api.agents[':id'].$patch({
						param: { id },
						query: { workspaceId: _workspaceId },
						json: {
							name,
							description: description ?? undefined,
							model,
							instructions,
							config: config ?? undefined,
							systemToolsEnabled,
							toolIds,
							status,
						},
					})
					await handleResponse(res)
				}
			}
		},

		onDelete: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'delete' && mutation.original) {
					const { id, _workspaceId } = mutation.original
					const res = await api.agents[':id'].$delete({
						param: { id },
						query: { workspaceId: _workspaceId },
					})
					await handleResponse(res)
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
export function createToolCollection(options: {
	workspaceId: string
	queryClient: QueryClient
}): Collection<ToolRow> {
	const { workspaceId, queryClient } = options

	const config = queryCollectionOptions({
		queryClient,
		queryKey: toolKeys.list(workspaceId),
		queryFn: async (): Promise<ToolRow[]> => {
			const res = await api.tools.$get({ query: { workspaceId } })
			const response = await handleResponse<{ tools: Tool[] }>(res)
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
					const { _workspaceId, ...data } = mutation.modified
					const res = await api.tools.$post({
						query: { workspaceId: _workspaceId },
						json: {
							name: data.name,
							description: data.description ?? undefined,
							type: data.type,
							inputSchema: data.inputSchema ?? undefined,
							config: data.config ?? undefined,
						},
					})
					await handleResponse(res)
				}
			}
		},

		onUpdate: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'update' && mutation.original && mutation.modified) {
					const { id, _workspaceId } = mutation.original
					const { name, description, type, inputSchema, config } = mutation.modified
					const res = await api.tools[':id'].$patch({
						param: { id },
						query: { workspaceId: _workspaceId },
						json: {
							name,
							description: description ?? undefined,
							type,
							inputSchema: inputSchema ?? undefined,
							config: config ?? undefined,
						},
					})
					await handleResponse(res)
				}
			}
		},

		onDelete: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'delete' && mutation.original) {
					const { id, _workspaceId } = mutation.original
					const res = await api.tools[':id'].$delete({
						param: { id },
						query: { workspaceId: _workspaceId },
					})
					await handleResponse(res)
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
export function createWorkspaceCollection(options: {
	queryClient: QueryClient
}): Collection<WorkspaceRow> {
	const { queryClient } = options

	const config = queryCollectionOptions({
		queryClient,
		queryKey: workspaceKeys.list(),
		queryFn: async (): Promise<WorkspaceRow[]> => {
			const res = await api.workspaces.$get()
			const response = await handleResponse<{ workspaces: Workspace[] }>(res)
			return response.workspaces
		},
		getKey: (workspace) => workspace.id,

		onInsert: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'insert' && mutation.modified) {
					const { name, description, slug } = mutation.modified
					const res = await api.workspaces.$post({
						json: {
							name,
							description: description ?? undefined,
							slug,
						},
					})
					await handleResponse(res)
				}
			}
		},

		onUpdate: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'update' && mutation.original && mutation.modified) {
					const { id } = mutation.original
					const { name, description } = mutation.modified
					const res = await api.workspaces[':id'].$patch({
						param: { id },
						json: {
							name,
							description: description ?? undefined,
						},
					})
					await handleResponse(res)
				}
			}
		},

		onDelete: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'delete' && mutation.original) {
					const { id } = mutation.original
					const res = await api.workspaces[':id'].$delete({ param: { id } })
					await handleResponse(res)
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
}): Collection<ScheduleRow> {
	const { agentId, workspaceId, queryClient } = options

	const config = queryCollectionOptions({
		queryClient,
		queryKey: scheduleKeys.list(agentId, workspaceId),
		queryFn: async (): Promise<ScheduleRow[]> => {
			const res = await api.agents[':id'].schedules.$get({
				param: { id: agentId },
				query: { workspaceId },
			})
			const response = await handleResponse<{ schedules: Schedule[] }>(res)
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
					const { agentId: aId, _workspaceId, type, executeAt, cron, action, payload } =
						mutation.modified
					const res = await api.agents[':id'].schedules.$post({
						param: { id: aId },
						query: { workspaceId: _workspaceId },
						json: {
							type,
							executeAt: executeAt ?? undefined,
							cron: cron ?? undefined,
							action,
							payload: payload ?? undefined,
						},
					})
					await handleResponse(res)
				}
			}
		},

		onUpdate: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'update' && mutation.original && mutation.modified) {
					const { id, agentId: aId, _workspaceId } = mutation.original
					const { status, executeAt, cron, payload } = mutation.modified
					const res = await api.agents[':id'].schedules[':scheduleId'].$patch({
						param: { id: aId, scheduleId: id },
						query: { workspaceId: _workspaceId },
						json: {
							status,
							executeAt: executeAt ?? undefined,
							cron: cron ?? undefined,
							payload: payload ?? undefined,
						},
					})
					await handleResponse(res)
				}
			}
		},

		onDelete: async ({ transaction }) => {
			const mutations = transaction.mutations
			for (const mutation of mutations) {
				if (mutation.type === 'delete' && mutation.original) {
					const { id, agentId: aId, _workspaceId } = mutation.original
					const res = await api.agents[':id'].schedules[':scheduleId'].$delete({
						param: { id: aId, scheduleId: id },
						query: { workspaceId: _workspaceId },
					})
					await handleResponse(res)
				}
			}
		},
	})

	return createCollection(config)
}
