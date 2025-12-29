import { describe, expect, it, vi, beforeEach } from 'vitest'
import { kvGetTool, kvPutTool, kvDeleteTool, kvListTool, getKVTools } from '../kv'
import type { ToolContext } from '../types'

// Mock KV namespace
const createMockKV = () => {
	const storage = new Map<string, { value: unknown; metadata?: Record<string, unknown> }>()

	return {
		get: vi.fn(async (key: string, type?: string) => {
			const item = storage.get(key)
			if (!item) return null
			if (type === 'json') return item.value
			if (type === 'arrayBuffer') return new TextEncoder().encode(String(item.value)).buffer
			return String(item.value)
		}),
		put: vi.fn(async (key: string, value: string, options?: KVNamespacePutOptions) => {
			storage.set(key, { value, metadata: options?.metadata as Record<string, unknown> })
		}),
		delete: vi.fn(async (key: string) => {
			storage.delete(key)
		}),
		list: vi.fn(async (options?: KVNamespaceListOptions) => {
			const keys = Array.from(storage.entries())
				.filter(([k]) => !options?.prefix || k.startsWith(options.prefix))
				.map(([name, item]) => ({
					name,
					expiration: undefined,
					metadata: item.metadata,
				}))
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

describe('KV Tools', () => {
	let mockKV: ReturnType<typeof createMockKV>
	let context: ToolContext

	beforeEach(() => {
		mockKV = createMockKV()
		context = createMockContext(mockKV)
	})

	describe('kvGetTool', () => {
		describe('schema validation', () => {
			it('has correct tool id and description', () => {
				expect(kvGetTool.id).toBe('kv_get')
				expect(kvGetTool.description).toContain('Retrieve a value from Cloudflare KV')
			})

			it('validates valid input with key', () => {
				const result = kvGetTool.inputSchema.safeParse({ key: 'my-key' })
				expect(result.success).toBe(true)
			})

			it('validates input with type parameter', () => {
				const result = kvGetTool.inputSchema.safeParse({ key: 'my-key', type: 'json' })
				expect(result.success).toBe(true)
			})

			it('accepts all valid type values', () => {
				expect(kvGetTool.inputSchema.safeParse({ key: 'k', type: 'text' }).success).toBe(true)
				expect(kvGetTool.inputSchema.safeParse({ key: 'k', type: 'json' }).success).toBe(true)
				expect(kvGetTool.inputSchema.safeParse({ key: 'k', type: 'arrayBuffer' }).success).toBe(
					true,
				)
			})

			it('rejects invalid type values', () => {
				const result = kvGetTool.inputSchema.safeParse({ key: 'k', type: 'invalid' })
				expect(result.success).toBe(false)
			})

			it('rejects missing key', () => {
				const result = kvGetTool.inputSchema.safeParse({})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('returns value when key exists', async () => {
				mockKV._storage.set('ws/test-workspace/my-key', { value: 'test-value' })

				const result = await kvGetTool.execute({ key: 'my-key', type: 'text' }, context)

				expect(result.success).toBe(true)
				expect(result.data).toEqual({
					key: 'my-key',
					value: 'test-value',
					found: true,
				})
			})

			it('returns found=false when key does not exist', async () => {
				const result = await kvGetTool.execute({ key: 'nonexistent', type: 'text' }, context)

				expect(result.success).toBe(true)
				expect(result.data).toEqual({
					key: 'nonexistent',
					value: null,
					found: false,
				})
			})

			it('retrieves JSON data correctly', async () => {
				const jsonData = { name: 'test', count: 42 }
				mockKV._storage.set('ws/test-workspace/json-key', { value: jsonData })

				const result = await kvGetTool.execute({ key: 'json-key', type: 'json' }, context)

				expect(result.success).toBe(true)
				expect(result.data?.value).toEqual(jsonData)
			})

			it('fails when KV namespace is not available', async () => {
				const contextWithoutKV = createMockContext()
				contextWithoutKV.env.KV = undefined as unknown as KVNamespace

				const result = await kvGetTool.execute({ key: 'my-key', type: 'text' }, contextWithoutKV)

				expect(result.success).toBe(false)
				expect(result.error).toBe('KV namespace not available')
			})

			it('scopes keys to workspace', async () => {
				await kvGetTool.execute({ key: 'my-key', type: 'text' }, context)

				expect(mockKV.get).toHaveBeenCalledWith('ws/test-workspace/my-key', 'text')
			})

			it('rejects path traversal attempts', async () => {
				const result = await kvGetTool.execute({ key: '../other-workspace/key', type: 'text' }, context)

				expect(result.success).toBe(false)
				expect(result.error).toContain('path traversal not allowed')
			})

			it('rejects keys starting with /', async () => {
				const result = await kvGetTool.execute({ key: '/absolute/path', type: 'text' }, context)

				expect(result.success).toBe(false)
				expect(result.error).toContain('path traversal not allowed')
			})
		})
	})

	describe('kvPutTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(kvPutTool.id).toBe('kv_put')
			})

			it('validates basic put request', () => {
				const result = kvPutTool.inputSchema.safeParse({
					key: 'my-key',
					value: 'my-value',
				})
				expect(result.success).toBe(true)
			})

			it('validates put with expiration', () => {
				const result = kvPutTool.inputSchema.safeParse({
					key: 'my-key',
					value: 'my-value',
					expirationTtl: 3600,
				})
				expect(result.success).toBe(true)
			})

			it('validates put with metadata', () => {
				const result = kvPutTool.inputSchema.safeParse({
					key: 'my-key',
					value: 'my-value',
					metadata: { category: 'test' },
				})
				expect(result.success).toBe(true)
			})

			it('rejects missing key', () => {
				const result = kvPutTool.inputSchema.safeParse({ value: 'test' })
				expect(result.success).toBe(false)
			})

			it('rejects missing value', () => {
				const result = kvPutTool.inputSchema.safeParse({ key: 'test' })
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('stores value successfully', async () => {
				const result = await kvPutTool.execute({ key: 'new-key', value: 'new-value' }, context)

				expect(result.success).toBe(true)
				expect(result.data).toEqual({ key: 'new-key', stored: true })
				expect(mockKV.put).toHaveBeenCalledWith('ws/test-workspace/new-key', 'new-value', {})
			})

			it('stores value with TTL', async () => {
				const result = await kvPutTool.execute(
					{ key: 'expiring-key', value: 'temp-value', expirationTtl: 3600 },
					context,
				)

				expect(result.success).toBe(true)
				expect(mockKV.put).toHaveBeenCalledWith(
					'ws/test-workspace/expiring-key',
					'temp-value',
					expect.objectContaining({ expirationTtl: 3600 }),
				)
			})

			it('stores value with metadata', async () => {
				const metadata = { category: 'test', version: 1 }
				const result = await kvPutTool.execute(
					{ key: 'meta-key', value: 'meta-value', metadata },
					context,
				)

				expect(result.success).toBe(true)
				expect(mockKV.put).toHaveBeenCalledWith(
					'ws/test-workspace/meta-key',
					'meta-value',
					expect.objectContaining({ metadata }),
				)
			})

			it('fails when KV namespace is not available', async () => {
				const contextWithoutKV = createMockContext()
				contextWithoutKV.env.KV = undefined as unknown as KVNamespace

				const result = await kvPutTool.execute(
					{ key: 'key', value: 'value' },
					contextWithoutKV,
				)

				expect(result.success).toBe(false)
				expect(result.error).toBe('KV namespace not available')
			})
		})
	})

	describe('kvDeleteTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(kvDeleteTool.id).toBe('kv_delete')
			})

			it('validates delete request', () => {
				const result = kvDeleteTool.inputSchema.safeParse({ key: 'my-key' })
				expect(result.success).toBe(true)
			})

			it('rejects missing key', () => {
				const result = kvDeleteTool.inputSchema.safeParse({})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('deletes key successfully', async () => {
				mockKV._storage.set('ws/test-workspace/delete-me', { value: 'temp' })

				const result = await kvDeleteTool.execute({ key: 'delete-me' }, context)

				expect(result.success).toBe(true)
				expect(result.data).toEqual({ key: 'delete-me', deleted: true })
				expect(mockKV.delete).toHaveBeenCalledWith('ws/test-workspace/delete-me')
			})

			it('succeeds even if key does not exist', async () => {
				const result = await kvDeleteTool.execute({ key: 'nonexistent' }, context)

				expect(result.success).toBe(true)
				expect(result.data).toEqual({ key: 'nonexistent', deleted: true })
			})

			it('fails when KV namespace is not available', async () => {
				const contextWithoutKV = createMockContext()
				contextWithoutKV.env.KV = undefined as unknown as KVNamespace

				const result = await kvDeleteTool.execute({ key: 'key' }, contextWithoutKV)

				expect(result.success).toBe(false)
				expect(result.error).toBe('KV namespace not available')
			})
		})
	})

	describe('kvListTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(kvListTool.id).toBe('kv_list')
			})

			it('validates empty options', () => {
				const result = kvListTool.inputSchema.safeParse({})
				expect(result.success).toBe(true)
			})

			it('validates with prefix', () => {
				const result = kvListTool.inputSchema.safeParse({ prefix: 'user/' })
				expect(result.success).toBe(true)
			})

			it('validates with limit', () => {
				const result = kvListTool.inputSchema.safeParse({ limit: 50 })
				expect(result.success).toBe(true)
			})

			it('validates with cursor', () => {
				const result = kvListTool.inputSchema.safeParse({ cursor: 'abc123' })
				expect(result.success).toBe(true)
			})

			it('validates with all options', () => {
				const result = kvListTool.inputSchema.safeParse({
					prefix: 'data/',
					limit: 25,
					cursor: 'next-page',
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('lists all workspace keys', async () => {
				mockKV._storage.set('ws/test-workspace/key1', { value: 'v1' })
				mockKV._storage.set('ws/test-workspace/key2', { value: 'v2' })

				const result = await kvListTool.execute({}, context)

				expect(result.success).toBe(true)
				expect(mockKV.list).toHaveBeenCalledWith(
					expect.objectContaining({
						prefix: 'ws/test-workspace/',
					}),
				)
			})

			it('filters by prefix within workspace', async () => {
				const result = await kvListTool.execute({ prefix: 'users/' }, context)

				expect(result.success).toBe(true)
				expect(mockKV.list).toHaveBeenCalledWith(
					expect.objectContaining({
						prefix: 'ws/test-workspace/users/',
					}),
				)
			})

			it('respects limit parameter', async () => {
				const result = await kvListTool.execute({ limit: 10 }, context)

				expect(result.success).toBe(true)
				expect(mockKV.list).toHaveBeenCalledWith(
					expect.objectContaining({
						limit: 10,
					}),
				)
			})

			it('strips workspace prefix from returned keys', async () => {
				mockKV.list.mockResolvedValueOnce({
					keys: [
						{ name: 'ws/test-workspace/key1', expiration: undefined, metadata: {} },
						{ name: 'ws/test-workspace/key2', expiration: undefined, metadata: {} },
					],
					list_complete: true,
				})

				const result = await kvListTool.execute({}, context)

				expect(result.success).toBe(true)
				expect(result.data?.keys).toEqual([
					{ name: 'key1', expiration: undefined, metadata: {} },
					{ name: 'key2', expiration: undefined, metadata: {} },
				])
			})

			it('fails when KV namespace is not available', async () => {
				const contextWithoutKV = createMockContext()
				contextWithoutKV.env.KV = undefined as unknown as KVNamespace

				const result = await kvListTool.execute({}, contextWithoutKV)

				expect(result.success).toBe(false)
				expect(result.error).toBe('KV namespace not available')
			})
		})
	})

	describe('getKVTools', () => {
		it('returns all KV tools', () => {
			const tools = getKVTools(context)

			expect(tools).toHaveLength(4)
			expect(tools.map((t) => t.id)).toEqual(['kv_get', 'kv_put', 'kv_delete', 'kv_list'])
		})
	})
})
