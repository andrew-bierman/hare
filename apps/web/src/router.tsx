import { ErrorComponent, NotFound, PendingComponent } from '@hare/app/widgets/router-components'
import { ROUTER_TIMING } from '@hare/config'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
	return createRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: 'intent',
		defaultNotFoundComponent: NotFound,
		defaultErrorComponent: ErrorComponent,
		defaultPendingComponent: PendingComponent,
		defaultPendingMinMs: ROUTER_TIMING.PENDING_MIN_MS,
		defaultPendingMs: ROUTER_TIMING.PENDING_MS,
	})
}

declare module '@tanstack/react-router' {
	interface Register {
		router: ReturnType<typeof getRouter>
	}
}
