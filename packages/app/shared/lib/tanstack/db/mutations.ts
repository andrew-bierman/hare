// @ts-nocheck - Broken TanStack DB code from main, needs fixing
'use client'

/**
 * TanStack DB Mutation Helpers
 *
 * Provides convenient mutation functions for collections.
 * All mutations are optimistic - they apply immediately and rollback on error.
 *
 * @see https://tanstack.com/db/latest/docs/guides/mutations
 */

import type {
	Agent,
	CreateAgentInput,
	CreateScheduleInput,
	CreateToolInput,
	CreateWorkspaceInput,
	Schedule,
	Tool,
	UpdateAgentInput,
	UpdateScheduleInput,
	Workspace,
} from '@hare/types'
import { createId } from '@paralleldrive/cuid2'
import { useMemo } from 'react'
import {
	useAgentCollection,
	useToolCollection,
	useWorkspaceCollection,
	useScheduleCollection,
} from './provider'
import type { AgentRow, ToolRow, WorkspaceRow, ScheduleRow } from './collections'

// =============================================================================
// Agent Mutations
// =============================================================================

/**
 * Hook providing optimistic mutation functions for agents.
 */
export function useAgentMutations(workspaceId: string) {
	const collection = useAgentCollection(workspaceId)

	return useMemo(
		() => ({
			/**
			 * Insert a new agent with optimistic update.
			 * Generates a temporary ID that will be replaced by the server.
			 */
			insert: (data: CreateAgentInput): string => {
				const id = createId()
				const now = new Date().toISOString()
				const agent: AgentRow = {
					id,
					workspaceId,
					name: data.name,
					description: data.description ?? null,
					model: data.model,
					instructions: data.instructions ?? '',
					config: data.config ?? null,
					status: 'draft',
					toolIds: data.toolIds ?? [],
					createdAt: now,
					updatedAt: now,
					_workspaceId: workspaceId,
				}
				collection.insert(agent)
				return id
			},

			/**
			 * Update an agent with optimistic update.
			 */
			update: (id: string, data: UpdateAgentInput): void => {
				collection.update(id, (draft) => {
					if (data.name !== undefined) draft.name = data.name
					if (data.description !== undefined) draft.description = data.description ?? null
					if (data.model !== undefined) draft.model = data.model
					if (data.instructions !== undefined) draft.instructions = data.instructions
					if (data.config !== undefined) draft.config = data.config ?? null
					if (data.toolIds !== undefined) draft.toolIds = data.toolIds
					if (data.status !== undefined) draft.status = data.status
					draft.updatedAt = new Date().toISOString()
				})
			},

			/**
			 * Delete an agent with optimistic update.
			 */
			delete: (id: string): void => {
				collection.delete(id)
			},

			/**
			 * Deploy an agent (set status to deployed).
			 */
			deploy: (id: string): void => {
				collection.update(id, (draft) => {
					draft.status = 'deployed'
					draft.updatedAt = new Date().toISOString()
				})
			},

			/**
			 * Archive an agent.
			 */
			archive: (id: string): void => {
				collection.update(id, (draft) => {
					draft.status = 'archived'
					draft.updatedAt = new Date().toISOString()
				})
			},
		}),
		[collection, workspaceId],
	)
}

// =============================================================================
// Tool Mutations
// =============================================================================

/**
 * Hook providing optimistic mutation functions for tools.
 */
export function useToolMutations(workspaceId: string) {
	const collection = useToolCollection(workspaceId)

	return useMemo(
		() => ({
			/**
			 * Insert a new tool with optimistic update.
			 */
			insert: (data: CreateToolInput): string => {
				const id = createId()
				const now = new Date().toISOString()
				const tool: ToolRow = {
					id,
					workspaceId,
					name: data.name,
					description: data.description ?? '',
					type: data.type,
					isSystem: false,
					inputSchema: data.inputSchema ?? {},
					config: data.config ?? null,
					createdAt: now,
					updatedAt: now,
					_workspaceId: workspaceId,
				}
				collection.insert(tool)
				return id
			},

			/**
			 * Update a tool with optimistic update.
			 */
			update: (id: string, data: Partial<CreateToolInput>): void => {
				collection.update(id, (draft) => {
					if (data.name !== undefined) draft.name = data.name
					if (data.description !== undefined) draft.description = data.description ?? ''
					if (data.type !== undefined) draft.type = data.type
					if (data.inputSchema !== undefined) draft.inputSchema = data.inputSchema ?? {}
					if (data.config !== undefined) draft.config = data.config ?? null
					draft.updatedAt = new Date().toISOString()
				})
			},

			/**
			 * Delete a tool with optimistic update.
			 */
			delete: (id: string): void => {
				collection.delete(id)
			},
		}),
		[collection, workspaceId],
	)
}

// =============================================================================
// Workspace Mutations
// =============================================================================

/**
 * Hook providing optimistic mutation functions for workspaces.
 */
export function useWorkspaceMutations() {
	const collection = useWorkspaceCollection()

	return useMemo(
		() => ({
			/**
			 * Insert a new workspace with optimistic update.
			 */
			insert: (data: CreateWorkspaceInput): string => {
				const id = createId()
				const now = new Date().toISOString()
				const workspace: WorkspaceRow = {
					id,
					name: data.name,
					slug: data.slug,
					description: data.description ?? null,
					createdAt: now,
					updatedAt: now,
				}
				collection.insert(workspace)
				return id
			},

			/**
			 * Update a workspace with optimistic update.
			 */
			update: (id: string, data: Partial<CreateWorkspaceInput>): void => {
				collection.update(id, (draft) => {
					if (data.name !== undefined) draft.name = data.name
					if (data.description !== undefined) draft.description = data.description ?? null
					draft.updatedAt = new Date().toISOString()
				})
			},

			/**
			 * Delete a workspace with optimistic update.
			 */
			delete: (id: string): void => {
				collection.delete(id)
			},
		}),
		[collection],
	)
}

// =============================================================================
// Schedule Mutations
// =============================================================================

/**
 * Hook providing optimistic mutation functions for schedules.
 */
export function useScheduleMutations(options: { agentId: string; workspaceId: string }) {
	const { agentId, workspaceId } = options
	const collection = useScheduleCollection({ agentId, workspaceId })

	return useMemo(
		() => ({
			/**
			 * Insert a new schedule with optimistic update.
			 */
			insert: (data: CreateScheduleInput): string => {
				const id = createId()
				const now = new Date().toISOString()
				const schedule: ScheduleRow = {
					id,
					agentId,
					type: data.type,
					executeAt: data.executeAt ?? null,
					cron: data.cron ?? null,
					action: data.action,
					payload: data.payload ?? null,
					status: 'pending',
					lastExecutedAt: null,
					nextExecuteAt: data.executeAt ?? null,
					executionCount: 0,
					createdAt: now,
					updatedAt: now,
					_workspaceId: workspaceId,
				}
				collection.insert(schedule)
				return id
			},

			/**
			 * Update a schedule with optimistic update.
			 */
			update: (id: string, data: UpdateScheduleInput): void => {
				collection.update(id, (draft) => {
					if (data.status !== undefined) draft.status = data.status
					if (data.executeAt !== undefined) draft.executeAt = data.executeAt ?? null
					if (data.cron !== undefined) draft.cron = data.cron ?? null
					if (data.payload !== undefined) draft.payload = data.payload ?? null
					draft.updatedAt = new Date().toISOString()
				})
			},

			/**
			 * Delete a schedule with optimistic update.
			 */
			delete: (id: string): void => {
				collection.delete(id)
			},

			/**
			 * Pause a schedule.
			 */
			pause: (id: string): void => {
				collection.update(id, (draft) => {
					draft.status = 'paused'
					draft.updatedAt = new Date().toISOString()
				})
			},

			/**
			 * Resume a paused schedule.
			 */
			resume: (id: string): void => {
				collection.update(id, (draft) => {
					draft.status = 'active'
					draft.updatedAt = new Date().toISOString()
				})
			},

			/**
			 * Cancel a schedule.
			 */
			cancel: (id: string): void => {
				collection.update(id, (draft) => {
					draft.status = 'cancelled'
					draft.updatedAt = new Date().toISOString()
				})
			},
		}),
		[collection, agentId, workspaceId],
	)
}
