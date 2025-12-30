'use client'

/**
 * TanStack DB Provider
 *
 * Provides workspace-scoped collections via React Context.
 * Collections are created lazily and cached per workspace.
 *
 * @see https://tanstack.com/db/latest/docs/quick-start
 */

import type { Collection } from '@tanstack/react-db'
import {
	createContext,
	useContext,
	useMemo,
	useRef,
	type ReactNode,
} from 'react'
import {
	createAgentCollection,
	createScheduleCollection,
	createToolCollection,
	createWorkspaceCollection,
	type AgentRow,
	type ScheduleRow,
	type ToolRow,
	type WorkspaceRow,
} from './collections'

// =============================================================================
// Context Types
// =============================================================================

interface TanStackDBContextValue {
	/** Workspace collection (not workspace-scoped) */
	workspaces: Collection<WorkspaceRow>
	/** Get or create an agent collection for a workspace */
	getAgentCollection: (workspaceId: string) => Collection<AgentRow>
	/** Get or create a tool collection for a workspace */
	getToolCollection: (workspaceId: string) => Collection<ToolRow>
	/** Get or create a schedule collection for an agent */
	getScheduleCollection: (options: {
		agentId: string
		workspaceId: string
	}) => Collection<ScheduleRow>
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
	// Collection caches - use refs to persist across renders
	const agentCollectionsRef = useRef(new Map<string, Collection<AgentRow>>())
	const toolCollectionsRef = useRef(new Map<string, Collection<ToolRow>>())
	const scheduleCollectionsRef = useRef(new Map<string, Collection<ScheduleRow>>())

	// Create the workspace collection once
	const workspaces = useMemo(() => createWorkspaceCollection(), [])

	// Factory functions for workspace-scoped collections
	const getAgentCollection = useMemo(() => {
		return (workspaceId: string): Collection<AgentRow> => {
			const existing = agentCollectionsRef.current.get(workspaceId)
			if (existing) return existing

			const collection = createAgentCollection({ workspaceId })
			agentCollectionsRef.current.set(workspaceId, collection)
			return collection
		}
	}, [])

	const getToolCollection = useMemo(() => {
		return (workspaceId: string): Collection<ToolRow> => {
			const existing = toolCollectionsRef.current.get(workspaceId)
			if (existing) return existing

			const collection = createToolCollection({ workspaceId })
			toolCollectionsRef.current.set(workspaceId, collection)
			return collection
		}
	}, [])

	const getScheduleCollection = useMemo(() => {
		return (options: { agentId: string; workspaceId: string }): Collection<ScheduleRow> => {
			const key = `${options.workspaceId}:${options.agentId}`
			const existing = scheduleCollectionsRef.current.get(key)
			if (existing) return existing

			const collection = createScheduleCollection(options)
			scheduleCollectionsRef.current.set(key, collection)
			return collection
		}
	}, [])

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
export function useWorkspaceCollection(): Collection<WorkspaceRow> {
	return useTanStackDB().workspaces
}

/**
 * Get or create an agent collection for a workspace.
 */
export function useAgentCollection(workspaceId: string): Collection<AgentRow> {
	const { getAgentCollection } = useTanStackDB()
	return useMemo(() => getAgentCollection(workspaceId), [getAgentCollection, workspaceId])
}

/**
 * Get or create a tool collection for a workspace.
 */
export function useToolCollection(workspaceId: string): Collection<ToolRow> {
	const { getToolCollection } = useTanStackDB()
	return useMemo(() => getToolCollection(workspaceId), [getToolCollection, workspaceId])
}

/**
 * Get or create a schedule collection for an agent.
 */
export function useScheduleCollection(options: {
	agentId: string
	workspaceId: string
}): Collection<ScheduleRow> {
	const { getScheduleCollection } = useTanStackDB()
	return useMemo(
		() => getScheduleCollection(options),
		[getScheduleCollection, options.agentId, options.workspaceId],
	)
}
