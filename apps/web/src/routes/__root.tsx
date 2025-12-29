import { Providers } from '@hare/app'
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import '@hare/ui/styles/globals.css'

export const Route = createRootRoute({
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
