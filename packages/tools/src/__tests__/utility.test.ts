import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
	datetimeTool,
	jsonTool,
	textTool,
	mathTool,
	uuidTool,
	hashTool,
	base64Tool,
	urlTool,
	delayTool,
	getUtilityTools,
} from '../utility'
import type { ToolContext } from '../types'

const createMockContext = (): ToolContext => ({
	env: {} as ToolContext['env'],
	workspaceId: 'test-workspace',
	userId: 'test-user',
})

describe('Utility Tools', () => {
	let context: ToolContext

	beforeEach(() => {
		context = createMockContext()
	})

	describe('datetimeTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(datetimeTool.id).toBe('datetime')
			})

			it('validates now operation', () => {
				const result = datetimeTool.inputSchema.safeParse({ operation: 'now' })
				expect(result.success).toBe(true)
			})

			it('validates format operation', () => {
				const result = datetimeTool.inputSchema.safeParse({
					operation: 'format',
					date: '2024-01-15',
					format: 'date',
				})
				expect(result.success).toBe(true)
			})

			it('validates diff operation', () => {
				const result = datetimeTool.inputSchema.safeParse({
					operation: 'diff',
					date: '2024-01-01',
					date2: '2024-01-15',
				})
				expect(result.success).toBe(true)
			})

			it('validates add/subtract operations', () => {
				const result = datetimeTool.inputSchema.safeParse({
					operation: 'add',
					date: '2024-01-01',
					amount: 7,
					unit: 'days',
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('returns current datetime for now operation', async () => {
				const result = await datetimeTool.execute(
					{ operation: 'now', timezone: 'UTC' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.iso).toBeDefined()
				expect(result.data?.unix).toBeDefined()
			})

			it('formats date correctly', async () => {
				const result = await datetimeTool.execute(
					{ operation: 'format', date: '2024-01-15T12:00:00Z', format: 'iso', timezone: 'UTC' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.iso).toBe('2024-01-15T12:00:00.000Z')
			})

			it('calculates date difference', async () => {
				const result = await datetimeTool.execute(
					{ operation: 'diff', date: '2024-01-01', date2: '2024-01-15', timezone: 'UTC' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.days).toBe(14)
			})

			it('adds time to date', async () => {
				const result = await datetimeTool.execute(
					{ operation: 'add', date: '2024-01-01T00:00:00Z', amount: 7, unit: 'days', timezone: 'UTC' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.result).toContain('2024-01-08')
			})
		})
	})

	describe('jsonTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(jsonTool.id).toBe('json')
			})

			it('validates parse operation', () => {
				const result = jsonTool.inputSchema.safeParse({
					operation: 'parse',
					data: '{"key": "value"}',
				})
				expect(result.success).toBe(true)
			})

			it('validates stringify operation', () => {
				const result = jsonTool.inputSchema.safeParse({
					operation: 'stringify',
					data: { key: 'value' },
				})
				expect(result.success).toBe(true)
			})

			it('validates get operation with path', () => {
				const result = jsonTool.inputSchema.safeParse({
					operation: 'get',
					data: { user: { name: 'test' } },
					path: 'user.name',
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('parses JSON string', async () => {
				const result = await jsonTool.execute(
					{ operation: 'parse', data: '{"name": "test"}' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.result).toEqual({ name: 'test' })
			})

			it('stringifies object', async () => {
				const result = await jsonTool.execute(
					{ operation: 'stringify', data: { name: 'test' }, pretty: true },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.result).toContain('name')
			})

			it('gets nested value by path', async () => {
				const result = await jsonTool.execute(
					{ operation: 'get', data: { user: { name: 'test' } }, path: 'user.name' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.value).toBe('test')
			})

			it('sets value at path', async () => {
				const result = await jsonTool.execute(
					{ operation: 'set', data: { user: {} }, path: 'user.name', value: 'new' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.result).toEqual({ user: { name: 'new' } })
			})

			it('merges two objects', async () => {
				const result = await jsonTool.execute(
					{ operation: 'merge', data: { a: 1 }, data2: { b: 2 } },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.result).toEqual({ a: 1, b: 2 })
			})

			it('gets object keys', async () => {
				const result = await jsonTool.execute(
					{ operation: 'keys', data: { a: 1, b: 2, c: 3 } },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.keys).toEqual(['a', 'b', 'c'])
			})

			it('flattens nested object', async () => {
				const result = await jsonTool.execute(
					{ operation: 'flatten', data: { user: { name: 'test', address: { city: 'NYC' } } } },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.result).toHaveProperty('user.name', 'test')
				expect(result.data?.result).toHaveProperty('user.address.city', 'NYC')
			})
		})
	})

	describe('textTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(textTool.id).toBe('text')
			})

			it('validates text operations', () => {
				const operations = ['uppercase', 'lowercase', 'trim', 'reverse', 'wordCount']
				for (const operation of operations) {
					const result = textTool.inputSchema.safeParse({
						operation,
						text: 'hello world',
					})
					expect(result.success).toBe(true)
				}
			})
		})

		describe('execution', () => {
			it('converts to uppercase', async () => {
				const result = await textTool.execute(
					{ operation: 'uppercase', text: 'hello' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.result).toBe('HELLO')
			})

			it('converts to lowercase', async () => {
				const result = await textTool.execute(
					{ operation: 'lowercase', text: 'HELLO' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.result).toBe('hello')
			})

			it('reverses text', async () => {
				const result = await textTool.execute(
					{ operation: 'reverse', text: 'hello' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.result).toBe('olleh')
			})

			it('counts words', async () => {
				const result = await textTool.execute(
					{ operation: 'wordCount', text: 'hello world test' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.count).toBe(3)
			})

			it('creates slug', async () => {
				const result = await textTool.execute(
					{ operation: 'slug', text: 'Hello World Test!' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.result).toBe('hello-world-test')
			})

			it('converts to camelCase', async () => {
				const result = await textTool.execute(
					{ operation: 'camelCase', text: 'hello world test' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.result).toBe('helloWorldTest')
			})

			it('truncates text', async () => {
				const result = await textTool.execute(
					{ operation: 'truncate', text: 'hello world', length: 8, suffix: '...' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.result).toBe('hello...')
			})

			it('splits text', async () => {
				const result = await textTool.execute(
					{ operation: 'split', text: 'a,b,c', separator: ',' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.result).toEqual(['a', 'b', 'c'])
			})
		})
	})

	describe('mathTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(mathTool.id).toBe('math')
			})

			it('validates arithmetic operations', () => {
				const result = mathTool.inputSchema.safeParse({
					operation: 'add',
					a: 5,
					b: 3,
				})
				expect(result.success).toBe(true)
			})

			it('validates aggregate operations', () => {
				const result = mathTool.inputSchema.safeParse({
					operation: 'sum',
					numbers: [1, 2, 3, 4, 5],
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('adds numbers', async () => {
				const result = await mathTool.execute({ operation: 'add', a: 5, b: 3 }, context)
				expect(result.success).toBe(true)
				expect(result.data?.result).toBe(8)
			})

			it('subtracts numbers', async () => {
				const result = await mathTool.execute({ operation: 'subtract', a: 10, b: 3 }, context)
				expect(result.success).toBe(true)
				expect(result.data?.result).toBe(7)
			})

			it('multiplies numbers', async () => {
				const result = await mathTool.execute({ operation: 'multiply', a: 4, b: 5 }, context)
				expect(result.success).toBe(true)
				expect(result.data?.result).toBe(20)
			})

			it('divides numbers', async () => {
				const result = await mathTool.execute({ operation: 'divide', a: 20, b: 4 }, context)
				expect(result.success).toBe(true)
				expect(result.data?.result).toBe(5)
			})

			it('handles division by zero', async () => {
				const result = await mathTool.execute({ operation: 'divide', a: 10, b: 0 }, context)
				expect(result.success).toBe(false)
				expect(result.error).toContain('Division by zero')
			})

			it('calculates square root', async () => {
				const result = await mathTool.execute({ operation: 'sqrt', a: 16 }, context)
				expect(result.success).toBe(true)
				expect(result.data?.result).toBe(4)
			})

			it('calculates sum of array', async () => {
				const result = await mathTool.execute(
					{ operation: 'sum', numbers: [1, 2, 3, 4, 5] },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.result).toBe(15)
			})

			it('calculates average', async () => {
				const result = await mathTool.execute(
					{ operation: 'average', numbers: [2, 4, 6, 8, 10] },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.result).toBe(6)
			})

			it('calculates percentage', async () => {
				const result = await mathTool.execute({ operation: 'percentage', a: 25, b: 100 }, context)
				expect(result.success).toBe(true)
				expect(result.data?.result).toBe(25)
			})

			it('generates random integer', async () => {
				const result = await mathTool.execute({ operation: 'randomInt', min: 1, max: 10 }, context)
				expect(result.success).toBe(true)
				expect(result.data?.result).toBeGreaterThanOrEqual(1)
				expect(result.data?.result).toBeLessThanOrEqual(10)
			})
		})
	})

	describe('uuidTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(uuidTool.id).toBe('uuid')
			})

			it('validates uuid type', () => {
				const result = uuidTool.inputSchema.safeParse({ type: 'uuid', count: 1 })
				expect(result.success).toBe(true)
			})

			it('validates nanoid type with length', () => {
				const result = uuidTool.inputSchema.safeParse({
					type: 'nanoid',
					length: 10,
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('generates UUID v4', async () => {
				const result = await uuidTool.execute({ type: 'uuid', count: 1 }, context)
				expect(result.success).toBe(true)
				expect(result.data?.id).toMatch(
					/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
				)
			})

			it('generates multiple UUIDs', async () => {
				const result = await uuidTool.execute({ type: 'uuid', count: 3 }, context)
				expect(result.success).toBe(true)
				expect(result.data?.ids).toHaveLength(3)
			})

			it('generates nanoid with custom length', async () => {
				const result = await uuidTool.execute({ type: 'nanoid', length: 10, count: 1 }, context)
				expect(result.success).toBe(true)
				expect(result.data?.id).toHaveLength(10)
			})

			it('generates ULID', async () => {
				const result = await uuidTool.execute({ type: 'ulid', count: 1 }, context)
				expect(result.success).toBe(true)
				// ULID generation returns a string ID
				expect(typeof result.data?.id).toBe('string')
				expect(result.data?.id.length).toBeGreaterThan(0)
			})

			it('adds prefix to generated ID', async () => {
				const result = await uuidTool.execute({ type: 'uuid', count: 1, prefix: 'user_' }, context)
				expect(result.success).toBe(true)
				expect(result.data?.id).toMatch(/^user_/)
			})
		})
	})

	describe('hashTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(hashTool.id).toBe('hash')
			})

			it('validates hash operation', () => {
				const result = hashTool.inputSchema.safeParse({
					operation: 'hash',
					data: 'test',
					algorithm: 'SHA-256',
				})
				expect(result.success).toBe(true)
			})

			it('validates verify operation', () => {
				const result = hashTool.inputSchema.safeParse({
					operation: 'verify',
					data: 'test',
					expected: 'abc123',
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('generates SHA-256 hash', async () => {
				const result = await hashTool.execute(
					{ operation: 'hash', data: 'hello', algorithm: 'SHA-256', encoding: 'hex' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.hash).toHaveLength(64) // SHA-256 hex is 64 chars
			})

			it('generates base64 encoded hash', async () => {
				const result = await hashTool.execute(
					{ operation: 'hash', data: 'hello', algorithm: 'SHA-256', encoding: 'base64' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.hash).not.toHaveLength(64)
			})

			it('verifies hash correctly', async () => {
				// First generate a hash
				const hashResult = await hashTool.execute(
					{ operation: 'hash', data: 'test', algorithm: 'SHA-256', encoding: 'hex' },
					context,
				)

				// Then verify it
				const verifyResult = await hashTool.execute(
					{
						operation: 'verify',
						data: 'test',
						expected: hashResult.data?.hash,
						algorithm: 'SHA-256',
						encoding: 'hex',
					},
					context,
				)
				expect(verifyResult.success).toBe(true)
				expect(verifyResult.data?.matches).toBe(true)
			})

			it('generates HMAC', async () => {
				const result = await hashTool.execute(
					{
						operation: 'hmac',
						data: 'hello',
						key: 'secret',
						algorithm: 'SHA-256',
						encoding: 'hex',
					},
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.hmac).toBeDefined()
			})
		})
	})

	describe('base64Tool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(base64Tool.id).toBe('base64')
			})

			it('validates encode operation', () => {
				const result = base64Tool.inputSchema.safeParse({
					operation: 'encode',
					data: 'hello',
				})
				expect(result.success).toBe(true)
			})

			it('validates decode operation', () => {
				const result = base64Tool.inputSchema.safeParse({
					operation: 'decode',
					data: 'aGVsbG8=',
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('encodes to base64', async () => {
				const result = await base64Tool.execute(
					{ operation: 'encode', data: 'hello world', urlSafe: false },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.result).toBe('aGVsbG8gd29ybGQ=')
			})

			it('decodes from base64', async () => {
				const result = await base64Tool.execute(
					{ operation: 'decode', data: 'aGVsbG8gd29ybGQ=', urlSafe: false },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.result).toBe('hello world')
			})

			it('handles URL-safe base64 encoding', async () => {
				const result = await base64Tool.execute(
					{ operation: 'encode', data: 'test+data/with=special', urlSafe: true },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.result).not.toContain('+')
				expect(result.data?.result).not.toContain('/')
			})
		})
	})

	describe('urlTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(urlTool.id).toBe('url')
			})

			it('validates parse operation', () => {
				const result = urlTool.inputSchema.safeParse({
					operation: 'parse',
					url: 'https://example.com/path?query=value',
				})
				expect(result.success).toBe(true)
			})

			it('validates build operation', () => {
				const result = urlTool.inputSchema.safeParse({
					operation: 'build',
					base: 'https://example.com',
					path: '/api/users',
					params: { id: '123' },
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('parses URL components', async () => {
				const result = await urlTool.execute(
					{ operation: 'parse', url: 'https://example.com:8080/path?query=value#hash' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.protocol).toBe('https:')
				expect(result.data?.host).toBe('example.com:8080')
				expect(result.data?.pathname).toBe('/path')
				expect(result.data?.search).toBe('?query=value')
			})

			it('builds URL from components', async () => {
				const result = await urlTool.execute(
					{
						operation: 'build',
						base: 'https://example.com',
						path: '/api/users',
						params: { id: '123' },
					},
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.url).toBe('https://example.com/api/users?id=123')
			})

			it('encodes URL components', async () => {
				const result = await urlTool.execute(
					{ operation: 'encode', text: 'hello world' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.encoded).toBe('hello%20world')
			})

			it('decodes URL components', async () => {
				const result = await urlTool.execute(
					{ operation: 'decode', text: 'hello%20world' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.decoded).toBe('hello world')
			})

			it('adds params to URL', async () => {
				const result = await urlTool.execute(
					{
						operation: 'addParams',
						url: 'https://example.com/api',
						params: { foo: 'bar', baz: 'qux' },
					},
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.url).toContain('foo=bar')
				expect(result.data?.url).toContain('baz=qux')
			})
		})
	})

	describe('delayTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(delayTool.id).toBe('delay')
			})

			it('validates delay duration', () => {
				const result = delayTool.inputSchema.safeParse({
					duration: 1000,
				})
				expect(result.success).toBe(true)
			})

			it('rejects negative duration', () => {
				const result = delayTool.inputSchema.safeParse({
					duration: -100,
				})
				expect(result.success).toBe(false)
			})

			it('rejects duration over 30 seconds', () => {
				const result = delayTool.inputSchema.safeParse({
					duration: 31000,
				})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('delays execution', async () => {
				const start = Date.now()
				const result = await delayTool.execute({ duration: 100 }, context)
				const elapsed = Date.now() - start

				expect(result.success).toBe(true)
				expect(elapsed).toBeGreaterThanOrEqual(90) // Allow some tolerance
				expect(result.data?.requested).toBe(100)
			})

			it('includes reason in result', async () => {
				const result = await delayTool.execute(
					{ duration: 50, reason: 'Rate limiting' },
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.reason).toBe('Rate limiting')
			})
		})
	})

	describe('getUtilityTools', () => {
		it('returns all utility tools', () => {
			const tools = getUtilityTools(context)

			expect(tools).toHaveLength(9)
			expect(tools.map((t) => t.id)).toEqual([
				'datetime',
				'json',
				'text',
				'math',
				'uuid',
				'hash',
				'base64',
				'url',
				'delay',
			])
		})
	})
})
