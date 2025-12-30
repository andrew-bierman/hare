'use client'

import type { ReactNode } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useWorkspace } from './workspace-provider'

interface WorkspaceGateProps {
	children: ReactNode
}

/**
 * WorkspaceGate shows loading states while workspace is being fetched or created.
 * Renders children only when a workspace is available.
 */
export function WorkspaceGate({ children }: WorkspaceGateProps) {
	const { isLoading, isCreatingWorkspace, activeWorkspace, workspaces } = useWorkspace()

	// Initial loading - fetching workspaces
	if (isLoading) {
		return (
			<div className="flex min-h-[60vh] flex-col items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				<p className="mt-4 text-sm text-muted-foreground">Loading workspace...</p>
			</div>
		)
	}

	// Creating workspace for new users
	if (isCreatingWorkspace || (workspaces.length === 0 && !activeWorkspace)) {
		return (
			<div className="flex min-h-[60vh] flex-col items-center justify-center">
				<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25 mb-4">
					<Sparkles className="h-8 w-8 text-white" />
				</div>
				<h2 className="text-xl font-semibold mb-2">Setting up your workspace</h2>
				<p className="text-sm text-muted-foreground mb-4">
					This will only take a moment...
				</p>
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		)
	}

	// Workspace ready
	return <>{children}</>
}
