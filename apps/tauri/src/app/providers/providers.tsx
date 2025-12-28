'use client'

import { AuthProvider as AppAuthProvider } from '@hare/app'
import { Toaster } from '@hare/ui/components/sonner'
import { AuthProvider, useAuth } from './auth-provider'
import { QueryProvider } from './query-provider'
import { WorkspaceProvider } from '@hare/app/providers'

// Get API base URL from environment or default to production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hare.dev'

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
			// Call web API to sign out
			await fetch(`${API_BASE_URL}/api/auth/sign-out`, {
				method: 'POST',
				credentials: 'include',
			})
			// Reload to clear state
			window.location.reload()
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
