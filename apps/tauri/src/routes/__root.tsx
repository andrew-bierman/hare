import { WorkspaceProvider } from '@hare/app/providers'
import { useWorkspacesQuery, useCreateWorkspaceMutation } from '@hare/app/shared/api'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import '../styles.css'

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000,
			refetchOnWindowFocus: false,
		},
	},
})

// Mock auth hook for desktop app - returns a static user session
// In the future, this can be replaced with actual auth against the API
function useTauriAuth() {
	return {
		data: {
			user: {
				id: 'tauri-user',
				email: 'desktop@hare.app',
				name: 'Desktop User',
			},
		},
	}
}

export const Route = createRootRoute({
	head: () => ({
		title: 'Hare Desktop',
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ name: 'description', content: 'Hare AI Agents Desktop App' },
		],
	}),
	component: RootLayout,
})

function RootLayout() {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="font-sans antialiased">
				<QueryClientProvider client={queryClient}>
					<TauriWorkspaceProvider>
						<div className="min-h-screen bg-background text-foreground">
							<Outlet />
						</div>
						<Toaster position="bottom-right" />
					</TauriWorkspaceProvider>
					<ReactQueryDevtools initialIsOpen={false} />
				</QueryClientProvider>
				<Scripts />
			</body>
		</html>
	)
}

// Wrapper component to use hooks within QueryClientProvider
function TauriWorkspaceProvider({ children }: { children: React.ReactNode }) {
	const workspacesQuery = useWorkspacesQuery()
	const createWorkspaceMutation = useCreateWorkspaceMutation()

	return (
		<WorkspaceProvider
			useAuth={useTauriAuth}
			workspacesQuery={workspacesQuery}
			createWorkspaceMutation={createWorkspaceMutation}
		>
			{children}
		</WorkspaceProvider>
	)
}
