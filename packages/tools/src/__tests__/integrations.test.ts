import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
	zapierSaveTool,
	zapierListTool,
	zapierTriggerTool,
	zapierDeleteTool,
	zapierTestTool,
	zapierTool,
	webhookTool,
	getIntegrationTools,
} from '../integrations'
import type { ToolContext } from '../types'
import { createFetchMock } from './test-utils'

// Mock KV namespace for integration storage
const createMockKV = () => {
	const storage = new Map<string, string>()

	return {
		get: vi.fn(async (key: string, type?: string) => {
			const value = storage.get(key)
			if (!value) return null
			if (type === 'json') return JSON.parse(value)
			return value
		}),
		put: vi.fn(async (key: string, value: string) => {
			storage.set(key, value)
		}),
		delete: vi.fn(async (key: string) => {
			storage.delete(key)
		}),
		list: vi.fn(async (options?: KVNamespaceListOptions) => {
			const keys = Array.from(storage.keys())
				.filter((k) => !options?.prefix || k.startsWith(options.prefix))
				.map((name) => ({ name }))
				.slice(0, options?.limit || 100)
			return { keys, list_complete: true }
		}),
		_storage: storage,
	}
}

const createMockContext = (kv?: ReturnType<typeof createMockKV>): ToolContext => ({
	env: {
		KV: kv as unknown as KVNamespace,
	} as ToolContext['env'],
	workspaceId: 'test-workspace',
	userId: 'test-user',
})

// Mock fetch globally
const originalFetch = globalThis.fetch

describe('Integration Tools', () => {
	let context: ToolContext
	let mockKV: ReturnType<typeof createMockKV>
	let mockFetch: ReturnType<typeof vi.fn>

	beforeEach(() => {
		mockKV = createMockKV()
		context = createMockContext(mockKV)
		mockFetch = vi.fn()
		globalThis.fetch = createFetchMock(mockFetch)
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		vi.clearAllMocks()
	})

	describe('zapierSaveTool', () => {
		describe('schema validation', () => {
			it('has correct tool id and description', () => {
				expect(zapierSaveTool.id).toBe('zapier_save')
				expect(zapierSaveTool.description).toContain('Save a Zapier webhook URL')
			})

			it('validates valid save request', () => {
				const result = zapierSaveTool.inputSchema.safeParse({
					name: 'notify-slack',
					webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
					description: 'Posts messages to Slack',
				})
				expect(result.success).toBe(true)
			})

			it('validates save request with defaultData', () => {
				const result = zapierSaveTool.inputSchema.safeParse({
					name: 'notify-slack',
					webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
					description: 'Posts messages to Slack',
					defaultData: { channel: '#general' },
				})
				expect(result.success).toBe(true)
			})

			it('rejects invalid name format', () => {
				const result = zapierSaveTool.inputSchema.safeParse({
					name: 'Invalid Name',
					webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
					description: 'Test',
				})
				expect(result.success).toBe(false)
			})

			it('rejects name with special characters', () => {
				const result = zapierSaveTool.inputSchema.safeParse({
					name: 'test..integration',
					webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
					description: 'Test',
				})
				expect(result.success).toBe(false)
			})

			it('rejects invalid URL', () => {
				const result = zapierSaveTool.inputSchema.safeParse({
					name: 'test-integration',
					webhookUrl: 'not-a-url',
					description: 'Test',
				})
				expect(result.success).toBe(false)
			})

			it('rejects missing required fields', () => {
				expect(zapierSaveTool.inputSchema.safeParse({ name: 'test' }).success).toBe(false)
				expect(
					zapierSaveTool.inputSchema.safeParse({
						webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
					}).success,
				).toBe(false)
			})
		})

		describe('execution', () => {
			it('saves new integration successfully', async () => {
				const result = await zapierSaveTool.execute(
					{
						name: 'notify-slack',
						webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
						description: 'Posts messages to Slack',
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.saved).toBe(true)
				expect(result.data?.name).toBe('notify-slack')
				expect(result.data?.updated).toBe(false)
				expect(mockKV.put).toHaveBeenCalled()
			})

			it('updates existing integration', async () => {
				// First save
				mockKV._storage.set(
					'ws/test-workspace/zapier/notify-slack',
					JSON.stringify({
						name: 'notify-slack',
						webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/old',
						description: 'Old description',
						createdAt: '2024-01-01T00:00:00.000Z',
						triggerCount: 5,
					}),
				)

				const result = await zapierSaveTool.execute(
					{
						name: 'notify-slack',
						webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/new',
						description: 'New description',
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.updated).toBe(true)
			})

			it('rejects non-Zapier URLs', async () => {
				const result = await zapierSaveTool.execute(
					{
						name: 'test-integration',
						webhookUrl: 'https://example.com/webhook',
						description: 'Test',
					},
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('hooks.zapier.com')
			})

			it('fails when KV namespace is not available', async () => {
				const contextWithoutKV = createMockContext()
				contextWithoutKV.env.KV = undefined as unknown as KVNamespace

				const result = await zapierSaveTool.execute(
					{
						name: 'test',
						webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
						description: 'Test',
					},
					contextWithoutKV,
				)

				expect(result.success).toBe(false)
				expect(result.error).toBe('KV namespace not available')
			})
		})
	})

	describe('zapierListTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(zapierListTool.id).toBe('zapier_list')
			})

			it('validates empty options', () => {
				const result = zapierListTool.inputSchema.safeParse({})
				expect(result.success).toBe(true)
			})

			it('validates with includeStats option', () => {
				const result = zapierListTool.inputSchema.safeParse({ includeStats: false })
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('lists all integrations', async () => {
				mockKV._storage.set(
					'ws/test-workspace/zapier/notify-slack',
					JSON.stringify({
						name: 'notify-slack',
						webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
						description: 'Posts to Slack',
						triggerCount: 10,
						lastTriggeredAt: '2024-01-15T12:00:00.000Z',
					}),
				)

				const result = await zapierListTool.execute({ includeStats: true }, context)

				expect(result.success).toBe(true)
				expect(result.data?.count).toBeGreaterThan(0)
				expect(result.data?.integrations[0]?.name).toBe('notify-slack')
			})

			it('returns empty list when no integrations', async () => {
				const result = await zapierListTool.execute({ includeStats: true }, context)

				expect(result.success).toBe(true)
				expect(result.data?.integrations).toEqual([])
				expect(result.data?.count).toBe(0)
				expect(result.data?.message).toContain('No integrations saved yet')
			})

			it('excludes stats when includeStats is false', async () => {
				mockKV._storage.set(
					'ws/test-workspace/zapier/test',
					JSON.stringify({
						name: 'test',
						webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
						description: 'Test',
						triggerCount: 5,
						lastTriggeredAt: '2024-01-01T00:00:00.000Z',
					}),
				)

				const result = await zapierListTool.execute({ includeStats: false }, context)

				expect(result.success).toBe(true)
				expect(result.data?.integrations[0]).not.toHaveProperty('triggerCount')
				expect(result.data?.integrations[0]).not.toHaveProperty('lastTriggeredAt')
			})

			it('fails when KV namespace is not available', async () => {
				const contextWithoutKV = createMockContext()
				contextWithoutKV.env.KV = undefined as unknown as KVNamespace

				const result = await zapierListTool.execute({ includeStats: true }, contextWithoutKV)

				expect(result.success).toBe(false)
				expect(result.error).toBe('KV namespace not available')
			})
		})
	})

	describe('zapierTriggerTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(zapierTriggerTool.id).toBe('zapier_trigger')
			})

			it('validates trigger by name', () => {
				const result = zapierTriggerTool.inputSchema.safeParse({
					name: 'notify-slack',
					data: { message: 'Hello!' },
				})
				expect(result.success).toBe(true)
			})

			it('validates trigger by URL', () => {
				const result = zapierTriggerTool.inputSchema.safeParse({
					webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
					data: { message: 'Hello!' },
				})
				expect(result.success).toBe(true)
			})

			it('validates with waitForResponse', () => {
				const result = zapierTriggerTool.inputSchema.safeParse({
					webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
					waitForResponse: true,
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('triggers integration by name', async () => {
				mockKV._storage.set(
					'ws/test-workspace/zapier/notify-slack',
					JSON.stringify({
						name: 'notify-slack',
						webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
						description: 'Posts to Slack',
						triggerCount: 0,
					}),
				)

				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ status: 'success' }),
				})

				const result = await zapierTriggerTool.execute(
					{ name: 'notify-slack', data: { message: 'Hello!' }, waitForResponse: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.triggered).toBe(true)
				expect(result.data?.integration).toBe('notify-slack')
			})

			it('triggers integration by direct URL', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ status: 'success' }),
				})

				const result = await zapierTriggerTool.execute(
					{
						webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
						data: { message: 'Hello!' },
						waitForResponse: false,
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.triggered).toBe(true)
				expect(result.data?.integration).toBe('direct')
			})

			it('fails when integration not found', async () => {
				const result = await zapierTriggerTool.execute(
					{ name: 'nonexistent', data: {}, waitForResponse: false },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('not found')
			})

			it('fails when neither name nor URL provided', async () => {
				const result = await zapierTriggerTool.execute({ data: {}, waitForResponse: false }, context)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Provide either')
			})

			it('rejects non-Zapier URLs', async () => {
				const result = await zapierTriggerTool.execute(
					{ webhookUrl: 'https://example.com/webhook', data: {}, waitForResponse: false },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('hooks.zapier.com')
			})

			it('merges defaultData with provided data', async () => {
				mockKV._storage.set(
					'ws/test-workspace/zapier/notify-slack',
					JSON.stringify({
						name: 'notify-slack',
						webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
						description: 'Posts to Slack',
						defaultData: { channel: '#general' },
						triggerCount: 0,
					}),
				)

				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ status: 'success' }),
				})

				await zapierTriggerTool.execute(
					{ name: 'notify-slack', data: { message: 'Hello!' }, waitForResponse: false },
					context,
				)

				expect(mockFetch).toHaveBeenCalledWith(
					'https://hooks.zapier.com/hooks/catch/123/abc',
					expect.objectContaining({
						body: expect.stringContaining('"channel":"#general"'),
					}),
				)
			})

			it('handles webhook errors', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: false,
					status: 500,
					statusText: 'Internal Server Error',
				})

				const result = await zapierTriggerTool.execute(
					{
						webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
						data: {},
						waitForResponse: false,
					},
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Zapier error')
			})

			it('handles timeout', async () => {
				const abortError = new Error('Aborted')
				abortError.name = 'AbortError'
				mockFetch.mockRejectedValueOnce(abortError)

				const result = await zapierTriggerTool.execute(
					{
						webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
						data: {},
						waitForResponse: false,
					},
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('timed out')
			})
		})
	})

	describe('zapierDeleteTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(zapierDeleteTool.id).toBe('zapier_delete')
			})

			it('validates delete request', () => {
				const result = zapierDeleteTool.inputSchema.safeParse({ name: 'notify-slack' })
				expect(result.success).toBe(true)
			})

			it('rejects missing name', () => {
				const result = zapierDeleteTool.inputSchema.safeParse({})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('deletes integration successfully', async () => {
				mockKV._storage.set(
					'ws/test-workspace/zapier/notify-slack',
					JSON.stringify({ name: 'notify-slack' }),
				)

				const result = await zapierDeleteTool.execute({ name: 'notify-slack' }, context)

				expect(result.success).toBe(true)
				expect(result.data?.deleted).toBe(true)
				expect(result.data?.name).toBe('notify-slack')
				expect(mockKV.delete).toHaveBeenCalled()
			})

			it('fails when integration not found', async () => {
				const result = await zapierDeleteTool.execute({ name: 'nonexistent' }, context)

				expect(result.success).toBe(false)
				expect(result.error).toContain('not found')
			})

			it('fails when KV namespace is not available', async () => {
				const contextWithoutKV = createMockContext()
				contextWithoutKV.env.KV = undefined as unknown as KVNamespace

				const result = await zapierDeleteTool.execute({ name: 'test' }, contextWithoutKV)

				expect(result.success).toBe(false)
				expect(result.error).toBe('KV namespace not available')
			})
		})
	})

	describe('zapierTestTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(zapierTestTool.id).toBe('zapier_test')
			})

			it('validates test request', () => {
				const result = zapierTestTool.inputSchema.safeParse({ name: 'notify-slack' })
				expect(result.success).toBe(true)
			})

			it('validates test request with custom data', () => {
				const result = zapierTestTool.inputSchema.safeParse({
					name: 'notify-slack',
					testData: { message: 'Custom test message' },
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('tests integration successfully', async () => {
				mockKV._storage.set(
					'ws/test-workspace/zapier/notify-slack',
					JSON.stringify({
						name: 'notify-slack',
						webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
						description: 'Posts to Slack',
					}),
				)

				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
				})

				const result = await zapierTestTool.execute({ name: 'notify-slack', testData: {} }, context)

				expect(result.success).toBe(true)
				expect(result.data?.tested).toBe(true)
				expect(result.data?.name).toBe('notify-slack')
			})

			it('sends test payload with isTest flag', async () => {
				mockKV._storage.set(
					'ws/test-workspace/zapier/test',
					JSON.stringify({
						name: 'test',
						webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
					}),
				)

				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
				})

				await zapierTestTool.execute({ name: 'test', testData: {} }, context)

				expect(mockFetch).toHaveBeenCalledWith(
					'https://hooks.zapier.com/hooks/catch/123/abc',
					expect.objectContaining({
						body: expect.stringContaining('"isTest":true'),
					}),
				)
			})

			it('fails when integration not found', async () => {
				const result = await zapierTestTool.execute({ name: 'nonexistent', testData: {} }, context)

				expect(result.success).toBe(false)
				expect(result.error).toContain('not found')
			})

			it('handles webhook failure', async () => {
				mockKV._storage.set(
					'ws/test-workspace/zapier/test',
					JSON.stringify({
						name: 'test',
						webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
					}),
				)

				mockFetch.mockResolvedValueOnce({
					ok: false,
					status: 500,
					statusText: 'Internal Server Error',
				})

				const result = await zapierTestTool.execute({ name: 'test', testData: {} }, context)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Test failed')
			})

			it('handles timeout', async () => {
				mockKV._storage.set(
					'ws/test-workspace/zapier/test',
					JSON.stringify({
						name: 'test',
						webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
					}),
				)

				const abortError = new Error('Aborted')
				abortError.name = 'AbortError'
				mockFetch.mockRejectedValueOnce(abortError)

				const result = await zapierTestTool.execute({ name: 'test', testData: {} }, context)

				expect(result.success).toBe(false)
				expect(result.error).toContain('timed out')
			})
		})
	})

	describe('zapierTool (legacy)', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(zapierTool.id).toBe('zapier')
			})

			it('validates basic request', () => {
				const result = zapierTool.inputSchema.safeParse({
					webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
					data: { message: 'Hello!' },
				})
				expect(result.success).toBe(true)
			})

			it('validates with waitForResponse', () => {
				const result = zapierTool.inputSchema.safeParse({
					webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
					data: { message: 'Hello!' },
					waitForResponse: true,
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('triggers webhook successfully', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ status: 'success' }),
				})

				const result = await zapierTool.execute(
					{
						webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
						data: { message: 'Hello!' },
						waitForResponse: false,
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.triggered).toBe(true)
				expect(result.data?.status).toBe(200)
			})

			it('rejects non-Zapier URLs', async () => {
				const result = await zapierTool.execute(
					{
						webhookUrl: 'https://example.com/webhook',
						data: {},
						waitForResponse: false,
					},
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Zapier webhooks')
			})

			it('includes workspace metadata in payload', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({}),
				})

				await zapierTool.execute(
					{
						webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
						data: { test: true },
						waitForResponse: false,
					},
					context,
				)

				expect(mockFetch).toHaveBeenCalledWith(
					'https://hooks.zapier.com/hooks/catch/123/abc',
					expect.objectContaining({
						body: expect.stringContaining('"workspaceId":"test-workspace"'),
					}),
				)
			})
		})
	})

	describe('webhookTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(webhookTool.id).toBe('webhook')
			})

			it('validates basic POST request', () => {
				const result = webhookTool.inputSchema.safeParse({
					url: 'https://example.com/webhook',
					data: { key: 'value' },
				})
				expect(result.success).toBe(true)
			})

			it('validates request with method', () => {
				const result = webhookTool.inputSchema.safeParse({
					url: 'https://example.com/webhook',
					method: 'PUT',
					data: { key: 'value' },
				})
				expect(result.success).toBe(true)
			})

			it('validates request with headers', () => {
				const result = webhookTool.inputSchema.safeParse({
					url: 'https://example.com/webhook',
					data: {},
					headers: { 'X-Custom-Header': 'value' },
				})
				expect(result.success).toBe(true)
			})

			it('validates request with bearer auth', () => {
				const result = webhookTool.inputSchema.safeParse({
					url: 'https://example.com/webhook',
					data: {},
					auth: { type: 'bearer', token: 'my-token' },
				})
				expect(result.success).toBe(true)
			})

			it('validates request with basic auth', () => {
				const result = webhookTool.inputSchema.safeParse({
					url: 'https://example.com/webhook',
					data: {},
					auth: { type: 'basic', username: 'user', password: 'pass' },
				})
				expect(result.success).toBe(true)
			})

			it('validates request with API key auth', () => {
				const result = webhookTool.inputSchema.safeParse({
					url: 'https://example.com/webhook',
					data: {},
					auth: { type: 'apikey', token: 'my-api-key', headerName: 'X-API-Key' },
				})
				expect(result.success).toBe(true)
			})

			it('validates request with timeout', () => {
				const result = webhookTool.inputSchema.safeParse({
					url: 'https://example.com/webhook',
					data: {},
					timeout: 5000,
				})
				expect(result.success).toBe(true)
			})

			it('rejects invalid URL', () => {
				const result = webhookTool.inputSchema.safeParse({
					url: 'not-a-url',
					data: {},
				})
				expect(result.success).toBe(false)
			})

			it('rejects invalid method', () => {
				const result = webhookTool.inputSchema.safeParse({
					url: 'https://example.com/webhook',
					method: 'GET',
					data: {},
				})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('makes POST request successfully', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ success: true }),
				})

				const result = await webhookTool.execute(
					{
						url: 'https://example.com/webhook',
						data: { message: 'Hello!' },
						method: 'POST',
						timeout: 30000,
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.ok).toBe(true)
				expect(result.data?.status).toBe(200)
			})

			it('includes bearer auth header', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({}),
				})

				await webhookTool.execute(
					{
						url: 'https://example.com/webhook',
						data: {},
						method: 'POST',
						timeout: 30000,
						auth: { type: 'bearer', token: 'my-token', headerName: 'X-API-Key' },
					},
					context,
				)

				expect(mockFetch).toHaveBeenCalledWith(
					'https://example.com/webhook',
					expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: 'Bearer my-token',
						}),
					}),
				)
			})

			it('includes basic auth header', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({}),
				})

				await webhookTool.execute(
					{
						url: 'https://example.com/webhook',
						data: {},
						method: 'POST',
						timeout: 30000,
						auth: { type: 'basic', username: 'user', password: 'pass', headerName: 'X-API-Key' },
					},
					context,
				)

				expect(mockFetch).toHaveBeenCalledWith(
					'https://example.com/webhook',
					expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: expect.stringMatching(/^Basic /),
						}),
					}),
				)
			})

			it('includes API key header', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({}),
				})

				await webhookTool.execute(
					{
						url: 'https://example.com/webhook',
						data: {},
						method: 'POST',
						timeout: 30000,
						auth: { type: 'apikey', token: 'my-api-key', headerName: 'X-API-Key' },
					},
					context,
				)

				expect(mockFetch).toHaveBeenCalledWith(
					'https://example.com/webhook',
					expect.objectContaining({
						headers: expect.objectContaining({
							'X-API-Key': 'my-api-key',
						}),
					}),
				)
			})

			it('includes custom headers', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({}),
				})

				await webhookTool.execute(
					{
						url: 'https://example.com/webhook',
						data: {},
						method: 'POST',
						timeout: 30000,
						headers: { 'X-Custom': 'value' },
					},
					context,
				)

				expect(mockFetch).toHaveBeenCalledWith(
					'https://example.com/webhook',
					expect.objectContaining({
						headers: expect.objectContaining({
							'X-Custom': 'value',
						}),
					}),
				)
			})

			it('handles HTTP errors', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: false,
					status: 404,
					json: async () => ({ error: 'Not found' }),
				})

				const result = await webhookTool.execute(
					{
						url: 'https://example.com/webhook',
						data: {},
						method: 'POST',
						timeout: 30000,
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.ok).toBe(false)
				expect(result.data?.status).toBe(404)
			})

			it('handles network errors', async () => {
				mockFetch.mockRejectedValueOnce(new Error('Network error'))

				const result = await webhookTool.execute(
					{
						url: 'https://example.com/webhook',
						data: {},
						method: 'POST',
						timeout: 30000,
					},
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Network error')
			})

			it('handles timeout', async () => {
				const abortError = new Error('Aborted')
				abortError.name = 'AbortError'
				mockFetch.mockRejectedValueOnce(abortError)

				const result = await webhookTool.execute(
					{
						url: 'https://example.com/webhook',
						data: {},
						method: 'POST',
						timeout: 1000,
					},
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('timed out')
			})
		})
	})

	describe('getIntegrationTools', () => {
		it('returns all integration tools', () => {
			const tools = getIntegrationTools(context)

			expect(tools).toHaveLength(7)
			expect(tools.map((t) => t.id)).toEqual([
				'zapier_save',
				'zapier_list',
				'zapier_trigger',
				'zapier_delete',
				'zapier_test',
				'zapier',
				'webhook',
			])
		})
	})
})
