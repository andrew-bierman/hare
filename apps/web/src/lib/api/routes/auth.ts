import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import {
	AuthResponseSchema,
	SignInSchema,
	SignUpSchema,
	SuccessSchema,
	UserSchema,
} from '../schemas'

// Define routes
const signUpRoute = createRoute({
	method: 'post',
	path: '/sign-up',
	tags: ['Authentication'],
	summary: 'Sign up',
	description: 'Create a new user account',
	request: {
		body: {
			content: {
				'application/json': {
					schema: SignUpSchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: 'User created successfully',
			content: {
				'application/json': {
					schema: UserSchema,
				},
			},
		},
	},
})

const signInRoute = createRoute({
	method: 'post',
	path: '/sign-in/email',
	tags: ['Authentication'],
	summary: 'Sign in with email',
	description: 'Authenticate with email and password',
	request: {
		body: {
			content: {
				'application/json': {
					schema: SignInSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Authentication successful',
			content: {
				'application/json': {
					schema: AuthResponseSchema,
				},
			},
		},
	},
})

const signOutRoute = createRoute({
	method: 'post',
	path: '/sign-out',
	tags: ['Authentication'],
	summary: 'Sign out',
	description: 'Invalidate the current session',
	responses: {
		200: {
			description: 'Sign out successful',
			content: {
				'application/json': {
					schema: SuccessSchema,
				},
			},
		},
	},
})

const getSessionRoute = createRoute({
	method: 'get',
	path: '/session',
	tags: ['Authentication'],
	summary: 'Get current session',
	description: 'Retrieve the current authenticated user session',
	responses: {
		200: {
			description: 'Current session',
			content: {
				'application/json': {
					schema: z.object({
						user: UserSchema,
					}),
				},
			},
		},
	},
})

const oauthCallbackRoute = createRoute({
	method: 'get',
	path: '/callback/{provider}',
	tags: ['Authentication'],
	summary: 'OAuth callback',
	description: 'Handle OAuth provider callback',
	request: {
		params: z.object({
			provider: z.string().openapi({ param: { name: 'provider', in: 'path' }, example: 'github' }),
		}),
	},
	responses: {
		200: {
			description: 'OAuth callback handled',
			content: {
				'application/json': {
					schema: z.object({
						provider: z.string(),
					}),
				},
			},
		},
	},
})

// Create app and register routes
const app = new OpenAPIHono()
	.openapi(signUpRoute, async (c) => {
		const data = c.req.valid('json')
		// TODO: Create user with Better Auth
		return c.json(
			{
				id: `user_${crypto.randomUUID().slice(0, 8)}`,
				email: data.email,
				name: data.name,
			},
			201,
		)
	})
	.openapi(signInRoute, async (c) => {
		const data = c.req.valid('json')
		// TODO: Authenticate with Better Auth
		return c.json({
			user: {
				id: `user_${crypto.randomUUID().slice(0, 8)}`,
				email: data.email,
				name: 'Demo User',
			},
			session: {
				token: `session_${crypto.randomUUID().slice(0, 8)}`,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
			},
		})
	})
	.openapi(signOutRoute, async (c) => {
		// TODO: Invalidate session with Better Auth
		return c.json({ success: true })
	})
	.openapi(getSessionRoute, async (c) => {
		// TODO: Get session from Better Auth
		return c.json({
			user: {
				id: 'user_xxx',
				email: 'demo@example.com',
				name: 'Demo User',
			},
		})
	})
	.openapi(oauthCallbackRoute, async (c) => {
		const { provider } = c.req.valid('param')
		// TODO: Handle OAuth callback with Better Auth
		return c.json({ provider })
	})

export default app
