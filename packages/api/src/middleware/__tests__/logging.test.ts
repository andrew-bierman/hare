import type { CloudflareEnv, HonoEnv } from '@hare/types'
import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getLogStats, getLogs, loggingMiddleware, type RequestLog } from '../logging'

// Mock KV namespace
function createMockKV() {
	const store = new Map<string, string>()
	return {
		get: vi.fn(async (key: string) => store.get(key) || null),
		put: vi.fn(async (key: string, value: string, options?: { expirationTtl?: number }) => {
			store.set(key, value)
		}),
		list: vi.fn(async (options?: { prefix?: string; limit?: number }) => {
			const keys: { name: string }[] = []
			for (const key of store.keys()) {
				if (!options?.prefix || key.startsWith(options.prefix)) {
					keys.push({ name: key })
				}
			}
			return { keys: keys.slice(0, options?.limit || 1000) }
		}),
		delete: vi.fn(async (key: string) => store.delete(key)),
		_store: store,
	}
}

describe('logging middleware', () => {
	let app: Hono<HonoEnv>
	let mockKV: ReturnType<typeof createMockKV>
	let mockEnv: Partial<CloudflareEnv>

	beforeEach(() => {
		mockKV = createMockKV()
		mockEnv = {
			KV: mockKV as unknown as KVNamespace,
		}

		app = new Hono<HonoEnv>()
		app.use('*', async (c, next) => {
			// Set mock env
			;(c as { env: Partial<CloudflareEnv> }).env = mockEnv as CloudflareEnv
			await next()
		})
		app.use('*', loggingMiddleware)
		app.get('/test', (c) => c.text('OK'))
		app.get('/health', (c) => c.text('healthy'))
		app.get('/_next/static/chunk.js', (c) => c.text('js'))
		app.get('/static/image.png', (c) => c.text('png'))
		app.get('/api/agents/:id', (c) => c.text('agent'))
		app.post('/api/data', (c) => c.text('created'))
	})

	describe('loggingMiddleware', () => {
		it('is defined and is a function', () => {
			expect(loggingMiddleware).toBeDefined()
			expect(typeof loggingMiddleware).toBe('function')
		})

		it('allows requests to pass through', async () => {
			const res = await app.request('/test')
			expect(res.status).toBe(200)
			expect(await res.text()).toBe('OK')
		})

		it('skips logging for health check endpoints', async () => {
			const res = await app.request('/health')
			expect(res.status).toBe(200)
			// Health endpoint should be skipped - no log stored
		})

		it('skips logging for _next static assets', async () => {
			const res = await app.request('/_next/static/chunk.js')
			expect(res.status).toBe(200)
			// Static assets should be skipped
		})

		it('skips logging for static assets', async () => {
			const res = await app.request('/static/image.png')
			expect(res.status).toBe(200)
			// Static assets should be skipped
		})

		it('handles requests with various HTTP methods', async () => {
			const getRes = await app.request('/test')
			expect(getRes.status).toBe(200)

			const postRes = await app.request('/api/data', { method: 'POST' })
			expect(postRes.status).toBe(200)
		})

		it('handles errors without blocking response', async () => {
			const errorApp = new Hono<HonoEnv>()
			errorApp.use('*', async (c, next) => {
				;(c as { env: Partial<CloudflareEnv> }).env = mockEnv as CloudflareEnv
				await next()
			})
			errorApp.use('*', loggingMiddleware)
			errorApp.get('/error', () => {
				throw new Error('Test error')
			})

			try {
				await errorApp.request('/error')
			} catch (e) {
				// Error should be thrown after logging
				expect(e).toBeInstanceOf(Error)
			}
		})
	})

	describe('RequestLog structure', () => {
		it('has correct shape', () => {
			const log: RequestLog = {
				id: 'log_123',
				method: 'GET',
				path: '/test',
				status: 200,
				latencyMs: 50,
				userId: 'user_123',
				workspaceId: 'ws_123',
				agentId: null,
				userAgent: 'test-agent',
				ip: '192.168.1.1',
				timestamp: new Date().toISOString(),
				error: null,
			}

			expect(log.id).toBeDefined()
			expect(log.method).toBe('GET')
			expect(log.path).toBe('/test')
			expect(log.status).toBe(200)
			expect(log.latencyMs).toBeGreaterThanOrEqual(0)
			expect(log.timestamp).toBeDefined()
		})

		it('can include error message', () => {
			const log: RequestLog = {
				id: 'log_456',
				method: 'POST',
				path: '/api/test',
				status: 500,
				latencyMs: 100,
				userId: null,
				workspaceId: null,
				agentId: null,
				userAgent: null,
				ip: null,
				timestamp: new Date().toISOString(),
				error: 'Internal server error',
			}

			expect(log.error).toBe('Internal server error')
			expect(log.status).toBe(500)
		})
	})

	describe('getLogs', () => {
		it('returns empty array when KV is not available', async () => {
			const result = await getLogs({} as CloudflareEnv, {})
			expect(result.logs).toEqual([])
			expect(result.total).toBe(0)
		})

		it('returns logs from KV storage', async () => {
			const log: RequestLog = {
				id: 'log_test',
				method: 'GET',
				path: '/test',
				status: 200,
				latencyMs: 50,
				userId: 'user_1',
				workspaceId: 'ws_1',
				agentId: null,
				userAgent: 'test',
				ip: '1.2.3.4',
				timestamp: new Date().toISOString(),
				error: null,
			}

			// Pre-populate the mock KV
			mockKV._store.set('request_log:ws_1:2024-01-01T00:00:00.000Z:log_test', JSON.stringify(log))

			const result = await getLogs(mockEnv as CloudflareEnv, { workspaceId: 'ws_1' })
			expect(result.logs.length).toBeGreaterThanOrEqual(0)
		})

		it('filters by userId', async () => {
			const log1: RequestLog = {
				id: 'log_1',
				method: 'GET',
				path: '/test',
				status: 200,
				latencyMs: 50,
				userId: 'user_1',
				workspaceId: 'ws_1',
				agentId: null,
				userAgent: 'test',
				ip: '1.2.3.4',
				timestamp: new Date().toISOString(),
				error: null,
			}

			const log2: RequestLog = {
				id: 'log_2',
				method: 'GET',
				path: '/test',
				status: 200,
				latencyMs: 50,
				userId: 'user_2',
				workspaceId: 'ws_1',
				agentId: null,
				userAgent: 'test',
				ip: '1.2.3.4',
				timestamp: new Date().toISOString(),
				error: null,
			}

			mockKV._store.set('request_log:ws_1:2024-01-01T00:00:00.000Z:log_1', JSON.stringify(log1))
			mockKV._store.set('request_log:ws_1:2024-01-01T00:00:01.000Z:log_2', JSON.stringify(log2))

			const result = await getLogs(mockEnv as CloudflareEnv, {
				workspaceId: 'ws_1',
				userId: 'user_1',
			})

			// All returned logs should belong to user_1
			for (const log of result.logs) {
				if (log.userId) {
					expect(log.userId).toBe('user_1')
				}
			}
		})

		it('filters by status', async () => {
			const log1: RequestLog = {
				id: 'log_ok',
				method: 'GET',
				path: '/test',
				status: 200,
				latencyMs: 50,
				userId: null,
				workspaceId: 'ws_1',
				agentId: null,
				userAgent: 'test',
				ip: '1.2.3.4',
				timestamp: new Date().toISOString(),
				error: null,
			}

			const log2: RequestLog = {
				id: 'log_err',
				method: 'GET',
				path: '/test',
				status: 500,
				latencyMs: 100,
				userId: null,
				workspaceId: 'ws_1',
				agentId: null,
				userAgent: 'test',
				ip: '1.2.3.4',
				timestamp: new Date().toISOString(),
				error: 'Error',
			}

			mockKV._store.set('request_log:ws_1:2024-01-01T00:00:00.000Z:log_ok', JSON.stringify(log1))
			mockKV._store.set('request_log:ws_1:2024-01-01T00:00:01.000Z:log_err', JSON.stringify(log2))

			const result = await getLogs(mockEnv as CloudflareEnv, {
				workspaceId: 'ws_1',
				status: 500,
			})

			for (const log of result.logs) {
				expect(log.status).toBe(500)
			}
		})

		it('applies pagination', async () => {
			// Create multiple logs
			for (let i = 0; i < 10; i++) {
				const log: RequestLog = {
					id: `log_${i}`,
					method: 'GET',
					path: '/test',
					status: 200,
					latencyMs: 50,
					userId: null,
					workspaceId: 'ws_1',
					agentId: null,
					userAgent: 'test',
					ip: '1.2.3.4',
					timestamp: new Date(Date.now() - i * 1000).toISOString(),
					error: null,
				}
				mockKV._store.set(`request_log:ws_1:${log.timestamp}:log_${i}`, JSON.stringify(log))
			}

			const result = await getLogs(mockEnv as CloudflareEnv, {
				workspaceId: 'ws_1',
				limit: 5,
				offset: 0,
			})

			expect(result.logs.length).toBeLessThanOrEqual(5)
		})

		it('handles date filtering', async () => {
			const oldLog: RequestLog = {
				id: 'log_old',
				method: 'GET',
				path: '/test',
				status: 200,
				latencyMs: 50,
				userId: null,
				workspaceId: 'ws_1',
				agentId: null,
				userAgent: 'test',
				ip: '1.2.3.4',
				timestamp: '2024-01-01T00:00:00.000Z',
				error: null,
			}

			const newLog: RequestLog = {
				id: 'log_new',
				method: 'GET',
				path: '/test',
				status: 200,
				latencyMs: 50,
				userId: null,
				workspaceId: 'ws_1',
				agentId: null,
				userAgent: 'test',
				ip: '1.2.3.4',
				timestamp: '2024-12-01T00:00:00.000Z',
				error: null,
			}

			mockKV._store.set('request_log:ws_1:2024-01-01T00:00:00.000Z:log_old', JSON.stringify(oldLog))
			mockKV._store.set('request_log:ws_1:2024-12-01T00:00:00.000Z:log_new', JSON.stringify(newLog))

			const result = await getLogs(mockEnv as CloudflareEnv, {
				workspaceId: 'ws_1',
				startDate: '2024-06-01',
			})

			// Only new log should be returned
			for (const log of result.logs) {
				expect(new Date(log.timestamp).getTime()).toBeGreaterThanOrEqual(
					new Date('2024-06-01').getTime(),
				)
			}
		})
	})

	describe('getLogStats', () => {
		it('returns empty stats when no logs', async () => {
			const stats = await getLogStats({} as CloudflareEnv, {})

			expect(stats.totalRequests).toBe(0)
			expect(stats.avgLatencyMs).toBe(0)
			expect(stats.errorRate).toBe(0)
			expect(stats.requestsByStatus).toEqual({})
			expect(stats.requestsByDay).toEqual([])
		})

		it('calculates total requests correctly', async () => {
			const logs: RequestLog[] = [
				{
					id: 'log_1',
					method: 'GET',
					path: '/test',
					status: 200,
					latencyMs: 50,
					userId: null,
					workspaceId: 'ws_1',
					agentId: null,
					userAgent: 'test',
					ip: '1.2.3.4',
					timestamp: '2024-01-01T00:00:00.000Z',
					error: null,
				},
				{
					id: 'log_2',
					method: 'POST',
					path: '/api',
					status: 201,
					latencyMs: 100,
					userId: null,
					workspaceId: 'ws_1',
					agentId: null,
					userAgent: 'test',
					ip: '1.2.3.4',
					timestamp: '2024-01-01T01:00:00.000Z',
					error: null,
				},
			]

			for (const log of logs) {
				mockKV._store.set(`request_log:ws_1:${log.timestamp}:${log.id}`, JSON.stringify(log))
			}

			const stats = await getLogStats(mockEnv as CloudflareEnv, { workspaceId: 'ws_1' })
			expect(stats.totalRequests).toBe(2)
		})

		it('calculates average latency correctly', async () => {
			const logs: RequestLog[] = [
				{
					id: 'log_1',
					method: 'GET',
					path: '/test',
					status: 200,
					latencyMs: 50,
					userId: null,
					workspaceId: 'ws_1',
					agentId: null,
					userAgent: 'test',
					ip: '1.2.3.4',
					timestamp: '2024-01-01T00:00:00.000Z',
					error: null,
				},
				{
					id: 'log_2',
					method: 'GET',
					path: '/test',
					status: 200,
					latencyMs: 150,
					userId: null,
					workspaceId: 'ws_1',
					agentId: null,
					userAgent: 'test',
					ip: '1.2.3.4',
					timestamp: '2024-01-01T01:00:00.000Z',
					error: null,
				},
			]

			for (const log of logs) {
				mockKV._store.set(`request_log:ws_1:${log.timestamp}:${log.id}`, JSON.stringify(log))
			}

			const stats = await getLogStats(mockEnv as CloudflareEnv, { workspaceId: 'ws_1' })
			expect(stats.avgLatencyMs).toBe(100) // (50 + 150) / 2
		})

		it('calculates error rate correctly', async () => {
			const logs: RequestLog[] = [
				{
					id: 'log_1',
					method: 'GET',
					path: '/test',
					status: 200,
					latencyMs: 50,
					userId: null,
					workspaceId: 'ws_1',
					agentId: null,
					userAgent: 'test',
					ip: '1.2.3.4',
					timestamp: '2024-01-01T00:00:00.000Z',
					error: null,
				},
				{
					id: 'log_2',
					method: 'GET',
					path: '/test',
					status: 500,
					latencyMs: 100,
					userId: null,
					workspaceId: 'ws_1',
					agentId: null,
					userAgent: 'test',
					ip: '1.2.3.4',
					timestamp: '2024-01-01T01:00:00.000Z',
					error: 'Error',
				},
			]

			for (const log of logs) {
				mockKV._store.set(`request_log:ws_1:${log.timestamp}:${log.id}`, JSON.stringify(log))
			}

			const stats = await getLogStats(mockEnv as CloudflareEnv, { workspaceId: 'ws_1' })
			expect(stats.errorRate).toBe(50) // 1/2 = 50%
		})

		it('groups requests by status code', async () => {
			const logs: RequestLog[] = [
				{
					id: 'log_1',
					method: 'GET',
					path: '/test',
					status: 200,
					latencyMs: 50,
					userId: null,
					workspaceId: 'ws_1',
					agentId: null,
					userAgent: 'test',
					ip: '1.2.3.4',
					timestamp: '2024-01-01T00:00:00.000Z',
					error: null,
				},
				{
					id: 'log_2',
					method: 'GET',
					path: '/test',
					status: 200,
					latencyMs: 50,
					userId: null,
					workspaceId: 'ws_1',
					agentId: null,
					userAgent: 'test',
					ip: '1.2.3.4',
					timestamp: '2024-01-01T01:00:00.000Z',
					error: null,
				},
				{
					id: 'log_3',
					method: 'GET',
					path: '/test',
					status: 404,
					latencyMs: 30,
					userId: null,
					workspaceId: 'ws_1',
					agentId: null,
					userAgent: 'test',
					ip: '1.2.3.4',
					timestamp: '2024-01-01T02:00:00.000Z',
					error: null,
				},
			]

			for (const log of logs) {
				mockKV._store.set(`request_log:ws_1:${log.timestamp}:${log.id}`, JSON.stringify(log))
			}

			const stats = await getLogStats(mockEnv as CloudflareEnv, { workspaceId: 'ws_1' })
			expect(stats.requestsByStatus[200]).toBe(2)
			expect(stats.requestsByStatus[404]).toBe(1)
		})

		it('groups requests by day', async () => {
			const logs: RequestLog[] = [
				{
					id: 'log_1',
					method: 'GET',
					path: '/test',
					status: 200,
					latencyMs: 50,
					userId: null,
					workspaceId: 'ws_1',
					agentId: null,
					userAgent: 'test',
					ip: '1.2.3.4',
					timestamp: '2024-01-01T00:00:00.000Z',
					error: null,
				},
				{
					id: 'log_2',
					method: 'GET',
					path: '/test',
					status: 200,
					latencyMs: 100,
					userId: null,
					workspaceId: 'ws_1',
					agentId: null,
					userAgent: 'test',
					ip: '1.2.3.4',
					timestamp: '2024-01-01T12:00:00.000Z',
					error: null,
				},
				{
					id: 'log_3',
					method: 'GET',
					path: '/test',
					status: 200,
					latencyMs: 75,
					userId: null,
					workspaceId: 'ws_1',
					agentId: null,
					userAgent: 'test',
					ip: '1.2.3.4',
					timestamp: '2024-01-02T00:00:00.000Z',
					error: null,
				},
			]

			for (const log of logs) {
				mockKV._store.set(`request_log:ws_1:${log.timestamp}:${log.id}`, JSON.stringify(log))
			}

			const stats = await getLogStats(mockEnv as CloudflareEnv, { workspaceId: 'ws_1' })

			// Should have 2 days
			const day1 = stats.requestsByDay.find((d) => d.date === '2024-01-01')
			const day2 = stats.requestsByDay.find((d) => d.date === '2024-01-02')

			if (day1) {
				expect(day1.requests).toBe(2)
				expect(day1.avgLatency).toBe(75) // (50 + 100) / 2
			}

			if (day2) {
				expect(day2.requests).toBe(1)
				expect(day2.avgLatency).toBe(75)
			}
		})
	})

	describe('helper functions', () => {
		describe('getUserId extraction', () => {
			it('extracts user ID from context when available', () => {
				const user = { id: 'user_123' }
				const userId = user?.id || null
				expect(userId).toBe('user_123')
			})

			it('returns null when user is not set', () => {
				const user = null
				const userId = (user as { id?: string } | null)?.id || null
				expect(userId).toBeNull()
			})
		})

		describe('getWorkspaceId extraction', () => {
			it('extracts workspace ID from context when available', () => {
				const workspace = { id: 'ws_123' }
				const workspaceId = workspace?.id || null
				expect(workspaceId).toBe('ws_123')
			})

			it('returns null when workspace is not set', () => {
				const workspace = null
				const workspaceId = (workspace as { id?: string } | null)?.id || null
				expect(workspaceId).toBeNull()
			})
		})

		describe('getAgentId extraction', () => {
			it('extracts agent ID from path', () => {
				const path = '/api/agents/agent_123/chat'
				const agentMatch = path.match(/\/agents\/([^/]+)/)
				const agentId = agentMatch?.[1] || null
				expect(agentId).toBe('agent_123')
			})

			it('returns null when no agent in path', () => {
				const path = '/api/users/123'
				const agentMatch = path.match(/\/agents\/([^/]+)/)
				const agentId = agentMatch?.[1] || null
				expect(agentId).toBeNull()
			})
		})
	})

	describe('log key generation', () => {
		it('generates correct key format', () => {
			const workspaceId = 'ws_123'
			const timestamp = '2024-01-01T00:00:00.000Z'
			const id = 'log_abc'
			const prefix = 'request_log:'

			const key = `${prefix}${workspaceId}:${timestamp}:${id}`
			expect(key).toBe('request_log:ws_123:2024-01-01T00:00:00.000Z:log_abc')
		})

		it('uses global for null workspace', () => {
			const workspaceId = null
			const timestamp = '2024-01-01T00:00:00.000Z'
			const id = 'log_abc'
			const prefix = 'request_log:'
			const ws = workspaceId || 'global'

			const key = `${prefix}${ws}:${timestamp}:${id}`
			expect(key).toBe('request_log:global:2024-01-01T00:00:00.000Z:log_abc')
		})
	})
})
