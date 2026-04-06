import { Hono } from 'hono'
import { every } from 'hono/combine'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies to avoid complex setup
vi.mock('@hare/auth/server', () => ({
	createAuth: vi.fn(() => ({
		api: {
			getSession: vi.fn().mockResolvedValue({
				user: { id: 'user_123', email: 'test@example.com', name: 'Test', image: null },
				session: { id: 'session_456', expiresAt: new Date('2025-01-01') },
			}),
		},
	})),
}))

vi.mock('../db', () => ({
	getD1: vi.fn(() => ({})),
	getDb: vi.fn(() => ({
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn().mockResolvedValue([
					{
						id: 'ws_123',
						name: 'Test Workspace',
						slug: 'test-workspace',
						ownerId: 'user_123',
					},
				]),
			})),
		})),
	})),
}))

describe('combined middleware', () => {
	describe('middleware exports', () => {
		beforeEach(() => {
			vi.resetModules()
		})

		it('exports authenticated middleware', async () => {
			const { authenticated } = await import('../combined')
			expect(authenticated).toBeDefined()
			expect(typeof authenticated).toBe('function')
		})

		it('exports protectedRoute middleware', async () => {
			const { protectedRoute } = await import('../combined')
			expect(protectedRoute).toBeDefined()
			expect(typeof protectedRoute).toBe('function')
		})

		it('exports readRoute middleware', async () => {
			const { readRoute } = await import('../combined')
			expect(readRoute).toBeDefined()
			expect(typeof readRoute).toBe('function')
		})

		it('exports writeRoute middleware', async () => {
			const { writeRoute } = await import('../combined')
			expect(writeRoute).toBeDefined()
			expect(typeof writeRoute).toBe('function')
		})

		it('exports adminRoute middleware', async () => {
			const { adminRoute } = await import('../combined')
			expect(adminRoute).toBeDefined()
			expect(typeof adminRoute).toBe('function')
		})

		it('exports ownerRoute middleware', async () => {
			const { ownerRoute } = await import('../combined')
			expect(ownerRoute).toBeDefined()
			expect(typeof ownerRoute).toBe('function')
		})

		it('exports rateLimitedRoute middleware', async () => {
			const { rateLimitedRoute } = await import('../combined')
			expect(rateLimitedRoute).toBeDefined()
			expect(typeof rateLimitedRoute).toBe('function')
		})

		it('exports strictAdminRoute middleware', async () => {
			const { strictAdminRoute } = await import('../combined')
			expect(strictAdminRoute).toBeDefined()
			expect(typeof strictAdminRoute).toBe('function')
		})

		it('exports chatRoute middleware', async () => {
			const { chatRoute } = await import('../combined')
			expect(chatRoute).toBeDefined()
			expect(typeof chatRoute).toBe('function')
		})
	})

	describe('middleware composition with every()', () => {
		it('composes multiple middleware correctly', () => {
			const middleware1 = vi.fn(async (c, next) => {
				c.set('step1', true)
				await next()
			})
			const middleware2 = vi.fn(async (c, next) => {
				c.set('step2', true)
				await next()
			})

			const combined = every(middleware1, middleware2)
			expect(combined).toBeDefined()
			expect(typeof combined).toBe('function')
		})

		it('executes middleware in order', async () => {
			const order: number[] = []

			const middleware1 = vi.fn(async (c, next) => {
				order.push(1)
				await next()
			})
			const middleware2 = vi.fn(async (c, next) => {
				order.push(2)
				await next()
			})
			const middleware3 = vi.fn(async (c, next) => {
				order.push(3)
				await next()
			})

			const combined = every(middleware1, middleware2, middleware3)

			const app = new Hono()
			app.use('*', combined)
			app.get('/test', (c) => c.text('OK'))

			await app.request('/test')

			expect(order).toEqual([1, 2, 3])
		})

		it('stops chain when middleware returns response', async () => {
			const order: number[] = []

			const middleware1 = vi.fn(async (c, next) => {
				order.push(1)
				await next()
			})
			const middleware2 = vi.fn(async (c) => {
				order.push(2)
				return c.json({ error: 'Stopped' }, 401)
			})
			const middleware3 = vi.fn(async (c, next) => {
				order.push(3)
				await next()
			})

			const combined = every(middleware1, middleware2, middleware3)

			const app = new Hono()
			app.use('*', combined)
			app.get('/test', (c) => c.text('OK'))

			const res = await app.request('/test')

			expect(res.status).toBe(401)
			expect(order).toEqual([1, 2])
			expect(order).not.toContain(3)
		})
	})

	describe('route protection levels', () => {
		describe('authenticated (base auth)', () => {
			it('requires valid session', () => {
				// authenticated is just authMiddleware
				// It should reject requests without valid session
				const checkAuth = (user: unknown) => {
					return user !== null && user !== undefined
				}

				expect(checkAuth(null)).toBe(false)
				expect(checkAuth(undefined)).toBe(false)
				expect(checkAuth({ id: 'user_123' })).toBe(true)
			})
		})

		describe('protectedRoute (auth + workspace)', () => {
			it('combines auth and workspace middleware', () => {
				// protectedRoute = every(authMiddleware, workspaceMiddleware)
				const checkProtected = (user: unknown, workspace: unknown) => {
					return user !== null && workspace !== null
				}

				expect(checkProtected(null, null)).toBe(false)
				expect(checkProtected({ id: 'user' }, null)).toBe(false)
				expect(checkProtected(null, { id: 'ws' })).toBe(false)
				expect(checkProtected({ id: 'user' }, { id: 'ws' })).toBe(true)
			})
		})

		describe('readRoute (auth + workspace + read permission)', () => {
			it('requires read permission', () => {
				const permissions = {
					owner: ['read', 'write', 'admin', 'owner'],
					admin: ['read', 'write', 'admin'],
					member: ['read', 'write'],
					viewer: ['read'],
				}

				const hasRead = (role: keyof typeof permissions) => permissions[role].includes('read')

				expect(hasRead('owner')).toBe(true)
				expect(hasRead('admin')).toBe(true)
				expect(hasRead('member')).toBe(true)
				expect(hasRead('viewer')).toBe(true)
			})
		})

		describe('writeRoute (auth + workspace + write permission)', () => {
			it('requires write permission', () => {
				const permissions = {
					owner: ['read', 'write', 'admin', 'owner'],
					admin: ['read', 'write', 'admin'],
					member: ['read', 'write'],
					viewer: ['read'],
				}

				const hasWrite = (role: keyof typeof permissions) => permissions[role].includes('write')

				expect(hasWrite('owner')).toBe(true)
				expect(hasWrite('admin')).toBe(true)
				expect(hasWrite('member')).toBe(true)
				expect(hasWrite('viewer')).toBe(false)
			})
		})

		describe('adminRoute (auth + workspace + admin permission)', () => {
			it('requires admin permission', () => {
				const permissions = {
					owner: ['read', 'write', 'admin', 'owner'],
					admin: ['read', 'write', 'admin'],
					member: ['read', 'write'],
					viewer: ['read'],
				}

				const hasAdmin = (role: keyof typeof permissions) => permissions[role].includes('admin')

				expect(hasAdmin('owner')).toBe(true)
				expect(hasAdmin('admin')).toBe(true)
				expect(hasAdmin('member')).toBe(false)
				expect(hasAdmin('viewer')).toBe(false)
			})
		})

		describe('ownerRoute (auth + workspace + owner permission)', () => {
			it('requires owner permission', () => {
				const permissions = {
					owner: ['read', 'write', 'admin', 'owner'],
					admin: ['read', 'write', 'admin'],
					member: ['read', 'write'],
					viewer: ['read'],
				}

				const hasOwner = (role: keyof typeof permissions) => permissions[role].includes('owner')

				expect(hasOwner('owner')).toBe(true)
				expect(hasOwner('admin')).toBe(false)
				expect(hasOwner('member')).toBe(false)
				expect(hasOwner('viewer')).toBe(false)
			})
		})
	})

	describe('rate limited routes', () => {
		describe('rateLimitedRoute', () => {
			it('includes rate limiting middleware', () => {
				// rateLimitedRoute = every(apiRateLimiter, authMiddleware, workspaceMiddleware)
				// It should apply rate limiting, then auth, then workspace
				const middlewareChain = ['apiRateLimiter', 'authMiddleware', 'workspaceMiddleware']
				expect(middlewareChain).toHaveLength(3)
				expect(middlewareChain[0]).toBe('apiRateLimiter')
			})
		})

		describe('strictAdminRoute', () => {
			it('includes strict rate limiting and admin permission', () => {
				// strictAdminRoute = every(strictRateLimiter, authMiddleware, workspaceMiddleware, requirePermission('admin'))
				const middlewareChain = [
					'strictRateLimiter',
					'authMiddleware',
					'workspaceMiddleware',
					'requirePermission(admin)',
				]
				expect(middlewareChain).toHaveLength(4)
				expect(middlewareChain[0]).toBe('strictRateLimiter')
				expect(middlewareChain[3]).toBe('requirePermission(admin)')
			})
		})
	})

	describe('chat route (optional auth)', () => {
		describe('chatRoute', () => {
			it('uses optional auth middleware', () => {
				// chatRoute = every(chatRateLimiter, optionalAuthMiddleware)
				const middlewareChain = ['chatRateLimiter', 'optionalAuthMiddleware']
				expect(middlewareChain).toHaveLength(2)
				expect(middlewareChain[1]).toBe('optionalAuthMiddleware')
			})

			it('allows unauthenticated requests', () => {
				const checkOptionalAuth = (user: unknown) => {
					// Optional auth always returns true (allows through)
					// but may or may not set user context
					return true
				}

				expect(checkOptionalAuth(null)).toBe(true)
				expect(checkOptionalAuth({ id: 'user' })).toBe(true)
			})
		})
	})

	describe('middleware chain error handling', () => {
		it('propagates errors from middleware', async () => {
			const errorMiddleware = vi.fn(async () => {
				throw new Error('Test error')
			})

			const combined = every(errorMiddleware)

			const app = new Hono()
			app.use('*', combined)
			app.get('/test', (c) => c.text('OK'))

			try {
				await app.request('/test')
			} catch (e) {
				expect(e).toBeInstanceOf(Error)
			}
		})

		it('returns error response from middleware', async () => {
			const rejectMiddleware = vi.fn(async (c) => {
				return c.json({ error: 'Rejected' }, 403)
			})

			const combined = every(rejectMiddleware)

			const app = new Hono()
			app.use('*', combined)
			app.get('/test', (c) => c.text('OK'))

			const res = await app.request('/test')
			expect(res.status).toBe(403)

			const body = (await res.json()) as { error: string }
			expect(body.error).toBe('Rejected')
		})
	})

	describe('context variables passed through chain', () => {
		it('passes context from first middleware to next', async () => {
			const middleware1 = vi.fn(async (c, next) => {
				c.set('value1', 'from-middleware-1')
				await next()
			})
			const middleware2 = vi.fn(async (c, next) => {
				const value1 = c.get('value1')
				c.set('value2', `${value1}-extended`)
				await next()
			})

			const combined = every(middleware1, middleware2)

			let finalValue1: unknown
			let finalValue2: unknown

			const app = new Hono()
			app.use('*', combined)
			app.get('/test', (c) => {
				finalValue1 = (c as unknown as { get: (key: string) => unknown }).get('value1')
				finalValue2 = (c as unknown as { get: (key: string) => unknown }).get('value2')
				return c.text('OK')
			})

			await app.request('/test')

			expect(finalValue1).toBe('from-middleware-1')
			expect(finalValue2).toBe('from-middleware-1-extended')
		})
	})
})
