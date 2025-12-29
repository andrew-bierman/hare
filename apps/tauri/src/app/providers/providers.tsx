'use client'

import { AuthProvider as AppAuthProvider } from '@hare/app'
import { Toaster } from '@hare/ui/components/sonner'
import { signOut } from './auth-client'
import { AuthProvider, useAuth } from './auth-provider'
import { QueryProvider } from './query-provider'
import { WorkspaceProvider } from './workspace-provider'

/**
 * Bridge component that connects Tauri auth to @hare/app auth context
 */
function AppAuthBridge({ children }: { children: React.ReactNode }) {
	const session = useAuth()

	const sessionData = {
		data: session.data
			? {
					user: session.data.user
						? {
								id: session.data.user.id,
								email: session.data.user.email,
								name: session.data.user.name ?? null,
								image: session.data.user.image ?? null,
							}
						: null,
				}
			: null,
		isPending: session.isPending,
		error: session.error ?? null,
	}

	const actions = {
		signOut: async () => {
			await signOut()
		},
	}

	return (
		<AppAuthProvider session={sessionData} actions={actions}>
			{children}
		</AppAuthProvider>
	)
}

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<QueryProvider>
			<AuthProvider>
				<AppAuthBridge>
					<WorkspaceProvider>
						{children}
						<Toaster />
					</WorkspaceProvider>
				</AppAuthBridge>
			</AuthProvider>
		</QueryProvider>
	)
}
