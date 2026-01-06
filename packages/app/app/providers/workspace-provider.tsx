'use client'

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react'
import type { Workspace, WorkspaceRole } from '../../shared/api'
import { useWorkspacesQuery, useEnsureDefaultWorkspaceMutation } from '../../shared/api'
import { useAuth } from '../../features/auth'
import { setOrpcWorkspaceId } from '@hare/api'

interface WorkspaceWithRole extends Workspace {
	role?: WorkspaceRole
}

interface WorkspaceContextValue {
	workspaces: WorkspaceWithRole[]
	activeWorkspace: WorkspaceWithRole | null
	workspaceRole: WorkspaceRole | undefined
	setActiveWorkspace: (workspace: WorkspaceWithRole) => void
	isLoading: boolean
	isCreatingWorkspace: boolean
	error: Error | null
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

const ACTIVE_WORKSPACE_KEY = 'hare-active-workspace'

export function WorkspaceProvider({ children }: { children: ReactNode }) {
	const { data: session } = useAuth()
	const { data, isLoading, error } = useWorkspacesQuery()
	const ensureDefaultWorkspace = useEnsureDefaultWorkspaceMutation()
	const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceWithRole | null>(null)
	const hasEnsuredDefault = useRef(false)

	const workspaces: WorkspaceWithRole[] = data?.workspaces ?? []

	const setActiveWorkspace = useCallback((workspace: WorkspaceWithRole) => {
		setActiveWorkspaceState(workspace)
		if (typeof window !== 'undefined') {
			localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspace.id)
		}
	}, [])

	// Ensure default workspace exists (idempotent - safe to call multiple times)
	// Uses server-side atomic check-and-create to prevent duplicates
	useEffect(() => {
		if (
			!isLoading &&
			session?.user &&
			workspaces.length === 0 &&
			!ensureDefaultWorkspace.isPending &&
			!hasEnsuredDefault.current
		) {
			hasEnsuredDefault.current = true
			ensureDefaultWorkspace.mutate()
		}
	}, [isLoading, session?.user, workspaces.length, ensureDefaultWorkspace])

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

	// Sync active workspace ID to oRPC client for X-Workspace-Id header
	useEffect(() => {
		setOrpcWorkspaceId(activeWorkspace?.id ?? null)
	}, [activeWorkspace?.id])

	return (
		<WorkspaceContext.Provider
			value={{
				workspaces,
				activeWorkspace,
				workspaceRole: activeWorkspace?.role,
				setActiveWorkspace,
				isLoading,
				isCreatingWorkspace: ensureDefaultWorkspace.isPending,
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
