/**
 * TanStack DB Collections
 *
 * This module provides TanStack DB collection factories for the Hare platform.
 * TanStack DB enables:
 * - Reactive live queries that auto-update when data changes
 * - Built-in optimistic mutations with automatic rollback
 * - Normalized client-side data stores
 *
 * @see https://tanstack.com/db/latest/docs/quick-start
 *
 * Usage:
 * ```tsx
 * import { createAgentsCollection } from '@/shared/api/collections'
 * import { useLiveQuery } from '@tanstack/react-db'
 *
 * // Create a collection
 * const agentsCollection = createAgentsCollection(workspaceId, queryClient)
 *
 * // Use live queries in components
 * const { data } = useLiveQuery((q) =>
 *   q.from({ agents: agentsCollection }).select(({ agents }) => agents)
 * )
 *
 * // Optimistic mutations
 * agentsCollection.insert({ ... })
 * agentsCollection.update(id, (draft) => { draft.name = 'New Name' })
 * agentsCollection.delete(id)
 * ```
 */

import { createCollection } from '@tanstack/db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import type { QueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import { agentKeys, toolKeys, workspaceKeys } from './hooks/query-keys'

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Agent type for collections (matches API response)
 */
interface AgentRecord {
	id: string
	workspaceId: string
	name: string
	description: string | null
	model: string
	instructions: string
	config: Record<string, unknown> | null
	status: string
	createdAt: string
	updatedAt: string
}

/**
 * Tool type for collections
 */
interface ToolRecord {
	id: string
	workspaceId: string
	name: string
	description: string
	type: string
	config: Record<string, unknown> | null
	inputSchema: Record<string, unknown> | null
	createdAt: string
	updatedAt: string
}

/**
 * Workspace type for collections
 */
interface WorkspaceRecord {
	id: string
	name: string
	description: string | null
	createdAt: string
	updatedAt: string
}

// =============================================================================
// Collection Factories
// =============================================================================

/**
 * Creates an agents collection for a specific workspace.
 *
 * @example
 * ```tsx
 * const agentsCollection = createAgentsCollection(workspaceId, queryClient)
 *
 * // Use with live queries
 * const { data } = useLiveQuery((q) =>
 *   q.from({ agents: agentsCollection })
 *     .where(({ agents }) => eq(agents.status, 'active'))
 *     .select(({ agents }) => agents)
 * )
 *
 * // Mutations are optimistic
 * agentsCollection.update(id, (draft) => { draft.name = 'Updated' })
 * ```
 */
export function createAgentsCollection(workspaceId: string, queryClient: QueryClient) {
	// Using type assertion due to beta library type inference issues between packages
	const config = queryCollectionOptions<AgentRecord>({
		queryClient,
		queryKey: agentKeys.list(workspaceId),
		queryFn: async () => {
			const { agents } = await apiClient.agents.list(workspaceId)
			return agents as AgentRecord[]
		},
		getKey: (agent) => agent.id,

		onInsert: async ({ transaction }) => {
			const { modified: newAgent } = transaction.mutations[0]
			await apiClient.agents.create(workspaceId, {
				name: newAgent.name,
				model: newAgent.model,
				description: newAgent.description ?? undefined,
				instructions: newAgent.instructions ?? undefined,
				config: (newAgent.config as Record<string, unknown>) ?? undefined,
			})
		},

		onUpdate: async ({ transaction }) => {
			const { original, modified } = transaction.mutations[0]
			const updateData: Record<string, unknown> = {}
			if (modified.name !== original.name) updateData.name = modified.name
			if (modified.model !== original.model) updateData.model = modified.model
			if (modified.description !== original.description) {
				updateData.description = modified.description ?? undefined
			}
			if (modified.instructions !== original.instructions) {
				updateData.instructions = modified.instructions ?? undefined
			}
			if (modified.config !== original.config) {
				updateData.config = modified.config ?? undefined
			}
			await apiClient.agents.update(original.id, workspaceId, updateData)
		},

		onDelete: async ({ transaction }) => {
			const { original } = transaction.mutations[0]
			await apiClient.agents.delete(original.id, workspaceId)
		},
	})
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return createCollection<AgentRecord>(config as any)
}

/**
 * Creates a tools collection for a specific workspace.
 */
export function createToolsCollection(workspaceId: string, queryClient: QueryClient) {
	const config = queryCollectionOptions<ToolRecord>({
		queryClient,
		queryKey: toolKeys.list(workspaceId),
		queryFn: async () => {
			const { tools } = await apiClient.tools.list(workspaceId)
			return tools as ToolRecord[]
		},
		getKey: (tool) => tool.id,

		onInsert: async ({ transaction }) => {
			const { modified: newTool } = transaction.mutations[0]
			await apiClient.tools.create(workspaceId, {
				name: newTool.name,
				description: newTool.description,
				type: newTool.type as Parameters<typeof apiClient.tools.create>[1]['type'],
				config: newTool.config ?? undefined,
				inputSchema: newTool.inputSchema ?? undefined,
			})
		},

		onUpdate: async ({ transaction }) => {
			const { original, modified } = transaction.mutations[0]
			const updateData: Record<string, unknown> = {}
			if (modified.name !== original.name) updateData.name = modified.name
			if (modified.description !== original.description) {
				updateData.description = modified.description
			}
			if (modified.type !== original.type) updateData.type = modified.type
			if (modified.config !== original.config) updateData.config = modified.config
			if (modified.inputSchema !== original.inputSchema) {
				updateData.inputSchema = modified.inputSchema
			}
			await apiClient.tools.update(original.id, workspaceId, updateData)
		},

		onDelete: async ({ transaction }) => {
			const { original } = transaction.mutations[0]
			await apiClient.tools.delete(original.id, workspaceId)
		},
	})
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return createCollection<ToolRecord>(config as any)
}

/**
 * Creates a workspaces collection.
 */
export function createWorkspacesCollection(queryClient: QueryClient) {
	const config = queryCollectionOptions<WorkspaceRecord>({
		queryClient,
		queryKey: workspaceKeys.list(),
		queryFn: async () => {
			const { workspaces } = await apiClient.workspaces.list()
			return workspaces as WorkspaceRecord[]
		},
		getKey: (workspace) => workspace.id,

		onInsert: async ({ transaction }) => {
			const { modified: newWorkspace } = transaction.mutations[0]
			await apiClient.workspaces.create({ name: newWorkspace.name })
		},

		onUpdate: async ({ transaction }) => {
			const { original, modified } = transaction.mutations[0]
			const updateData: Record<string, unknown> = {}
			if (modified.name !== original.name) updateData.name = modified.name
			await apiClient.workspaces.update(original.id, updateData)
		},

		onDelete: async ({ transaction }) => {
			const { original } = transaction.mutations[0]
			await apiClient.workspaces.delete(original.id)
		},
	})
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return createCollection<WorkspaceRecord>(config as any)
}

// =============================================================================
// Collection Cache (optional convenience layer)
// =============================================================================

type CollectionType = ReturnType<typeof createAgentsCollection>
const collectionCache = new Map<string, CollectionType>()

/**
 * Get or create a cached agents collection.
 * Requires queryClient to be passed on first call for a workspaceId.
 */
export function getAgentsCollection(workspaceId: string, queryClient: QueryClient) {
	const key = `agents:${workspaceId}`
	if (!collectionCache.has(key)) {
		collectionCache.set(key, createAgentsCollection(workspaceId, queryClient))
	}
	return collectionCache.get(key)!
}

/**
 * Get or create a cached tools collection.
 */
export function getToolsCollection(workspaceId: string, queryClient: QueryClient) {
	const key = `tools:${workspaceId}`
	if (!collectionCache.has(key)) {
		collectionCache.set(
			key,
			createToolsCollection(workspaceId, queryClient) as unknown as CollectionType,
		)
	}
	return collectionCache.get(key) as unknown as ReturnType<typeof createToolsCollection>
}

/**
 * Clear the collection cache (useful for logout/cleanup).
 */
export function clearCollectionCache() {
	collectionCache.clear()
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export { useLiveQuery, useLiveInfiniteQuery, useLiveSuspenseQuery, eq } from '@tanstack/react-db'

// Export record types for consumers
export type { AgentRecord, ToolRecord, WorkspaceRecord }
