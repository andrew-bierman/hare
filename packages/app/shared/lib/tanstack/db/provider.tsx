'use client'

/**
 * TanStack DB Provider
 *
 * Provides workspace-scoped collections via React Context.
 * Collections are created lazily and cached per workspace.
 *
 * @see https://tanstack.com/db/latest/docs/quick-start
 */

import { useQueryClient } from '@tanstack/react-query'
import { createContext, type ReactNode, useContext, useMemo, useRef } from 'react'
import {
	type AgentCollection,
	createAgentCollection,
	createScheduleCollection,
	createToolCollection,
	createWorkspaceCollection,
	type ScheduleCollection,
	type ToolCollection,
	type WorkspaceCollection,
} from './collections'

// =============================================================================
// Context Types
// =============================================================================

interface TanStackDBContextValue {
	/** Workspace collection (not workspace-scoped) */
	workspaces: WorkspaceCollection
	/** Get or create an agent collection for a workspace */
	getAgentCollection: (workspaceId: string) => AgentCollection
	/** Get or create a tool collection for a workspace */
	getToolCollection: (workspaceId: string) => ToolCollection
	/** Get or create a schedule collection for an agent */
	getScheduleCollection: (options: { agentId: string; workspaceId: string }) => ScheduleCollection
}

const TanStackDBContext = createContext<TanStackDBContextValue | null>(null)

// =============================================================================
// Provider Component
// =============================================================================

interface TanStackDBProviderProps {
	children: ReactNode
}

/**
 * TanStack DB Provider
 *
 * Wraps the application to provide access to TanStack DB collections.
 * Collections are lazily created and cached for performance.
 *
 * @example
 * ```tsx
 * <TanStackDBProvider>
 *   <App />
 * </TanStackDBProvider>
 * ```
 */
export function TanStackDBProvider({ children }: TanStackDBProviderProps) {
	const queryClient = useQueryClient()

	// Collection caches - use refs to persist across renders
	const agentCollectionsRef = useRef(new Map<string, AgentCollection>())
	const toolCollectionsRef = useRef(new Map<string, ToolCollection>())
	const scheduleCollectionsRef = useRef(new Map<string, ScheduleCollection>())

	// Create the workspace collection once
	const workspaces = useMemo(() => createWorkspaceCollection({ queryClient }), [queryClient])

	// Factory functions for workspace-scoped collections
	const getAgentCollection = useMemo(() => {
		return (workspaceId: string): AgentCollection => {
			const existing = agentCollectionsRef.current.get(workspaceId)
			if (existing) return existing

			const collection = createAgentCollection({ workspaceId, queryClient })
			agentCollectionsRef.current.set(workspaceId, collection)
			return collection
		}
	}, [queryClient])

	const getToolCollection = useMemo(() => {
		return (workspaceId: string): ToolCollection => {
			const existing = toolCollectionsRef.current.get(workspaceId)
			if (existing) return existing

			const collection = createToolCollection({ workspaceId, queryClient })
			toolCollectionsRef.current.set(workspaceId, collection)
			return collection
		}
	}, [queryClient])

	const getScheduleCollection = useMemo(() => {
		return (options: { agentId: string; workspaceId: string }): ScheduleCollection => {
			const key = `${options.workspaceId}:${options.agentId}`
			const existing = scheduleCollectionsRef.current.get(key)
			if (existing) return existing

			const collection = createScheduleCollection({ ...options, queryClient })
			scheduleCollectionsRef.current.set(key, collection)
			return collection
		}
	}, [queryClient])

	const value = useMemo<TanStackDBContextValue>(
		() => ({
			workspaces,
			getAgentCollection,
			getToolCollection,
			getScheduleCollection,
		}),
		[workspaces, getAgentCollection, getToolCollection, getScheduleCollection],
	)

	return <TanStackDBContext.Provider value={value}>{children}</TanStackDBContext.Provider>
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Access the TanStack DB context.
 *
 * @throws If used outside of TanStackDBProvider
 */
export function useTanStackDB(): TanStackDBContextValue {
	const context = useContext(TanStackDBContext)
	if (!context) {
		throw new Error('useTanStackDB must be used within a TanStackDBProvider')
	}
	return context
}

/**
 * Get the workspace collection.
 */
export function useWorkspaceCollection(): WorkspaceCollection {
	return useTanStackDB().workspaces
}

/**
 * Get or create an agent collection for a workspace.
 */
export function useAgentCollection(workspaceId: string): AgentCollection {
	const { getAgentCollection } = useTanStackDB()
	return useMemo(() => getAgentCollection(workspaceId), [getAgentCollection, workspaceId])
}

/**
 * Get or create a tool collection for a workspace.
 */
export function useToolCollection(workspaceId: string): ToolCollection {
	const { getToolCollection } = useTanStackDB()
	return useMemo(() => getToolCollection(workspaceId), [getToolCollection, workspaceId])
}

/**
 * Get or create a schedule collection for an agent.
 */
export function useScheduleCollection(options: {
	agentId: string
	workspaceId: string
}): ScheduleCollection {
	const { getScheduleCollection } = useTanStackDB()
	return useMemo(
		() => getScheduleCollection(options),
		[getScheduleCollection, options.agentId, options.workspaceId],
	)
}
