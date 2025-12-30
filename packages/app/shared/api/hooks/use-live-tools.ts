'use client'

/**
 * TanStack DB Live Hooks for Tools
 *
 * Reactive hooks for tool management with optimistic mutations.
 * These are experimental - use useToolsQuery for stable functionality.
 *
 * @see https://tanstack.com/db/latest/docs/framework/react/overview
 */

import { useQueryClient } from '@tanstack/react-query'
import { useLiveQuery, eq } from '@tanstack/react-db'
import { useMemo, useCallback } from 'react'
import type { CreateToolInput } from '@hare/types'
import { createToolsCollection, type ToolRecord } from '../collections'

// Store collections in a WeakMap keyed by QueryClient
const collectionsMap = new WeakMap<object, Map<string, ReturnType<typeof createToolsCollection>>>()

function getOrCreateCollection(queryClient: object, workspaceId: string) {
	let workspaceMap = collectionsMap.get(queryClient)
	if (!workspaceMap) {
		workspaceMap = new Map()
		collectionsMap.set(queryClient, workspaceMap)
	}

	let collection = workspaceMap.get(workspaceId)
	if (!collection) {
		collection = createToolsCollection(
			workspaceId,
			queryClient as Parameters<typeof createToolsCollection>[1],
		)
		workspaceMap.set(workspaceId, collection)
	}

	return collection
}

/**
 * Hook to list all tools for a workspace using live queries.
 * Returns reactive data that automatically updates when tools change.
 *
 * IMPORTANT: workspaceId must be defined. Use standard useToolsQuery for conditional loading.
 *
 * @example
 * ```tsx
 * function ToolList({ workspaceId }) {
 *   const { tools, isLoading } = useLiveTools(workspaceId)
 *
 *   if (isLoading) return <Spinner />
 *   return tools.map(tool => <ToolCard key={tool.id} tool={tool} />)
 * }
 * ```
 */
export function useLiveTools(workspaceId: string) {
	const queryClient = useQueryClient()

	const collection = useMemo(
		() => getOrCreateCollection(queryClient, workspaceId),
		[queryClient, workspaceId],
	)

	const result = useLiveQuery(
		(q) => q.from({ tools: collection }).select(({ tools }) => tools),
		[collection],
	)

	return {
		data: (result.data ?? []) as ToolRecord[],
		tools: (result.data ?? []) as ToolRecord[],
		isLoading: result.isLoading,
		isError: result.isError,
		collection,
	}
}

/**
 * Hook to get a single tool by ID using live queries.
 *
 * IMPORTANT: Both id and workspaceId must be defined.
 *
 * @example
 * ```tsx
 * function ToolDetail({ workspaceId, toolId }) {
 *   const { tool, isLoading } = useLiveTool(toolId, workspaceId)
 *
 *   if (isLoading) return <Spinner />
 *   if (!tool) return <NotFound />
 *   return <ToolEditor tool={tool} />
 * }
 * ```
 */
export function useLiveTool(id: string, workspaceId: string) {
	const queryClient = useQueryClient()

	const collection = useMemo(
		() => getOrCreateCollection(queryClient, workspaceId),
		[queryClient, workspaceId],
	)

	const result = useLiveQuery(
		(q) =>
			q
				.from({ tools: collection })
				.where(({ tools }) => eq(tools.id, id))
				.select(({ tools }) => tools),
		[collection, id],
	)

	const tool = result.data?.[0] ?? null

	return {
		data: tool as ToolRecord | null,
		tool: tool as ToolRecord | null,
		isLoading: result.isLoading,
		isError: result.isError,
		collection,
	}
}

/**
 * Hook to filter tools by type using live queries.
 *
 * IMPORTANT: Both toolType and workspaceId must be defined.
 *
 * @example
 * ```tsx
 * function HttpToolList({ workspaceId }) {
 *   const { tools } = useLiveToolsByType('http', workspaceId)
 *   return tools.map(tool => <ToolCard key={tool.id} tool={tool} />)
 * }
 * ```
 */
export function useLiveToolsByType(toolType: string, workspaceId: string) {
	const queryClient = useQueryClient()

	const collection = useMemo(
		() => getOrCreateCollection(queryClient, workspaceId),
		[queryClient, workspaceId],
	)

	const result = useLiveQuery(
		(q) =>
			q
				.from({ tools: collection })
				.where(({ tools }) => eq(tools.type, toolType))
				.select(({ tools }) => tools),
		[collection, toolType],
	)

	return {
		data: (result.data ?? []) as ToolRecord[],
		tools: (result.data ?? []) as ToolRecord[],
		isLoading: result.isLoading,
		isError: result.isError,
		collection,
	}
}

/**
 * Hook to get tool mutation functions.
 * Returns optimistic insert/update/delete functions.
 *
 * @example
 * ```tsx
 * function CreateToolButton({ workspaceId }) {
 *   const { createTool, isReady } = useToolMutations(workspaceId)
 *
 *   const handleCreate = () => {
 *     createTool({ name: 'My API', description: 'Calls external API', type: 'http' })
 *   }
 *
 *   return <Button onClick={handleCreate} disabled={!isReady}>Create</Button>
 * }
 * ```
 */
export function useToolMutations(workspaceId: string | undefined) {
	const queryClient = useQueryClient()

	const collection = useMemo(() => {
		if (!workspaceId) return null
		return getOrCreateCollection(queryClient, workspaceId)
	}, [queryClient, workspaceId])

	const createTool = useCallback(
		(data: CreateToolInput) => {
			if (!collection) throw new Error('No workspace selected')

			const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`

			return collection.insert({
				id: tempId,
				name: data.name,
				description: data.description ?? '',
				type: data.type,
				config: data.config ?? null,
				inputSchema: data.inputSchema ?? null,
				workspaceId: workspaceId!,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			})
		},
		[collection, workspaceId],
	)

	const updateTool = useCallback(
		(id: string, data: Partial<CreateToolInput>) => {
			if (!collection) throw new Error('No workspace selected')

			return collection.update(id, (draft) => {
				if (data.name !== undefined) draft.name = data.name
				if (data.description !== undefined) draft.description = data.description ?? ''
				if (data.type !== undefined) draft.type = data.type
				if (data.config !== undefined) draft.config = data.config ?? null
				if (data.inputSchema !== undefined) draft.inputSchema = data.inputSchema ?? null
				draft.updatedAt = new Date().toISOString()
			})
		},
		[collection],
	)

	const deleteTool = useCallback(
		(id: string) => {
			if (!collection) throw new Error('No workspace selected')
			return collection.delete(id)
		},
		[collection],
	)

	return {
		createTool,
		updateTool,
		deleteTool,
		collection,
		isReady: !!collection,
	}
}

// Re-exports
export { useLiveQuery, eq }
export type { ToolRecord }
