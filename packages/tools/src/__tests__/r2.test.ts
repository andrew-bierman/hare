import { describe, expect, it, vi, beforeEach } from 'vitest'
import { r2GetTool, r2PutTool, r2DeleteTool, r2ListTool, r2HeadTool, getR2Tools } from '../r2'
import type { ToolContext } from '../types'

// Mock R2 bucket
const createMockR2 = () => {
	const storage = new Map<
		string,
		{
			body: string
			httpMetadata?: { contentType?: string }
			customMetadata?: Record<string, string>
			size: number
			etag: string
			uploaded: Date
		}
	>()

	return {
		get: vi.fn(async (key: string) => {
			const item = storage.get(key)
			if (!item) return null
			return {
				text: async () => item.body,
				httpMetadata: item.httpMetadata,
				customMetadata: item.customMetadata,
				size: item.size,
				etag: item.etag,
				uploaded: item.uploaded,
			}
		}),
		put: vi.fn(async (key: string, body: string, options?: R2PutOptions) => {
			const httpMeta = options?.httpMetadata
			const obj = {
				body,
				httpMetadata: httpMeta && 'contentType' in httpMeta ? { contentType: httpMeta.contentType } : undefined,
				customMetadata: options?.customMetadata,
				size: body.length,
				etag: `"${Math.random().toString(36).slice(2)}"`,
				uploaded: new Date(),
			}
			storage.set(key, obj)
			return {
				etag: obj.etag,
				size: obj.size,
			}
		}),
		delete: vi.fn(async (key: string) => {
			storage.delete(key)
		}),
		list: vi.fn(async (options?: R2ListOptions) => {
			const keys = Array.from(storage.entries())
				.filter(([k]) => !options?.prefix || k.startsWith(options.prefix))
				.map(([key, item]) => ({
					key,
					size: item.size,
					etag: item.etag,
					uploaded: item.uploaded,
				}))
				.slice(0, options?.limit || 100)
			return {
				objects: keys,
				truncated: false,
				cursor: undefined,
				delimitedPrefixes: [],
			}
		}),
		head: vi.fn(async (key: string) => {
			const item = storage.get(key)
			if (!item) return null
			return {
				size: item.size,
				etag: item.etag,
				uploaded: item.uploaded,
				httpMetadata: item.httpMetadata,
				customMetadata: item.customMetadata,
			}
		}),
		_storage: storage,
	}
}

const createMockContext = (r2?: ReturnType<typeof createMockR2>): ToolContext => ({
	env: {
		R2: r2 as unknown as R2Bucket,
	} as ToolContext['env'],
	workspaceId: 'test-workspace',
	userId: 'test-user',
})

describe('R2 Tools', () => {
	let mockR2: ReturnType<typeof createMockR2>
	let context: ToolContext

	beforeEach(() => {
		mockR2 = createMockR2()
		context = createMockContext(mockR2)
	})

	describe('r2GetTool', () => {
		describe('schema validation', () => {
			it('has correct tool id and description', () => {
				expect(r2GetTool.id).toBe('r2_get')
				expect(r2GetTool.description).toContain('Retrieve an object from Cloudflare R2')
			})

			it('validates valid input with key', () => {
				const result = r2GetTool.inputSchema.safeParse({ key: 'my-file.txt' })
				expect(result.success).toBe(true)
			})

			it('rejects missing key', () => {
				const result = r2GetTool.inputSchema.safeParse({})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('returns object content when key exists', async () => {
				mockR2._storage.set('ws/test-workspace/my-file.txt', {
					body: 'Hello, World!',
					size: 13,
					etag: '"abc123"',
					uploaded: new Date('2024-01-01'),
					httpMetadata: { contentType: 'text/plain' },
					customMetadata: { author: 'test' },
				})

				const result = await r2GetTool.execute({ key: 'my-file.txt' }, context)

				expect(result.success).toBe(true)
				expect(result.data).toEqual({
					key: 'my-file.txt',
					found: true,
					content: 'Hello, World!',
					contentType: 'text/plain',
					size: 13,
					etag: '"abc123"',
					uploaded: '2024-01-01T00:00:00.000Z',
					metadata: { author: 'test' },
				})
			})

			it('returns found=false when key does not exist', async () => {
				const result = await r2GetTool.execute({ key: 'nonexistent.txt' }, context)

				expect(result.success).toBe(true)
				expect(result.data).toEqual({
					key: 'nonexistent.txt',
					found: false,
					content: null,
				})
			})

			it('fails when R2 bucket is not available', async () => {
				const contextWithoutR2 = createMockContext()
				contextWithoutR2.env.R2 = undefined as unknown as R2Bucket

				const result = await r2GetTool.execute({ key: 'my-file.txt' }, contextWithoutR2)

				expect(result.success).toBe(false)
				expect(result.error).toBe('R2 bucket not available')
			})

			it('scopes keys to workspace', async () => {
				await r2GetTool.execute({ key: 'my-file.txt' }, context)

				expect(mockR2.get).toHaveBeenCalledWith('ws/test-workspace/my-file.txt')
			})

			it('rejects path traversal attempts', async () => {
				const result = await r2GetTool.execute(
					{ key: '../other-workspace/secret.txt' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('path traversal not allowed')
			})

			it('normalizes leading slash in key', async () => {
				await r2GetTool.execute({ key: '/folder/file.txt' }, context)

				expect(mockR2.get).toHaveBeenCalledWith('ws/test-workspace/folder/file.txt')
			})
		})
	})

	describe('r2PutTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(r2PutTool.id).toBe('r2_put')
			})

			it('validates basic put request', () => {
				const result = r2PutTool.inputSchema.safeParse({
					key: 'my-file.txt',
					content: 'Hello, World!',
				})
				expect(result.success).toBe(true)
			})

			it('validates put with content type', () => {
				const result = r2PutTool.inputSchema.safeParse({
					key: 'my-file.json',
					content: '{"key": "value"}',
					contentType: 'application/json',
				})
				expect(result.success).toBe(true)
			})

			it('validates put with metadata', () => {
				const result = r2PutTool.inputSchema.safeParse({
					key: 'my-file.txt',
					content: 'Hello',
					metadata: { author: 'test', version: '1.0' },
				})
				expect(result.success).toBe(true)
			})

			it('rejects missing key', () => {
				const result = r2PutTool.inputSchema.safeParse({ content: 'test' })
				expect(result.success).toBe(false)
			})

			it('rejects missing content', () => {
				const result = r2PutTool.inputSchema.safeParse({ key: 'test.txt' })
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('stores object successfully', async () => {
				const result = await r2PutTool.execute(
					{ key: 'new-file.txt', content: 'New content' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.key).toBe('new-file.txt')
				expect(result.data?.stored).toBe(true)
				expect(result.data?.size).toBe(11)
				expect(mockR2.put).toHaveBeenCalledWith(
					'ws/test-workspace/new-file.txt',
					'New content',
					{},
				)
			})

			it('stores object with content type', async () => {
				const result = await r2PutTool.execute(
					{
						key: 'data.json',
						content: '{"test": true}',
						contentType: 'application/json',
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(mockR2.put).toHaveBeenCalledWith(
					'ws/test-workspace/data.json',
					'{"test": true}',
					expect.objectContaining({
						httpMetadata: { contentType: 'application/json' },
					}),
				)
			})

			it('stores object with custom metadata', async () => {
				const metadata = { category: 'test', version: '1.0' }
				const result = await r2PutTool.execute(
					{ key: 'meta-file.txt', content: 'content', metadata },
					context,
				)

				expect(result.success).toBe(true)
				expect(mockR2.put).toHaveBeenCalledWith(
					'ws/test-workspace/meta-file.txt',
					'content',
					expect.objectContaining({ customMetadata: metadata }),
				)
			})

			it('fails when R2 bucket is not available', async () => {
				const contextWithoutR2 = createMockContext()
				contextWithoutR2.env.R2 = undefined as unknown as R2Bucket

				const result = await r2PutTool.execute(
					{ key: 'file.txt', content: 'content' },
					contextWithoutR2,
				)

				expect(result.success).toBe(false)
				expect(result.error).toBe('R2 bucket not available')
			})

			it('rejects path traversal attempts', async () => {
				const result = await r2PutTool.execute(
					{ key: '../other/file.txt', content: 'content' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('path traversal not allowed')
			})
		})
	})

	describe('r2DeleteTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(r2DeleteTool.id).toBe('r2_delete')
			})

			it('validates delete request', () => {
				const result = r2DeleteTool.inputSchema.safeParse({ key: 'my-file.txt' })
				expect(result.success).toBe(true)
			})

			it('rejects missing key', () => {
				const result = r2DeleteTool.inputSchema.safeParse({})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('deletes object successfully', async () => {
				mockR2._storage.set('ws/test-workspace/delete-me.txt', {
					body: 'temp',
					size: 4,
					etag: '"123"',
					uploaded: new Date(),
				})

				const result = await r2DeleteTool.execute({ key: 'delete-me.txt' }, context)

				expect(result.success).toBe(true)
				expect(result.data).toEqual({ key: 'delete-me.txt', deleted: true })
				expect(mockR2.delete).toHaveBeenCalledWith('ws/test-workspace/delete-me.txt')
			})

			it('succeeds even if object does not exist', async () => {
				const result = await r2DeleteTool.execute({ key: 'nonexistent.txt' }, context)

				expect(result.success).toBe(true)
				expect(result.data).toEqual({ key: 'nonexistent.txt', deleted: true })
			})

			it('fails when R2 bucket is not available', async () => {
				const contextWithoutR2 = createMockContext()
				contextWithoutR2.env.R2 = undefined as unknown as R2Bucket

				const result = await r2DeleteTool.execute({ key: 'file.txt' }, contextWithoutR2)

				expect(result.success).toBe(false)
				expect(result.error).toBe('R2 bucket not available')
			})

			it('rejects path traversal attempts', async () => {
				const result = await r2DeleteTool.execute(
					{ key: '../other/file.txt' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('path traversal not allowed')
			})
		})
	})

	describe('r2ListTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(r2ListTool.id).toBe('r2_list')
			})

			it('validates empty options', () => {
				const result = r2ListTool.inputSchema.safeParse({})
				expect(result.success).toBe(true)
			})

			it('validates with prefix', () => {
				const result = r2ListTool.inputSchema.safeParse({ prefix: 'images/' })
				expect(result.success).toBe(true)
			})

			it('validates with limit', () => {
				const result = r2ListTool.inputSchema.safeParse({ limit: 50 })
				expect(result.success).toBe(true)
			})

			it('validates with cursor', () => {
				const result = r2ListTool.inputSchema.safeParse({ cursor: 'abc123' })
				expect(result.success).toBe(true)
			})

			it('validates with delimiter', () => {
				const result = r2ListTool.inputSchema.safeParse({ delimiter: '/' })
				expect(result.success).toBe(true)
			})

			it('validates with all options', () => {
				const result = r2ListTool.inputSchema.safeParse({
					prefix: 'data/',
					limit: 25,
					cursor: 'next-page',
					delimiter: '/',
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('lists all workspace objects', async () => {
				mockR2._storage.set('ws/test-workspace/file1.txt', {
					body: 'v1',
					size: 2,
					etag: '"1"',
					uploaded: new Date('2024-01-01'),
				})
				mockR2._storage.set('ws/test-workspace/file2.txt', {
					body: 'v2',
					size: 2,
					etag: '"2"',
					uploaded: new Date('2024-01-02'),
				})

				const result = await r2ListTool.execute({ limit: 100 }, context)

				expect(result.success).toBe(true)
				expect(mockR2.list).toHaveBeenCalledWith(
					expect.objectContaining({
						prefix: 'ws/test-workspace/',
					}),
				)
			})

			it('filters by prefix within workspace', async () => {
				const result = await r2ListTool.execute({ prefix: 'images/', limit: 100 }, context)

				expect(result.success).toBe(true)
				expect(mockR2.list).toHaveBeenCalledWith(
					expect.objectContaining({
						prefix: 'ws/test-workspace/images/',
					}),
				)
			})

			it('respects limit parameter', async () => {
				const result = await r2ListTool.execute({ limit: 10 }, context)

				expect(result.success).toBe(true)
				expect(mockR2.list).toHaveBeenCalledWith(
					expect.objectContaining({
						limit: 10,
					}),
				)
			})

			it('passes through cursor parameter', async () => {
				const result = await r2ListTool.execute({ cursor: 'next-page', limit: 100 }, context)

				expect(result.success).toBe(true)
				expect(mockR2.list).toHaveBeenCalledWith(
					expect.objectContaining({
						cursor: 'next-page',
					}),
				)
			})

			it('passes through delimiter parameter', async () => {
				const result = await r2ListTool.execute({ delimiter: '/', limit: 100 }, context)

				expect(result.success).toBe(true)
				expect(mockR2.list).toHaveBeenCalledWith(
					expect.objectContaining({
						delimiter: '/',
					}),
				)
			})

			it('strips workspace prefix from returned keys', async () => {
				mockR2.list.mockResolvedValueOnce({
					objects: [
						{
							key: 'ws/test-workspace/file1.txt',
							size: 10,
							etag: '"abc"',
							uploaded: new Date('2024-01-01'),
						},
						{
							key: 'ws/test-workspace/folder/file2.txt',
							size: 20,
							etag: '"def"',
							uploaded: new Date('2024-01-02'),
						},
					],
					truncated: false,
					cursor: undefined,
					delimitedPrefixes: [],
				})

				const result = await r2ListTool.execute({ limit: 100 }, context)

				expect(result.success).toBe(true)
				expect(result.data?.objects).toEqual([
					{
						key: 'file1.txt',
						size: 10,
						etag: '"abc"',
						uploaded: '2024-01-01T00:00:00.000Z',
					},
					{
						key: 'folder/file2.txt',
						size: 20,
						etag: '"def"',
						uploaded: '2024-01-02T00:00:00.000Z',
					},
				])
			})

			it('fails when R2 bucket is not available', async () => {
				const contextWithoutR2 = createMockContext()
				contextWithoutR2.env.R2 = undefined as unknown as R2Bucket

				const result = await r2ListTool.execute({ limit: 100 }, contextWithoutR2)

				expect(result.success).toBe(false)
				expect(result.error).toBe('R2 bucket not available')
			})
		})
	})

	describe('r2HeadTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(r2HeadTool.id).toBe('r2_head')
			})

			it('validates head request', () => {
				const result = r2HeadTool.inputSchema.safeParse({ key: 'my-file.txt' })
				expect(result.success).toBe(true)
			})

			it('rejects missing key', () => {
				const result = r2HeadTool.inputSchema.safeParse({})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('returns metadata when object exists', async () => {
				mockR2._storage.set('ws/test-workspace/my-file.txt', {
					body: 'Hello, World!',
					size: 13,
					etag: '"abc123"',
					uploaded: new Date('2024-01-01'),
					httpMetadata: { contentType: 'text/plain' },
					customMetadata: { author: 'test' },
				})

				const result = await r2HeadTool.execute({ key: 'my-file.txt' }, context)

				expect(result.success).toBe(true)
				expect(result.data).toEqual({
					key: 'my-file.txt',
					found: true,
					size: 13,
					etag: '"abc123"',
					uploaded: '2024-01-01T00:00:00.000Z',
					contentType: 'text/plain',
					metadata: { author: 'test' },
				})
			})

			it('returns found=false when object does not exist', async () => {
				const result = await r2HeadTool.execute({ key: 'nonexistent.txt' }, context)

				expect(result.success).toBe(true)
				expect(result.data).toEqual({
					key: 'nonexistent.txt',
					found: false,
				})
			})

			it('fails when R2 bucket is not available', async () => {
				const contextWithoutR2 = createMockContext()
				contextWithoutR2.env.R2 = undefined as unknown as R2Bucket

				const result = await r2HeadTool.execute({ key: 'file.txt' }, contextWithoutR2)

				expect(result.success).toBe(false)
				expect(result.error).toBe('R2 bucket not available')
			})

			it('scopes keys to workspace', async () => {
				await r2HeadTool.execute({ key: 'my-file.txt' }, context)

				expect(mockR2.head).toHaveBeenCalledWith('ws/test-workspace/my-file.txt')
			})

			it('rejects path traversal attempts', async () => {
				const result = await r2HeadTool.execute(
					{ key: '../other-workspace/secret.txt' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('path traversal not allowed')
			})
		})
	})

	describe('getR2Tools', () => {
		it('returns all R2 tools', () => {
			const tools = getR2Tools(context)

			expect(tools).toHaveLength(5)
			expect(tools.map((t) => t.id)).toEqual([
				'r2_get',
				'r2_put',
				'r2_delete',
				'r2_list',
				'r2_head',
			])
		})
	})
})
