import './styles.css'

import { queryClient, WorkspaceProvider } from '@hare/app/app'
import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import { routeTree } from './routeTree.gen'

// Create the router
const router = createRouter({
	routeTree,
	context: {
		queryClient,
	},
	defaultPreload: 'intent',
})

// Register router for type safety
declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}

// Render app
const rootElement = document.getElementById('root')
if (rootElement) {
	createRoot(rootElement).render(
		<StrictMode>
			<QueryClientProvider client={queryClient}>
				<WorkspaceProvider>
					<RouterProvider router={router} />
					<Toaster position="bottom-right" />
				</WorkspaceProvider>
			</QueryClientProvider>
		</StrictMode>,
	)
}
