'use client'

/**
 * TanStack DB Live Hooks for Workspaces
 *
 * Reactive hooks for workspace management with optimistic mutations.
 * These are experimental - use useWorkspacesQuery for stable functionality.
 *
 * @see https://tanstack.com/db/latest/docs/framework/react/overview
 */

import { useQueryClient } from '@tanstack/react-query'
import { useLiveQuery, eq } from '@tanstack/react-db'
import { useCallback, useMemo } from 'react'
import type { CreateWorkspaceInput } from '@hare/types'
import { createWorkspacesCollection, type WorkspaceRecord } from '../collections'

// Store collection in a WeakMap keyed by QueryClient (singleton per client)
const collectionsMap = new WeakMap<object, ReturnType<typeof createWorkspacesCollection>>()

function getOrCreateCollection(queryClient: object) {
	let collection = collectionsMap.get(queryClient)
	if (!collection) {
		collection = createWorkspacesCollection(
			queryClient as Parameters<typeof createWorkspacesCollection>[0],
		)
		collectionsMap.set(queryClient, collection)
	}
	return collection
}

/**
 * Hook to list all workspaces using live queries.
 * Returns reactive data that automatically updates when workspaces change.
 *
 * @example
 * ```tsx
 * function WorkspaceList() {
 *   const { workspaces, isLoading } = useLiveWorkspaces()
 *
 *   if (isLoading) return <Spinner />
 *   return workspaces.map(ws => <WorkspaceCard key={ws.id} workspace={ws} />)
 * }
 * ```
 */
export function useLiveWorkspaces() {
	const queryClient = useQueryClient()

	const collection = useMemo(() => getOrCreateCollection(queryClient), [queryClient])

	const result = useLiveQuery(
		(q) => q.from({ workspaces: collection }).select(({ workspaces }) => workspaces),
		[collection],
	)

	return {
		data: (result.data ?? []) as WorkspaceRecord[],
		workspaces: (result.data ?? []) as WorkspaceRecord[],
		isLoading: result.isLoading,
		isError: result.isError,
		collection,
	}
}

/**
 * Hook to get a single workspace by ID using live queries.
 *
 * IMPORTANT: id must be defined.
 *
 * @example
 * ```tsx
 * function WorkspaceDetail({ workspaceId }) {
 *   const { workspace, isLoading } = useLiveWorkspace(workspaceId)
 *
 *   if (isLoading) return <Spinner />
 *   if (!workspace) return <NotFound />
 *   return <WorkspaceSettings workspace={workspace} />
 * }
 * ```
 */
export function useLiveWorkspace(id: string) {
	const queryClient = useQueryClient()

	const collection = useMemo(() => getOrCreateCollection(queryClient), [queryClient])

	const result = useLiveQuery(
		(q) =>
			q
				.from({ workspaces: collection })
				.where(({ workspaces }) => eq(workspaces.id, id))
				.select(({ workspaces }) => workspaces),
		[collection, id],
	)

	const workspace = result.data?.[0] ?? null

	return {
		data: workspace as WorkspaceRecord | null,
		workspace: workspace as WorkspaceRecord | null,
		isLoading: result.isLoading,
		isError: result.isError,
		collection,
	}
}

/**
 * Hook to get workspace mutation functions.
 * Returns optimistic insert/update/delete functions.
 *
 * @example
 * ```tsx
 * function CreateWorkspaceButton() {
 *   const { createWorkspace } = useWorkspaceMutations()
 *
 *   const handleCreate = () => {
 *     createWorkspace({ name: 'My Workspace' })
 *   }
 *
 *   return <Button onClick={handleCreate}>Create Workspace</Button>
 * }
 * ```
 */
export function useWorkspaceMutations() {
	const queryClient = useQueryClient()

	const collection = useMemo(() => getOrCreateCollection(queryClient), [queryClient])

	const createWorkspace = useCallback(
		(data: CreateWorkspaceInput) => {
			const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`

			return collection.insert({
				id: tempId,
				name: data.name,
				description: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			})
		},
		[collection],
	)

	const updateWorkspace = useCallback(
		(id: string, data: Partial<CreateWorkspaceInput>) => {
			return collection.update(id, (draft) => {
				if (data.name !== undefined) draft.name = data.name
				draft.updatedAt = new Date().toISOString()
			})
		},
		[collection],
	)

	const deleteWorkspace = useCallback(
		(id: string) => {
			return collection.delete(id)
		},
		[collection],
	)

	return {
		createWorkspace,
		updateWorkspace,
		deleteWorkspace,
		collection,
	}
}

// Re-exports
export { useLiveQuery, eq }
export type { WorkspaceRecord }
