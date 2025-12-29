import { Providers } from '@hare/app'
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import '@hare/ui/styles/globals.css'

export const Route = createRootRoute({
	head: () => ({
		title: 'Hare Desktop',
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
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
				<Providers>
					<Outlet />
				</Providers>
				<Scripts />
			</body>
		</html>
	)
}
