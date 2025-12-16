'use client'

import { Toaster } from 'web-app/components/ui/sonner'
import { AuthProvider } from './auth-provider'
import { QueryProvider } from './query-provider'

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<QueryProvider>
			<AuthProvider>
				{children}
				<Toaster />
			</AuthProvider>
		</QueryProvider>
	)
}
