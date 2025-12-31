import { ErrorComponent, NotFound, PendingComponent } from '@hare/app/widgets/router-components'
import { Config } from '@hare/config'
import { createRouter } from '@tanstack/react-router'
import type { RouterContext } from './router-context'
import { routeTree } from './routeTree.gen'

export function getRouter() {
	return createRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: 'intent',
		defaultNotFoundComponent: NotFound,
		defaultErrorComponent: ErrorComponent,
		defaultPendingComponent: PendingComponent,
		defaultPendingMinMs: Config.ui.timing.router.pendingMinMs,
		defaultPendingMs: Config.ui.timing.router.pendingMs,
		// Initial context - will be populated by root route's beforeLoad
		context: {
			auth: {
				isAuthenticated: false,
				user: null,
			},
		} satisfies RouterContext,
	})
}

declare module '@tanstack/react-router' {
	interface Register {
		router: ReturnType<typeof getRouter>
	}
}
