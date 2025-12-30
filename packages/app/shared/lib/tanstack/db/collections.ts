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
import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { apiClient } from '../../../api/client'
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
export function createAgentCollection(options: { workspaceId: string; queryClient: QueryClient }) {
	const { workspaceId, queryClient } = options

	return createCollection(
		queryCollectionOptions<AgentRow, string>({
			queryClient,
			queryKey: agentKeys.list(workspaceId),
			queryFn: async () => {
				const response = await apiClient.agents.list(workspaceId)
				return response.agents.map((agent) => ({
					...agent,
					_workspaceId: workspaceId,
				})) as AgentRow[]
			},
			getKey: (agent: AgentRow) => agent.id,

			onInsert: async ({ transaction }) => {
				const mutations = transaction.mutations
				for (const mutation of mutations) {
					if (mutation.type === 'insert' && mutation.modified) {
						const modified = mutation.modified as AgentRow
						const { _workspaceId, ...data } = modified
						await apiClient.agents.create(_workspaceId, {
							name: data.name,
							description: data.description ?? undefined,
							model: data.model,
							instructions: data.instructions,
							config: data.config ?? undefined,
							toolIds: data.toolIds,
						})
					}
				}
			},

			onUpdate: async ({ transaction }) => {
				const mutations = transaction.mutations
				for (const mutation of mutations) {
					if (mutation.type === 'update' && mutation.original && mutation.modified) {
						const original = mutation.original as AgentRow
						const modified = mutation.modified as AgentRow
						const { id, _workspaceId } = original
						const { name, description, model, instructions, config, toolIds, status } = modified
						await apiClient.agents.update(id, _workspaceId, {
							name,
							description: description ?? undefined,
							model,
							instructions,
							config: config ?? undefined,
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
						const original = mutation.original as AgentRow
						const { id, _workspaceId } = original
						await apiClient.agents.delete(id, _workspaceId)
					}
				}
			},
		}),
	)
}

// =============================================================================
// Tool Collection
// =============================================================================

/**
 * Create a tool collection scoped to a workspace.
 */
export function createToolCollection(options: { workspaceId: string; queryClient: QueryClient }) {
	const { workspaceId, queryClient } = options

	return createCollection(
		queryCollectionOptions<ToolRow, string>({
			queryClient,
			queryKey: toolKeys.list(workspaceId),
			queryFn: async () => {
				const response = await apiClient.tools.list(workspaceId)
				return response.tools.map((tool) => ({
					...tool,
					_workspaceId: workspaceId,
				})) as ToolRow[]
			},
			getKey: (tool: ToolRow) => tool.id,

			onInsert: async ({ transaction }) => {
				const mutations = transaction.mutations
				for (const mutation of mutations) {
					if (mutation.type === 'insert' && mutation.modified) {
						const modified = mutation.modified as ToolRow
						const { _workspaceId, ...data } = modified
						await apiClient.tools.create(_workspaceId, {
							name: data.name,
							description: data.description ?? undefined,
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
						const original = mutation.original as ToolRow
						const modified = mutation.modified as ToolRow
						const { id, _workspaceId } = original
						const { name, description, type, inputSchema, config } = modified
						await apiClient.tools.update(id, _workspaceId, {
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
						const original = mutation.original as ToolRow
						const { id, _workspaceId } = original
						await apiClient.tools.delete(id, _workspaceId)
					}
				}
			},
		}),
	)
}

// =============================================================================
// Workspace Collection
// =============================================================================

/**
 * Create a workspace collection for the current user.
 */
export function createWorkspaceCollection(options: { queryClient: QueryClient }) {
	const { queryClient } = options

	return createCollection(
		queryCollectionOptions<WorkspaceRow, string>({
			queryClient,
			queryKey: workspaceKeys.list(),
			queryFn: async () => {
				const response = await apiClient.workspaces.list()
				return response.workspaces as WorkspaceRow[]
			},
			getKey: (workspace: WorkspaceRow) => workspace.id,

			onInsert: async ({ transaction }) => {
				const mutations = transaction.mutations
				for (const mutation of mutations) {
					if (mutation.type === 'insert' && mutation.modified) {
						const modified = mutation.modified as WorkspaceRow
						const { name, description, slug } = modified
						await apiClient.workspaces.create({
							name,
							description: description ?? undefined,
							slug,
						})
					}
				}
			},

			onUpdate: async ({ transaction }) => {
				const mutations = transaction.mutations
				for (const mutation of mutations) {
					if (mutation.type === 'update' && mutation.original && mutation.modified) {
						const original = mutation.original as WorkspaceRow
						const modified = mutation.modified as WorkspaceRow
						const { id } = original
						const { name, description } = modified
						await apiClient.workspaces.update(id, {
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
						const original = mutation.original as WorkspaceRow
						const { id } = original
						await apiClient.workspaces.delete(id)
					}
				}
			},
		}),
	)
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

	return createCollection(
		queryCollectionOptions<ScheduleRow, string>({
			queryClient,
			queryKey: scheduleKeys.list(agentId, workspaceId),
			queryFn: async () => {
				const response = await apiClient.schedules.list(agentId, workspaceId)
				return response.schedules.map((schedule) => ({
					...schedule,
					_workspaceId: workspaceId,
				})) as ScheduleRow[]
			},
			getKey: (schedule: ScheduleRow) => schedule.id,

			onInsert: async ({ transaction }) => {
				const mutations = transaction.mutations
				for (const mutation of mutations) {
					if (mutation.type === 'insert' && mutation.modified) {
						const modified = mutation.modified as ScheduleRow
						const { agentId: aId, _workspaceId, type, executeAt, cron, action, payload } = modified
						await apiClient.schedules.create(aId, _workspaceId, {
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
						const original = mutation.original as ScheduleRow
						const modified = mutation.modified as ScheduleRow
						const { id, agentId: aId, _workspaceId } = original
						const { status, executeAt, cron, payload } = modified
						await apiClient.schedules.update(aId, id, _workspaceId, {
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
						const original = mutation.original as ScheduleRow
						const { id, agentId: aId, _workspaceId } = original
						await apiClient.schedules.delete(aId, id, _workspaceId)
					}
				}
			},
		}),
	)
}
