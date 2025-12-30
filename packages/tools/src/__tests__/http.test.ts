import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { httpRequestTool, httpGetTool, httpPostTool, getHTTPTools } from '../http'
import type { ToolContext } from '../types'
import { createFetchMock } from './test-utils'

// Mock fetch globally
const originalFetch = globalThis.fetch

const createMockContext = (): ToolContext => ({
	env: {} as ToolContext['env'],
	workspaceId: 'test-workspace',
	userId: 'test-user',
})

describe('HTTP Tools', () => {
	let context: ToolContext
	let mockFetch: ReturnType<typeof vi.fn>

	beforeEach(() => {
		context = createMockContext()
		mockFetch = vi.fn()
		globalThis.fetch = createFetchMock(mockFetch)
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		vi.clearAllMocks()
	})

	describe('httpRequestTool', () => {
		describe('schema validation', () => {
			it('has correct tool id and description', () => {
				expect(httpRequestTool.id).toBe('http_request')
				expect(httpRequestTool.description).toContain('HTTP request')
			})

			it('validates GET request', () => {
				const result = httpRequestTool.inputSchema.safeParse({
					url: 'https://example.com/api',
					method: 'GET',
				})
				expect(result.success).toBe(true)
			})

			it('validates POST request with body', () => {
				const result = httpRequestTool.inputSchema.safeParse({
					url: 'https://example.com/api',
					method: 'POST',
					body: '{"key": "value"}',
				})
				expect(result.success).toBe(true)
			})

			it('validates request with headers', () => {
				const result = httpRequestTool.inputSchema.safeParse({
					url: 'https://example.com/api',
					headers: { Authorization: 'Bearer token' },
				})
				expect(result.success).toBe(true)
			})

			it('validates request with timeout', () => {
				const result = httpRequestTool.inputSchema.safeParse({
					url: 'https://example.com/api',
					timeout: 5000,
				})
				expect(result.success).toBe(true)
			})

			it('accepts all valid HTTP methods', () => {
				const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
				for (const method of methods) {
					const result = httpRequestTool.inputSchema.safeParse({
						url: 'https://example.com/api',
						method,
					})
					expect(result.success).toBe(true)
				}
			})

			it('rejects invalid HTTP method', () => {
				const result = httpRequestTool.inputSchema.safeParse({
					url: 'https://example.com/api',
					method: 'INVALID',
				})
				expect(result.success).toBe(false)
			})

			it('rejects invalid URL', () => {
				const result = httpRequestTool.inputSchema.safeParse({
					url: 'not-a-valid-url',
				})
				expect(result.success).toBe(false)
			})

			it('rejects missing URL', () => {
				const result = httpRequestTool.inputSchema.safeParse({
					method: 'GET',
				})
				expect(result.success).toBe(false)
			})
		})

		describe('execution - success', () => {
			it('makes GET request successfully', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					statusText: 'OK',
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({ data: 'test' }),
				})

				const result = await httpRequestTool.execute(
					{ url: 'https://example.com/api', method: 'GET', timeout: 30000 },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.status).toBe(200)
				expect(result.data?.data).toEqual({ data: 'test' })
				expect(result.data?.ok).toBe(true)
			})

			it('makes POST request with body', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 201,
					statusText: 'Created',
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({ id: 1 }),
				})

				const result = await httpRequestTool.execute(
					{
						url: 'https://example.com/api',
						method: 'POST',
						body: '{"name": "test"}',
						timeout: 30000,
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.status).toBe(201)
				expect(mockFetch).toHaveBeenCalledWith(
					'https://example.com/api',
					expect.objectContaining({
						method: 'POST',
						body: '{"name": "test"}',
					}),
				)
			})

			it('includes custom headers', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					statusText: 'OK',
					headers: new Headers({ 'content-type': 'text/plain' }),
					text: async () => 'response',
				})

				await httpRequestTool.execute(
					{
						url: 'https://example.com/api',
						method: 'GET',
						headers: { Authorization: 'Bearer token123' },
						timeout: 30000,
					},
					context,
				)

				expect(mockFetch).toHaveBeenCalledWith(
					'https://example.com/api',
					expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: 'Bearer token123',
						}),
					}),
				)
			})

			it('auto-sets Content-Type for POST without Content-Type header', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					statusText: 'OK',
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({}),
				})

				await httpRequestTool.execute(
					{
						url: 'https://example.com/api',
						method: 'POST',
						body: '{"test": true}',
						timeout: 30000,
					},
					context,
				)

				expect(mockFetch).toHaveBeenCalledWith(
					'https://example.com/api',
					expect.objectContaining({
						headers: expect.objectContaining({
							'Content-Type': 'application/json',
						}),
					}),
				)
			})

			it('returns text response for non-JSON content type', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					statusText: 'OK',
					headers: new Headers({ 'content-type': 'text/plain' }),
					text: async () => 'plain text response',
				})

				const result = await httpRequestTool.execute(
					{ url: 'https://example.com/api', method: 'GET', timeout: 30000 },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.data).toBe('plain text response')
			})

			it('includes User-Agent header', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					statusText: 'OK',
					headers: new Headers({ 'content-type': 'text/plain' }),
					text: async () => '',
				})

				await httpRequestTool.execute(
					{ url: 'https://example.com/api', method: 'GET', timeout: 30000 },
					context,
				)

				expect(mockFetch).toHaveBeenCalledWith(
					'https://example.com/api',
					expect.objectContaining({
						headers: expect.objectContaining({
							'User-Agent': 'Hare-Agent/1.0',
						}),
					}),
				)
			})
		})

		describe('execution - error handling', () => {
			it('handles HTTP errors (non-2xx responses)', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: false,
					status: 404,
					statusText: 'Not Found',
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({ error: 'Not found' }),
				})

				const result = await httpRequestTool.execute(
					{ url: 'https://example.com/api/notfound', method: 'GET', timeout: 30000 },
					context,
				)

				expect(result.success).toBe(true) // Tool succeeds but response indicates error
				expect(result.data?.ok).toBe(false)
				expect(result.data?.status).toBe(404)
			})

			it('handles network errors', async () => {
				mockFetch.mockRejectedValueOnce(new Error('Network error'))

				const result = await httpRequestTool.execute(
					{ url: 'https://example.com/api', method: 'GET', timeout: 30000 },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Network error')
			})

			it('handles timeout errors', async () => {
				const abortError = new Error('Aborted')
				abortError.name = 'AbortError'
				mockFetch.mockRejectedValueOnce(abortError)

				const result = await httpRequestTool.execute(
					{ url: 'https://example.com/api', method: 'GET', timeout: 1000 },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('timed out')
			})
		})
	})

	describe('httpGetTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(httpGetTool.id).toBe('http_get')
			})

			it('validates GET request', () => {
				const result = httpGetTool.inputSchema.safeParse({
					url: 'https://example.com/api',
				})
				expect(result.success).toBe(true)
			})

			it('validates GET request with headers', () => {
				const result = httpGetTool.inputSchema.safeParse({
					url: 'https://example.com/api',
					headers: { Accept: 'application/json' },
				})
				expect(result.success).toBe(true)
			})

			it('rejects invalid URL', () => {
				const result = httpGetTool.inputSchema.safeParse({
					url: 'invalid',
				})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('makes GET request', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					statusText: 'OK',
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({ result: 'success' }),
				})

				const result = await httpGetTool.execute(
					{ url: 'https://example.com/api' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.data).toEqual({ result: 'success' })
			})

			it('includes custom headers', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					statusText: 'OK',
					headers: new Headers({ 'content-type': 'text/plain' }),
					text: async () => 'test',
				})

				await httpGetTool.execute(
					{
						url: 'https://example.com/api',
						headers: { 'X-Custom': 'value' },
					},
					context,
				)

				expect(mockFetch).toHaveBeenCalledWith(
					'https://example.com/api',
					expect.objectContaining({
						method: 'GET',
						headers: expect.objectContaining({
							'X-Custom': 'value',
						}),
					}),
				)
			})
		})
	})

	describe('httpPostTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(httpPostTool.id).toBe('http_post')
			})

			it('validates POST request with body', () => {
				const result = httpPostTool.inputSchema.safeParse({
					url: 'https://example.com/api',
					body: { name: 'test' },
				})
				expect(result.success).toBe(true)
			})

			it('accepts string body', () => {
				const result = httpPostTool.inputSchema.safeParse({
					url: 'https://example.com/api',
					body: '{"name": "test"}',
				})
				expect(result.success).toBe(true)
			})

			it('accepts object body', () => {
				const result = httpPostTool.inputSchema.safeParse({
					url: 'https://example.com/api',
					body: { key: 'value', nested: { a: 1 } },
				})
				expect(result.success).toBe(true)
			})

			it('validates POST with headers', () => {
				const result = httpPostTool.inputSchema.safeParse({
					url: 'https://example.com/api',
					body: { data: 'test' },
					headers: { Authorization: 'Bearer token' },
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('makes POST request with JSON body', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 201,
					statusText: 'Created',
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({ id: 1 }),
				})

				const result = await httpPostTool.execute(
					{
						url: 'https://example.com/api',
						body: { name: 'test' },
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(mockFetch).toHaveBeenCalledWith(
					'https://example.com/api',
					expect.objectContaining({
						method: 'POST',
						body: '{"name":"test"}',
					}),
				)
			})

			it('handles string body directly', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					statusText: 'OK',
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({}),
				})

				await httpPostTool.execute(
					{
						url: 'https://example.com/api',
						body: 'raw string body',
					},
					context,
				)

				expect(mockFetch).toHaveBeenCalledWith(
					'https://example.com/api',
					expect.objectContaining({
						body: 'raw string body',
					}),
				)
			})

			it('includes custom headers', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					statusText: 'OK',
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({}),
				})

				await httpPostTool.execute(
					{
						url: 'https://example.com/api',
						body: {},
						headers: { 'X-Request-ID': '123' },
					},
					context,
				)

				expect(mockFetch).toHaveBeenCalledWith(
					'https://example.com/api',
					expect.objectContaining({
						headers: expect.objectContaining({
							'X-Request-ID': '123',
						}),
					}),
				)
			})
		})
	})

	describe('getHTTPTools', () => {
		it('returns all HTTP tools', () => {
			const tools = getHTTPTools(context)

			expect(tools).toHaveLength(3)
			expect(tools.map((t) => t.id)).toEqual(['http_request', 'http_get', 'http_post'])
		})
	})
})
