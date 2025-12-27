import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from '@workspace/ui/components/sonner'
import { AuthProvider } from 'web-app/components/providers/auth-provider'
import '@workspace/ui/styles/globals.css'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000,
			refetchOnWindowFocus: false,
		},
	},
})

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ title: 'Hare - AI Agents on the Edge' },
			{
				name: 'description',
				content: 'Build and deploy AI agents to Cloudflare edge',
			},
		],
		links: [{ rel: 'icon', href: '/favicon.svg' }],
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
					<AuthProvider>
						<Outlet />
						<Toaster />
					</AuthProvider>
					<ReactQueryDevtools initialIsOpen={false} />
				</QueryClientProvider>
				<Scripts />
			</body>
		</html>
	)
}
