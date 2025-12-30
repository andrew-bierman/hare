'use client'

import { Toaster } from '@hare/ui/components/sonner'
import type { ReactNode } from 'react'
import { AuthProvider } from '../../features/auth'
import { TanStackDBProvider } from '../../shared/lib/tanstack/db'
import { QueryProvider } from './query-provider'
import { WorkspaceProvider } from './workspace-provider'

/**
 * Root providers for Hare applications.
 * Composes auth, query, workspace, and TanStack DB providers.
 */
export function Providers({ children }: { children: ReactNode }) {
	return (
		<QueryProvider>
			<TanStackDBProvider>
				<AuthProvider>
					<WorkspaceProvider>
						{children}
						<Toaster />
					</WorkspaceProvider>
				</AuthProvider>
			</TanStackDBProvider>
		</QueryProvider>
	)
}
