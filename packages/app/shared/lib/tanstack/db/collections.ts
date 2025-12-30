/**
 * TanStack DB Collections
 *
 * Defines reactive collections for the main data entities.
 * Collections enable normalized data storage, live queries, and optimistic mutations.
 *
 * @see https://tanstack.com/db/latest/docs/collections/query-collection
 */

import type { Agent, Schedule, Tool, Workspace } from '@hare/types'
import { createCollection, type Collection } from '@tanstack/react-db'
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
export function createAgentCollection(options: { workspaceId: string }): Collection<AgentRow> {
	const { workspaceId } = options

	return createCollection<AgentRow>(
		queryCollectionOptions({
			queryKey: agentKeys.list(workspaceId),
			queryFn: async () => {
				const response = await apiClient.agents.list(workspaceId)
				return response.agents.map((agent) => ({
					...agent,
					_workspaceId: workspaceId,
				}))
			},
			getKey: (agent) => agent.id,
			getId: (agent) => agent.id,

			onInsert: async ({ transaction }) => {
				const mutations = transaction.mutations
				for (const mutation of mutations) {
					if (mutation.type === 'insert' && mutation.modified) {
						const { _workspaceId, ...data } = mutation.modified
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
						const { id, _workspaceId } = mutation.original
						const { name, description, model, instructions, config, toolIds, status } =
							mutation.modified
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
						const { id, _workspaceId } = mutation.original
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
export function createToolCollection(options: { workspaceId: string }): Collection<ToolRow> {
	const { workspaceId } = options

	return createCollection<ToolRow>(
		queryCollectionOptions({
			queryKey: toolKeys.list(workspaceId),
			queryFn: async () => {
				const response = await apiClient.tools.list(workspaceId)
				return response.tools.map((tool) => ({
					...tool,
					_workspaceId: workspaceId,
				}))
			},
			getKey: (tool) => tool.id,
			getId: (tool) => tool.id,

			onInsert: async ({ transaction }) => {
				const mutations = transaction.mutations
				for (const mutation of mutations) {
					if (mutation.type === 'insert' && mutation.modified) {
						const { _workspaceId, ...data } = mutation.modified
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
						const { id, _workspaceId } = mutation.original
						const { name, description, type, inputSchema, config } = mutation.modified
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
						const { id, _workspaceId } = mutation.original
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
export function createWorkspaceCollection(): Collection<WorkspaceRow> {
	return createCollection<WorkspaceRow>(
		queryCollectionOptions({
			queryKey: workspaceKeys.list(),
			queryFn: async () => {
				const response = await apiClient.workspaces.list()
				return response.workspaces
			},
			getKey: (workspace) => workspace.id,
			getId: (workspace) => workspace.id,

			onInsert: async ({ transaction }) => {
				const mutations = transaction.mutations
				for (const mutation of mutations) {
					if (mutation.type === 'insert' && mutation.modified) {
						const { name, description, slug } = mutation.modified
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
						const { id } = mutation.original
						const { name, description } = mutation.modified
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
						const { id } = mutation.original
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
}): Collection<ScheduleRow> {
	const { agentId, workspaceId } = options

	return createCollection<ScheduleRow>(
		queryCollectionOptions({
			queryKey: scheduleKeys.list(agentId, workspaceId),
			queryFn: async () => {
				const response = await apiClient.schedules.list(agentId, workspaceId)
				return response.schedules.map((schedule) => ({
					...schedule,
					_workspaceId: workspaceId,
				}))
			},
			getKey: (schedule) => schedule.id,
			getId: (schedule) => schedule.id,

			onInsert: async ({ transaction }) => {
				const mutations = transaction.mutations
				for (const mutation of mutations) {
					if (mutation.type === 'insert' && mutation.modified) {
						const { agentId: aId, _workspaceId, type, executeAt, cron, action, payload } =
							mutation.modified
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
						const { id, agentId: aId, _workspaceId } = mutation.original
						const { status, executeAt, cron, payload } = mutation.modified
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
						const { id, agentId: aId, _workspaceId } = mutation.original
						await apiClient.schedules.delete(aId, id, _workspaceId)
					}
				}
			},
		}),
	)
}
