'use client'

/**
 * TanStack DB Live Query Hooks
 *
 * Provides reactive data hooks using TanStack DB live queries.
 * Live queries automatically update when underlying data changes,
 * with sub-millisecond performance using differential dataflow.
 *
 * @see https://tanstack.com/db/latest/docs/guides/live-queries
 */

import type { AgentStatus } from '@hare/types'
import { useLiveQuery, eq } from '@tanstack/react-db'
import { useMemo } from 'react'
import {
	useAgentCollection,
	useToolCollection,
	useWorkspaceCollection,
	useScheduleCollection,
} from './provider'

// =============================================================================
// Agent Live Queries
// =============================================================================

/**
 * Live query for all agents in a workspace.
 * Updates automatically when agents are added, updated, or removed.
 */
export function useLiveAgents(workspaceId: string | undefined) {
	const collection = useAgentCollection(workspaceId ?? '')

	return useLiveQuery(
		(q) => q.from({ agent: collection }).orderBy((row) => row.agent.updatedAt, 'desc'),
		[workspaceId],
	)
}

/**
 * Live query for a single agent by ID.
 */
export function useLiveAgent(options: { id: string; workspaceId: string } | undefined) {
	const collection = useAgentCollection(options?.workspaceId ?? '')

	return useLiveQuery(
		(q) =>
			q.from({ agent: collection }).where((row) => eq(row.agent.id, options?.id ?? '')),
		[options?.id, options?.workspaceId],
	)
}

/**
 * Live query for agents filtered by status.
 */
export function useLiveAgentsByStatus(options: {
	workspaceId: string
	status: AgentStatus | AgentStatus[]
}) {
	const { workspaceId, status } = options
	const collection = useAgentCollection(workspaceId)
	const statuses = Array.isArray(status) ? status : [status]

	// Query all agents and filter by status client-side
	// This avoids complex type issues with TanStack DB's where clause
	const result = useLiveQuery(
		(q) => q.from({ agent: collection }).orderBy((row) => row.agent.updatedAt, 'desc'),
		[workspaceId, ...statuses],
	)

	// Filter by status client-side
	const filteredData = useMemo(() => {
		if (!result.data) return []
		return result.data.filter((row) => {
			const agent = row as unknown as { agent: { status: string } }
			return statuses.includes(agent.agent.status as AgentStatus)
		})
	}, [result.data, statuses])

	return { ...result, data: filteredData }
}

/**
 * Live query for deployed agents only.
 */
export function useLiveDeployedAgents(workspaceId: string) {
	return useLiveAgentsByStatus({ workspaceId, status: 'deployed' })
}

/**
 * Live query for draft agents only.
 */
export function useLiveDraftAgents(workspaceId: string) {
	return useLiveAgentsByStatus({ workspaceId, status: 'draft' })
}

/**
 * Live query for agents with a specific tool.
 */
export function useLiveAgentsWithTool(options: { workspaceId: string; toolId: string }) {
	const { workspaceId, toolId } = options
	const collection = useAgentCollection(workspaceId)

	// Note: This filters client-side since toolIds is an array
	const result = useLiveQuery((q) => q.from({ agent: collection }), [workspaceId])

	const filteredData = useMemo(() => {
		if (!result.data) return []
		// Type assertion needed for TanStack DB query result type inference
		return result.data.filter((row) => {
			const agent = row as unknown as { agent: { toolIds?: string[] } }
			return agent.agent?.toolIds?.includes(toolId)
		})
	}, [result.data, toolId])

	return { ...result, data: filteredData }
}

// =============================================================================
// Tool Live Queries
// =============================================================================

/**
 * Live query for all tools in a workspace.
 */
export function useLiveTools(workspaceId: string | undefined) {
	const collection = useToolCollection(workspaceId ?? '')

	return useLiveQuery(
		(q) => q.from({ tool: collection }).orderBy((row) => row.tool.name, 'asc'),
		[workspaceId],
	)
}

/**
 * Live query for a single tool by ID.
 */
export function useLiveTool(options: { id: string; workspaceId: string } | undefined) {
	const collection = useToolCollection(options?.workspaceId ?? '')

	return useLiveQuery(
		(q) => q.from({ tool: collection }).where((row) => eq(row.tool.id, options?.id ?? '')),
		[options?.id, options?.workspaceId],
	)
}

/**
 * Live query for tools by type.
 */
export function useLiveToolsByType(options: { workspaceId: string; type: string }) {
	const { workspaceId, type } = options
	const collection = useToolCollection(workspaceId)

	return useLiveQuery(
		(q) =>
			q
				.from({ tool: collection })
				.where((row) => eq(row.tool.type, type))
				.orderBy((row) => row.tool.name, 'asc'),
		[workspaceId, type],
	)
}

/**
 * Live query for system tools only.
 */
export function useLiveSystemTools(workspaceId: string) {
	const collection = useToolCollection(workspaceId)

	return useLiveQuery(
		(q) =>
			q
				.from({ tool: collection })
				.where(({ tool }) => eq(tool.isSystem, true))
				.orderBy(({ tool }) => tool.name, 'asc'),
		[workspaceId],
	)
}

/**
 * Live query for custom (non-system) tools only.
 */
export function useLiveCustomTools(workspaceId: string) {
	const collection = useToolCollection(workspaceId)

	return useLiveQuery(
		(q) =>
			q
				.from({ tool: collection })
				.where(({ tool }) => eq(tool.isSystem, false))
				.orderBy(({ tool }) => tool.name, 'asc'),
		[workspaceId],
	)
}

// =============================================================================
// Workspace Live Queries
// =============================================================================

/**
 * Live query for all workspaces.
 */
export function useLiveWorkspaces() {
	const collection = useWorkspaceCollection()

	return useLiveQuery(
		(q) => q.from({ workspace: collection }).orderBy((row) => row.workspace.name, 'asc'),
		[],
	)
}

/**
 * Live query for a single workspace by ID.
 */
export function useLiveWorkspace(id: string | undefined) {
	const collection = useWorkspaceCollection()

	return useLiveQuery(
		(q) => q.from({ workspace: collection }).where((row) => eq(row.workspace.id, id ?? '')),
		[id],
	)
}

// =============================================================================
// Schedule Live Queries
// =============================================================================

/**
 * Live query for all schedules for an agent.
 */
export function useLiveSchedules(options: { agentId: string; workspaceId: string } | undefined) {
	const collection = useScheduleCollection({
		agentId: options?.agentId ?? '',
		workspaceId: options?.workspaceId ?? '',
	})

	return useLiveQuery(
		(q) =>
			q.from({ schedule: collection }).orderBy((row) => row.schedule.createdAt, 'desc'),
		[options?.agentId, options?.workspaceId],
	)
}

/**
 * Live query for active schedules.
 */
export function useLiveActiveSchedules(options: { agentId: string; workspaceId: string }) {
	const { agentId, workspaceId } = options
	const collection = useScheduleCollection({ agentId, workspaceId })

	return useLiveQuery(
		(q) =>
			q
				.from({ schedule: collection })
				.where(({ schedule }) => eq(schedule.status, 'active'))
				.orderBy(({ schedule }) => schedule.nextExecuteAt, 'asc'),
		[agentId, workspaceId],
	)
}

/**
 * Live query for pending schedules.
 */
export function useLivePendingSchedules(options: { agentId: string; workspaceId: string }) {
	const { agentId, workspaceId } = options
	const collection = useScheduleCollection({ agentId, workspaceId })

	return useLiveQuery(
		(q) =>
			q
				.from({ schedule: collection })
				.where(({ schedule }) => eq(schedule.status, 'pending'))
				.orderBy(({ schedule }) => schedule.executeAt, 'asc'),
		[agentId, workspaceId],
	)
}

// =============================================================================
// Aggregate Queries
// =============================================================================

/**
 * Get agent count for a workspace.
 * Uses live query for real-time updates.
 */
export function useLiveAgentCount(workspaceId: string): number {
	const { data } = useLiveAgents(workspaceId)
	return data?.length ?? 0
}

/**
 * Get tool count for a workspace.
 */
export function useLiveToolCount(workspaceId: string): number {
	const { data } = useLiveTools(workspaceId)
	return data?.length ?? 0
}

/**
 * Get deployed agent count for a workspace.
 */
export function useLiveDeployedAgentCount(workspaceId: string): number {
	const { data } = useLiveDeployedAgents(workspaceId)
	return data?.length ?? 0
}
