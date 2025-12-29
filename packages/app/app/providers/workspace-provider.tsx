'use client'

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import type { Workspace, WorkspaceRole, CreateWorkspaceInput } from '../../shared/api'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'

interface WorkspaceWithRole extends Workspace {
	role?: WorkspaceRole
}

interface WorkspaceContextValue {
	workspaces: WorkspaceWithRole[]
	activeWorkspace: WorkspaceWithRole | null
	workspaceRole: WorkspaceRole | undefined
	setActiveWorkspace: (workspace: WorkspaceWithRole) => void
	isLoading: boolean
	error: Error | null
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

const ACTIVE_WORKSPACE_KEY = 'hare-active-workspace'

interface WorkspaceProviderProps {
	children: ReactNode
	/** Auth hook to get user session */
	useAuth: () => { data: { user: unknown } | null }
	/** Workspaces query result from parent app */
	workspacesQuery: UseQueryResult<{ workspaces: Workspace[] }, Error>
	/** Create workspace mutation from parent app */
	createWorkspaceMutation: UseMutationResult<Workspace, Error, CreateWorkspaceInput>
}

export function WorkspaceProvider({
	children,
	useAuth,
	workspacesQuery,
	createWorkspaceMutation,
}: WorkspaceProviderProps) {
	const { data: session } = useAuth()
	const { data, isLoading, error } = workspacesQuery
	const createWorkspace = createWorkspaceMutation
	const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceWithRole | null>(null)

	const workspaces: WorkspaceWithRole[] = data?.workspaces ?? []

	const setActiveWorkspace = useCallback((workspace: WorkspaceWithRole) => {
		setActiveWorkspaceState(workspace)
		if (typeof window !== 'undefined') {
			localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspace.id)
		}
	}, [])

	// Auto-create default workspace if user has none
	useEffect(() => {
		if (!isLoading && session?.user && workspaces.length === 0 && !createWorkspace.isPending) {
			// Add random suffix to avoid slug collisions in concurrent signup scenarios
			const suffix = Math.random().toString(36).substring(2, 8)
			createWorkspace.mutate({
				name: 'My Workspace',
				slug: `my-workspace-${suffix}`,
			})
		}
	}, [isLoading, session?.user, workspaces.length, createWorkspace])

	// Restore or set active workspace
	useEffect(() => {
		if (workspaces.length > 0 && !activeWorkspace) {
			const savedId =
				typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_WORKSPACE_KEY) : null
			const savedWorkspace = savedId ? workspaces.find((w) => w.id === savedId) : null

			if (savedWorkspace) {
				setActiveWorkspaceState(savedWorkspace)
			} else if (workspaces[0]) {
				setActiveWorkspaceState(workspaces[0])
			}
		}
	}, [workspaces, activeWorkspace])

	return (
		<WorkspaceContext.Provider
			value={{
				workspaces,
				activeWorkspace,
				workspaceRole: activeWorkspace?.role,
				setActiveWorkspace,
				isLoading,
				error: error as Error | null,
			}}
		>
			{children}
		</WorkspaceContext.Provider>
	)
}

export function useWorkspace() {
	const context = useContext(WorkspaceContext)
	if (!context) {
		throw new Error('useWorkspace must be used within WorkspaceProvider')
	}
	return context
}
