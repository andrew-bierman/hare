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
		// During SSR, we can't access browser cookies, so we skip the check
		// and let the client-side handle authentication
		const isServer = typeof window === 'undefined'

		if (isServer) {
			// During SSR, return unknown auth state - client will verify
			return {
				auth: {
					isAuthenticated: false,
					user: null,
					_isSSR: true, // Flag to indicate SSR state
				},
			}
		}

		// Client-side: fetch session with proper cookies
		try {
			const session = await getSession()
			return {
				auth: {
					isAuthenticated: !!session.data?.user,
					user: session.data?.user ?? null,
					_isSSR: false,
				},
			}
		} catch {
			// If session fetch fails, treat as unauthenticated
			return {
				auth: {
					isAuthenticated: false,
					user: null,
					_isSSR: false,
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
