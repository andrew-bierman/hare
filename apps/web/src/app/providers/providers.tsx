'use client'

import { AuthProvider, QueryProvider, WorkspaceProvider } from '@hare/app'
import { signOut, useSession } from '@hare/auth/client'
import { Toaster } from '@hare/ui/components/sonner'

/**
 * Bridge that connects @hare/auth/client to @hare/app's AuthProvider
 */
function AuthBridge({ children }: { children: React.ReactNode }) {
	const session = useSession()

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
		<AuthProvider session={sessionData} actions={actions}>
			{children}
		</AuthProvider>
	)
}

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<QueryProvider>
			<AuthBridge>
				<WorkspaceProvider>
					{children}
					<Toaster />
				</WorkspaceProvider>
			</AuthBridge>
		</QueryProvider>
	)
}
