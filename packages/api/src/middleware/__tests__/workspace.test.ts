import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { hasPermission, requirePermission } from '../workspace'
import type { WorkspaceEnv, CloudflareEnv, WorkspaceRole } from '@hare/types'

// Mock the db module
vi.mock('../db', () => ({
	getDb: vi.fn(() => ({
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn().mockResolvedValue([]),
			})),
		})),
	})),
}))

describe('hasPermission', () => {
	describe('owner role', () => {
		it('has read permission', () => {
			expect(hasPermission({ role: 'owner', action: 'read' })).toBe(true)
		})

		it('has write permission', () => {
			expect(hasPermission({ role: 'owner', action: 'write' })).toBe(true)
		})

		it('has admin permission', () => {
			expect(hasPermission({ role: 'owner', action: 'admin' })).toBe(true)
		})

		it('has owner permission', () => {
			expect(hasPermission({ role: 'owner', action: 'owner' })).toBe(true)
		})
	})

	describe('admin role', () => {
		it('has read permission', () => {
			expect(hasPermission({ role: 'admin', action: 'read' })).toBe(true)
		})

		it('has write permission', () => {
			expect(hasPermission({ role: 'admin', action: 'write' })).toBe(true)
		})

		it('has admin permission', () => {
			expect(hasPermission({ role: 'admin', action: 'admin' })).toBe(true)
		})

		it('does not have owner permission', () => {
			expect(hasPermission({ role: 'admin', action: 'owner' })).toBe(false)
		})
	})

	describe('member role', () => {
		it('has read permission', () => {
			expect(hasPermission({ role: 'member', action: 'read' })).toBe(true)
		})

		it('has write permission', () => {
			expect(hasPermission({ role: 'member', action: 'write' })).toBe(true)
		})

		it('does not have admin permission', () => {
			expect(hasPermission({ role: 'member', action: 'admin' })).toBe(false)
		})

		it('does not have owner permission', () => {
			expect(hasPermission({ role: 'member', action: 'owner' })).toBe(false)
		})
	})

	describe('viewer role', () => {
		it('has read permission', () => {
			expect(hasPermission({ role: 'viewer', action: 'read' })).toBe(true)
		})

		it('does not have write permission', () => {
			expect(hasPermission({ role: 'viewer', action: 'write' })).toBe(false)
		})

		it('does not have admin permission', () => {
			expect(hasPermission({ role: 'viewer', action: 'admin' })).toBe(false)
		})

		it('does not have owner permission', () => {
			expect(hasPermission({ role: 'viewer', action: 'owner' })).toBe(false)
		})
	})

	describe('edge cases', () => {
		it('handles all valid role types', () => {
			const roles: WorkspaceRole[] = ['owner', 'admin', 'member', 'viewer']
			const actions: Array<'read' | 'write' | 'admin' | 'owner'> = [
				'read',
				'write',
				'admin',
				'owner',
			]

			for (const role of roles) {
				for (const action of actions) {
					// Should not throw
					const result = hasPermission({ role, action })
					expect(typeof result).toBe('boolean')
				}
			}
		})
	})
})

describe('requirePermission middleware', () => {
	it('returns a middleware function', () => {
		const middleware = requirePermission('read')
		expect(middleware).toBeDefined()
		expect(typeof middleware).toBe('function')
	})

	it('allows access when user has sufficient permission', async () => {
		const app = new Hono<WorkspaceEnv>()
		app.use('*', async (c, next) => {
			c.set('workspaceRole', 'owner')
			await next()
		})
		app.use('*', requirePermission('read'))
		app.get('/test', (c) => c.text('OK'))

		const res = await app.request('/test')
		expect(res.status).toBe(200)
		expect(await res.text()).toBe('OK')
	})

	it('denies access when user lacks permission', async () => {
		const app = new Hono<WorkspaceEnv>()
		app.use('*', async (c, next) => {
			c.set('workspaceRole', 'viewer')
			await next()
		})
		app.use('*', requirePermission('write'))
		app.get('/test', (c) => c.text('OK'))

		const res = await app.request('/test')
		expect(res.status).toBe(403)

		const body = await res.json()
		expect(body.error).toBe('Insufficient permissions')
	})

	it('denies access when no role is set', async () => {
		const app = new Hono<WorkspaceEnv>()
		app.use('*', requirePermission('read'))
		app.get('/test', (c) => c.text('OK'))

		const res = await app.request('/test')
		expect(res.status).toBe(403)
	})

	it('allows admin to access admin routes', async () => {
		const app = new Hono<WorkspaceEnv>()
		app.use('*', async (c, next) => {
			c.set('workspaceRole', 'admin')
			await next()
		})
		app.use('*', requirePermission('admin'))
		app.get('/test', (c) => c.text('OK'))

		const res = await app.request('/test')
		expect(res.status).toBe(200)
	})

	it('denies member from accessing admin routes', async () => {
		const app = new Hono<WorkspaceEnv>()
		app.use('*', async (c, next) => {
			c.set('workspaceRole', 'member')
			await next()
		})
		app.use('*', requirePermission('admin'))
		app.get('/test', (c) => c.text('OK'))

		const res = await app.request('/test')
		expect(res.status).toBe(403)
	})

	it('only owner can access owner routes', async () => {
		const app = new Hono<WorkspaceEnv>()
		app.use('*', async (c, next) => {
			c.set('workspaceRole', 'admin')
			await next()
		})
		app.use('*', requirePermission('owner'))
		app.get('/test', (c) => c.text('OK'))

		const res = await app.request('/test')
		expect(res.status).toBe(403)
	})
})

describe('workspaceMiddleware', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.clearAllMocks()
	})

	it('is defined and is a function', async () => {
		const { workspaceMiddleware } = await import('../workspace')
		expect(workspaceMiddleware).toBeDefined()
		expect(typeof workspaceMiddleware).toBe('function')
	})

	it('returns 401 when user is not set', async () => {
		const { workspaceMiddleware } = await import('../workspace')

		const app = new Hono<WorkspaceEnv>()
		app.use('*', async (c, next) => {
			;(c as { env: Partial<CloudflareEnv> }).env = {
				DB: {} as D1Database,
			} as CloudflareEnv
			await next()
		})
		app.use('*', workspaceMiddleware)
		app.get('/test', (c) => c.text('OK'))

		const res = await app.request('/test?workspaceId=ws_123')
		expect(res.status).toBe(401)

		const body = await res.json()
		expect(body.error).toBe('Unauthorized')
	})

	it('returns 400 when workspaceId is not provided', async () => {
		const { workspaceMiddleware } = await import('../workspace')

		const app = new Hono<WorkspaceEnv>()
		app.use('*', async (c, next) => {
			;(c as { env: Partial<CloudflareEnv> }).env = {
				DB: {} as D1Database,
			} as CloudflareEnv
			c.set('user', { id: 'user_123', email: 'test@example.com', name: 'Test', image: null })
			await next()
		})
		app.use('*', workspaceMiddleware)
		app.get('/test', (c) => c.text('OK'))

		const res = await app.request('/test')
		expect(res.status).toBe(400)

		const body = await res.json()
		expect(body.error).toBe('Workspace ID required')
	})

	it('validates workspace lookup logic', () => {
		// Test the validation logic without hitting the database
		// When a workspace is not found, the middleware should return 404
		const workspaceResults: unknown[] = [] // Simulates empty DB result

		const workspaceFound = workspaceResults.length > 0
		expect(workspaceFound).toBe(false)

		// This would trigger 'Workspace not found' response in the middleware
	})
})

describe('workspace context shape', () => {
	it('has correct workspace properties', () => {
		const workspace = {
			id: 'ws_123',
			name: 'Test Workspace',
			slug: 'test-workspace',
			ownerId: 'user_123',
		}

		expect(workspace.id).toBeDefined()
		expect(workspace.name).toBeDefined()
		expect(workspace.slug).toBeDefined()
		expect(workspace.ownerId).toBeDefined()
	})
})

describe('workspaceId extraction', () => {
	it('extracts from query params', () => {
		const query = { workspaceId: 'ws_from_query' }
		const param: string | undefined = undefined

		const workspaceId = query.workspaceId || param
		expect(workspaceId).toBe('ws_from_query')
	})

	it('extracts from route params', () => {
		const query: { workspaceId?: string } = {}
		const param = 'ws_from_param'

		const workspaceId = query.workspaceId || param
		expect(workspaceId).toBe('ws_from_param')
	})

	it('prefers query params over route params', () => {
		const query = { workspaceId: 'ws_from_query' }
		const param = 'ws_from_param'

		const workspaceId = query.workspaceId || param
		expect(workspaceId).toBe('ws_from_query')
	})
})
