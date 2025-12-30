import { Providers } from '@hare/app'
import { getSession } from '@hare/auth/client'
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import '@hare/ui/styles/globals.css'
import type { RouterContext } from '../router-context'

export const Route = createRootRouteWithContext<RouterContext>()({
	head: () => ({
		title: 'Hare - AI Agents on the Edge',
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{
				name: 'description',
				content: 'Build and deploy AI agents to Cloudflare edge',
			},
		],
		links: [{ rel: 'icon', href: '/favicon.svg' }],
	}),
	beforeLoad: async () => {
		// Fetch session and provide auth context for all routes
		// This runs on both server (SSR) and client (navigation)
		try {
			const session = await getSession()
			return {
				auth: {
					isAuthenticated: !!session.data?.user,
					user: session.data?.user ?? null,
				},
			}
		} catch {
			// If session fetch fails, treat as unauthenticated
			return {
				auth: {
					isAuthenticated: false,
					user: null,
				},
			}
		}
	},
	component: RootLayout,
})

function RootLayout() {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="font-sans antialiased">
				<Providers>
					<Outlet />
				</Providers>
				<Scripts />
			</body>
		</html>
	)
}
