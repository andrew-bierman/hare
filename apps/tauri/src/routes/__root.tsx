import { WorkspaceProvider } from '@hare/app/providers'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { Toaster } from '@hare/ui/components/sonner'
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
					<WorkspaceProvider useAuth={useTauriAuth}>
						<div className="min-h-screen bg-background text-foreground">
							<Outlet />
						</div>
						<Toaster position="bottom-right" />
					</WorkspaceProvider>
					<ReactQueryDevtools initialIsOpen={false} />
				</QueryClientProvider>
				<Scripts />
			</body>
		</html>
	)
}
