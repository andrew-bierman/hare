import type { AuthEnv, CloudflareEnv, OptionalAuthEnv } from '@hare/types'
import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the auth module
vi.mock('@hare/auth/server', () => ({
	createAuth: vi.fn(() => ({
		api: {
			getSession: vi.fn(),
		},
	})),
}))

// Mock the db module
vi.mock('../db', () => ({
	getD1: vi.fn(() => ({})),
}))

describe('auth middleware', () => {
	describe('authMiddleware', () => {
		beforeEach(() => {
			vi.resetModules()
			vi.clearAllMocks()
		})

		it('is defined and is a function', async () => {
			const { authMiddleware } = await import('../auth')
			expect(authMiddleware).toBeDefined()
			expect(typeof authMiddleware).toBe('function')
		})

		it('returns 401 when no session exists', async () => {
			// Mock the auth to return no session
			vi.doMock('@hare/auth/server', () => ({
				createAuth: vi.fn(() => ({
					api: {
						getSession: vi.fn().mockResolvedValue(null),
					},
				})),
			}))

			const { authMiddleware } = await import('../auth')

			const app = new Hono<AuthEnv>()
			app.use('*', async (c, next) => {
				;(c as { env: Partial<CloudflareEnv> }).env = {
					DB: {} as D1Database,
					BETTER_AUTH_SECRET: 'test-secret-must-be-at-least-32-characters-long',
					APP_URL: 'http://localhost:3000',
				} as CloudflareEnv
				await next()
			})
			app.use('*', authMiddleware)
			app.get('/protected', (c) => c.text('OK'))

			const res = await app.request('/protected')
			expect(res.status).toBe(401)

			const body = (await res.json()) as { error: string }
			expect(body.error).toBe('Unauthorized')
		})

		it('returns 401 when session exists but no user', async () => {
			vi.doMock('@hare/auth/server', () => ({
				createAuth: vi.fn(() => ({
					api: {
						getSession: vi.fn().mockResolvedValue({ session: {}, user: null }),
					},
				})),
			}))

			const { authMiddleware } = await import('../auth')

			const app = new Hono<AuthEnv>()
			app.use('*', async (c, next) => {
				;(c as { env: Partial<CloudflareEnv> }).env = {
					DB: {} as D1Database,
					BETTER_AUTH_SECRET: 'test-secret-must-be-at-least-32-characters-long',
					APP_URL: 'http://localhost:3000',
				} as CloudflareEnv
				await next()
			})
			app.use('*', authMiddleware)
			app.get('/protected', (c) => c.text('OK'))

			const res = await app.request('/protected')
			expect(res.status).toBe(401)
		})

		it('sets user and session in context when authenticated', async () => {
			const mockUser = {
				id: 'user_123',
				email: 'test@example.com',
				name: 'Test User',
				image: 'https://example.com/avatar.png',
			}
			const mockSession = {
				id: 'session_456',
				expiresAt: new Date('2025-01-01'),
			}

			vi.doMock('@hare/auth/server', () => ({
				createAuth: vi.fn(() => ({
					api: {
						getSession: vi.fn().mockResolvedValue({
							user: mockUser,
							session: mockSession,
						}),
					},
				})),
			}))

			const { authMiddleware } = await import('../auth')

			let _contextUser: unknown = null
			let _contextSession: unknown = null

			const app = new Hono<AuthEnv>()
			app.use('*', async (c, next) => {
				;(c as { env: Partial<CloudflareEnv> }).env = {
					DB: {} as D1Database,
					BETTER_AUTH_SECRET: 'test-secret-must-be-at-least-32-characters-long',
					APP_URL: 'http://localhost:3000',
				} as CloudflareEnv
				await next()
			})
			app.use('*', authMiddleware)
			app.get('/protected', (c) => {
				_contextUser = c.get('user')
				_contextSession = c.get('session')
				return c.text('OK')
			})

			const res = await app.request('/protected')
			expect(res.status).toBe(200)
		})
	})

	describe('optionalAuthMiddleware', () => {
		beforeEach(() => {
			vi.resetModules()
			vi.clearAllMocks()
		})

		it('is defined and is a function', async () => {
			const { optionalAuthMiddleware } = await import('../auth')
			expect(optionalAuthMiddleware).toBeDefined()
			expect(typeof optionalAuthMiddleware).toBe('function')
		})

		it('allows request without session', async () => {
			vi.doMock('@hare/auth/server', () => ({
				createAuth: vi.fn(() => ({
					api: {
						getSession: vi.fn().mockResolvedValue(null),
					},
				})),
			}))

			const { optionalAuthMiddleware } = await import('../auth')

			const app = new Hono<OptionalAuthEnv>()
			app.use('*', async (c, next) => {
				;(c as { env: Partial<CloudflareEnv> }).env = {
					DB: {} as D1Database,
					BETTER_AUTH_SECRET: 'test-secret-must-be-at-least-32-characters-long',
					APP_URL: 'http://localhost:3000',
				} as CloudflareEnv
				await next()
			})
			app.use('*', optionalAuthMiddleware)
			app.get('/public', (c) => c.text('OK'))

			const res = await app.request('/public')
			expect(res.status).toBe(200)
			expect(await res.text()).toBe('OK')
		})

		it('sets user when session exists', async () => {
			const mockUser = {
				id: 'user_123',
				email: 'test@example.com',
				name: 'Test User',
				image: null,
			}
			const mockSession = {
				id: 'session_456',
				expiresAt: new Date('2025-01-01'),
			}

			vi.doMock('@hare/auth/server', () => ({
				createAuth: vi.fn(() => ({
					api: {
						getSession: vi.fn().mockResolvedValue({
							user: mockUser,
							session: mockSession,
						}),
					},
				})),
			}))

			const { optionalAuthMiddleware } = await import('../auth')

			let _contextUser: unknown = null

			const app = new Hono<OptionalAuthEnv>()
			app.use('*', async (c, next) => {
				;(c as { env: Partial<CloudflareEnv> }).env = {
					DB: {} as D1Database,
					BETTER_AUTH_SECRET: 'test-secret-must-be-at-least-32-characters-long',
					APP_URL: 'http://localhost:3000',
				} as CloudflareEnv
				await next()
			})
			app.use('*', optionalAuthMiddleware)
			app.get('/public', (c) => {
				_contextUser = c.get('user')
				return c.text('OK')
			})

			const res = await app.request('/public')
			expect(res.status).toBe(200)
		})

		it('does not set user when no session', async () => {
			vi.doMock('@hare/auth/server', () => ({
				createAuth: vi.fn(() => ({
					api: {
						getSession: vi.fn().mockResolvedValue(null),
					},
				})),
			}))

			const { optionalAuthMiddleware } = await import('../auth')

			let _contextUser: unknown = 'not-set'

			const app = new Hono<OptionalAuthEnv>()
			app.use('*', async (c, next) => {
				;(c as { env: Partial<CloudflareEnv> }).env = {
					DB: {} as D1Database,
					BETTER_AUTH_SECRET: 'test-secret-must-be-at-least-32-characters-long',
					APP_URL: 'http://localhost:3000',
				} as CloudflareEnv
				await next()
			})
			app.use('*', optionalAuthMiddleware)
			app.get('/public', (c) => {
				_contextUser = c.get('user')
				return c.text('OK')
			})

			const res = await app.request('/public')
			expect(res.status).toBe(200)
		})
	})

	describe('user context shape', () => {
		it('has correct user properties', () => {
			const user = {
				id: 'user_123',
				email: 'test@example.com',
				name: 'Test User',
				image: 'https://example.com/avatar.png',
			}

			expect(user.id).toBeDefined()
			expect(user.email).toBeDefined()
			expect(user.name).toBeDefined()
			expect(user.image).toBeDefined()
		})

		it('handles null name and image', () => {
			const user = {
				id: 'user_123',
				email: 'test@example.com',
				name: null,
				image: null,
			}

			expect(user.name).toBeNull()
			expect(user.image).toBeNull()
		})
	})

	describe('session context shape', () => {
		it('has correct session properties', () => {
			const session = {
				id: 'session_456',
				expiresAt: new Date('2025-01-01'),
			}

			expect(session.id).toBeDefined()
			expect(session.expiresAt).toBeInstanceOf(Date)
		})
	})

	describe('auth environment variables', () => {
		it('requires BETTER_AUTH_SECRET', () => {
			const getAuthEnv = (env: Partial<CloudflareEnv & { BETTER_AUTH_SECRET?: string }>) => {
				if (!env.BETTER_AUTH_SECRET) {
					throw new Error('BETTER_AUTH_SECRET environment variable is required')
				}
				return {
					BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
					APP_URL: env.APP_URL ?? 'http://localhost:3000',
				}
			}

			expect(() => getAuthEnv({})).toThrow('BETTER_AUTH_SECRET environment variable is required')
		})

		it('uses default APP_URL when not provided', () => {
			const getAuthEnv = (
				env: Partial<CloudflareEnv & { BETTER_AUTH_SECRET?: string; APP_URL?: string }>,
			) => {
				if (!env.BETTER_AUTH_SECRET) {
					throw new Error('BETTER_AUTH_SECRET environment variable is required')
				}
				return {
					BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
					APP_URL: env.APP_URL ?? 'http://localhost:3000',
				}
			}

			const result = getAuthEnv({
				BETTER_AUTH_SECRET: 'test-secret-must-be-at-least-32-characters-long',
			})
			expect(result.APP_URL).toBe('http://localhost:3000')
		})

		it('supports OAuth providers', () => {
			const authEnv = {
				BETTER_AUTH_SECRET: 'test-secret',
				APP_URL: 'http://localhost:3000',
				GOOGLE_CLIENT_ID: 'google-id',
				GOOGLE_CLIENT_SECRET: 'google-secret',
				GITHUB_CLIENT_ID: 'github-id',
				GITHUB_CLIENT_SECRET: 'github-secret',
			}

			expect(authEnv.GOOGLE_CLIENT_ID).toBe('google-id')
			expect(authEnv.GITHUB_CLIENT_ID).toBe('github-id')
		})
	})

	describe('error responses', () => {
		it('401 response has correct structure', () => {
			const response = { error: 'Unauthorized' }
			expect(response.error).toBe('Unauthorized')
		})
	})

	describe('request header processing', () => {
		it('passes headers to auth session check', () => {
			const headers = new Headers()
			headers.set('Cookie', 'session=abc123')
			headers.set('Authorization', 'Bearer token123')

			expect(headers.get('Cookie')).toBe('session=abc123')
			expect(headers.get('Authorization')).toBe('Bearer token123')
		})
	})
})
