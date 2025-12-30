/**
 * User type for router auth context.
 */
export interface AuthUser {
	id: string
	email: string
	name: string | null
	image: string | null
}

/**
 * Router context type for TanStack Router.
 * Contains auth state that is available to all routes via context.
 *
 * @see https://tanstack.com/router/v1/docs/framework/react/guide/router-context
 */
export interface RouterContext {
	auth: {
		isAuthenticated: boolean
		user: AuthUser | null
	}
}
