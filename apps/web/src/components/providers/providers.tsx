'use client'

import { Toaster } from '@workspace/ui/components/sonner'
import { AuthProvider } from './auth-provider'
import { QueryProvider } from './query-provider'
import { WorkspaceProvider } from './workspace-provider'

export function Providers({ children }: { children: React.ReactNode }) {
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
