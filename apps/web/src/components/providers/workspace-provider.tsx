'use client'

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react'
import { useWorkspaces, useCreateWorkspace, type Workspace } from 'web-app/lib/api/hooks'
import { useAuth } from './auth-provider'

interface WorkspaceContextValue {
	workspaces: Workspace[]
	activeWorkspace: Workspace | null
	setActiveWorkspace: (workspace: Workspace) => void
	isLoading: boolean
	error: Error | null
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

const ACTIVE_WORKSPACE_KEY = 'hare-active-workspace'

export function WorkspaceProvider({ children }: { children: ReactNode }) {
	const { data: session } = useAuth()
	const { data, isLoading, error } = useWorkspaces()
	const createWorkspace = useCreateWorkspace()
	const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null)

	const workspaces = data?.workspaces ?? []

	// Set active workspace with persistence
	const setActiveWorkspace = useCallback((workspace: Workspace) => {
		setActiveWorkspaceState(workspace)
		if (typeof window !== 'undefined') {
			localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspace.id)
		}
	}, [])

	// Auto-create default workspace if user has none
	useEffect(() => {
		if (!isLoading && session?.user && workspaces.length === 0 && !createWorkspace.isPending) {
			createWorkspace.mutate({
				name: 'My Workspace',
				slug: 'my-workspace',
			})
		}
	}, [isLoading, session?.user, workspaces.length, createWorkspace])

	// Restore or set active workspace
	useEffect(() => {
		if (workspaces.length > 0 && !activeWorkspace) {
			// Try to restore from localStorage
			const savedId =
				typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_WORKSPACE_KEY) : null
			const savedWorkspace = savedId ? workspaces.find((w) => w.id === savedId) : null

			if (savedWorkspace) {
				setActiveWorkspaceState(savedWorkspace)
			} else {
				// Default to first workspace
				setActiveWorkspaceState(workspaces[0])
			}
		}
	}, [workspaces, activeWorkspace])

	return (
		<WorkspaceContext.Provider
			value={{
				workspaces,
				activeWorkspace,
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
