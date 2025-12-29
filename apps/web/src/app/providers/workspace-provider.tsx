'use client'

import {
	WorkspaceProvider as BaseWorkspaceProvider,
	useWorkspace,
} from '@hare/app/providers'
import { useCreateWorkspaceMutation, useWorkspacesQuery } from '@hare/app/shared/api'
import type { ReactNode } from 'react'
import { useAuth } from './auth-provider'

/**
 * WorkspaceProvider configured for the web app.
 * Wraps the base WorkspaceProvider from @hare/app with the web app's hooks.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
	const workspacesQuery = useWorkspacesQuery()
	const createWorkspaceMutation = useCreateWorkspaceMutation()

	return (
		<BaseWorkspaceProvider
			useAuth={useAuth}
			workspacesQuery={workspacesQuery}
			createWorkspaceMutation={createWorkspaceMutation}
		>
			{children}
		</BaseWorkspaceProvider>
	)
}

// Re-export useWorkspace from @hare/app so the same context is used everywhere
export { useWorkspace }
