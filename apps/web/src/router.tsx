import { createRouter } from '@tanstack/react-router'
import { ErrorComponent, NotFound, PendingComponent } from '@hare/app/widgets'
import { routeTree } from './routeTree.gen'

export function getRouter() {
	return createRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: 'intent',
		defaultNotFoundComponent: NotFound,
		defaultErrorComponent: ErrorComponent,
		defaultPendingComponent: PendingComponent,
		defaultPendingMinMs: 200,
		defaultPendingMs: 100,
	})
}

declare module '@tanstack/react-router' {
	interface Register {
		router: ReturnType<typeof getRouter>
	}
}
