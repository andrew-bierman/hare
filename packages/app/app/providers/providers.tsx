'use client'

import { Toaster } from '@hare/ui/components/sonner'
import type { ReactNode } from 'react'
import { AuthProvider } from '../../features/auth'
import { QueryProvider } from './query-provider'
import { WorkspaceProvider } from './workspace-provider'

/**
 * Root providers for Hare applications.
 * Composes auth, query, and workspace providers.
 */
export function Providers({ children }: { children: ReactNode }) {
	return (
		<QueryProvider>
			<AuthProvider>
				<WorkspaceProvider>
					{children}
					<Toaster />
				</WorkspaceProvider>
			</AuthProvider>
		</QueryProvider>
	)
}
