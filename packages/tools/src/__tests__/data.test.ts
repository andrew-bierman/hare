import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
	rssTool,
	scrapeTool,
	regexTool,
	cryptoTool,
	jsonSchemaTool,
	csvTool,
	templateTool,
	getDataTools,
} from '../data'
import type { ToolContext } from '../types'
import { createFetchMock, expectResultData, ResultSchemas } from './test-utils'

const originalFetch = globalThis.fetch

const createMockContext = (): ToolContext => ({
	env: {} as ToolContext['env'],
	workspaceId: 'test-workspace',
	userId: 'test-user',
})

describe('Data Tools', () => {
	let context: ToolContext

	beforeEach(() => {
		context = createMockContext()
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		vi.clearAllMocks()
	})

	describe('rssTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(rssTool.id).toBe('rss')
			})

			it('validates RSS feed request', () => {
				const result = rssTool.inputSchema.safeParse({
					url: 'https://example.com/feed.xml',
				})
				expect(result.success).toBe(true)
			})

			it('validates with options', () => {
				const result = rssTool.inputSchema.safeParse({
					url: 'https://example.com/feed.xml',
					limit: 5,
					includeContent: true,
				})
				expect(result.success).toBe(true)
			})

			it('rejects invalid URL', () => {
				const result = rssTool.inputSchema.safeParse({
					url: 'not-a-url',
				})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('parses RSS feed', async () => {
				const mockFetch = vi.fn().mockResolvedValueOnce({
					ok: true,
					text: async () => `
						<?xml version="1.0"?>
						<rss version="2.0">
							<channel>
								<title>Test Feed</title>
								<link>https://example.com</link>
								<item>
									<title>Article 1</title>
									<link>https://example.com/1</link>
									<pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
								</item>
							</channel>
						</rss>
					`,
				})
				globalThis.fetch = createFetchMock(mockFetch)

				const result = await rssTool.execute(
					{ url: 'https://example.com/feed.xml', limit: 10, includeContent: false },
					context,
				)

				const data = expectResultData(result, ResultSchemas.validation)
				expect(data.type).toBe('rss')
				expect(data.items).toHaveLength(1)
			})

			it('handles fetch errors', async () => {
				const mockFetch = vi.fn().mockResolvedValueOnce({
					ok: false,
					status: 404,
					statusText: 'Not Found',
				})
				globalThis.fetch = createFetchMock(mockFetch)

				const result = await rssTool.execute(
					{ url: 'https://example.com/feed.xml', limit: 10, includeContent: false },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Failed to fetch feed')
			})
		})
	})

	describe('scrapeTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(scrapeTool.id).toBe('scrape')
			})

			it('validates scrape request', () => {
				const result = scrapeTool.inputSchema.safeParse({
					url: 'https://example.com',
				})
				expect(result.success).toBe(true)
			})

			it('validates with extract option', () => {
				const result = scrapeTool.inputSchema.safeParse({
					url: 'https://example.com',
					extract: 'headings',
				})
				expect(result.success).toBe(true)
			})

			it('validates with selector', () => {
				const result = scrapeTool.inputSchema.safeParse({
					url: 'https://example.com',
					selector: '.main-content',
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('extracts text from page', async () => {
				const mockFetch = vi.fn().mockResolvedValueOnce({
					ok: true,
					text: async () => '<html><body><p>Hello World</p></body></html>',
				})
				globalThis.fetch = createFetchMock(mockFetch)

				const result = await scrapeTool.execute(
					{ url: 'https://example.com', extract: 'text', maxLength: 10000, timeout: 10000 },
					context,
				)

				const data = expectResultData(result, ResultSchemas.scrape)
				expect(data.text).toContain('Hello World')
			})

			it('extracts links from page', async () => {
				const mockFetch = vi.fn().mockResolvedValueOnce({
					ok: true,
					text: async () => '<html><body><a href="https://test.com">Link</a></body></html>',
				})
				globalThis.fetch = createFetchMock(mockFetch)

				const result = await scrapeTool.execute(
					{ url: 'https://example.com', extract: 'links', maxLength: 10000, timeout: 10000 },
					context,
				)

				const data = expectResultData(result, ResultSchemas.scrape)
				expect(data.links).toHaveLength(1)
				expect(data.links?.[0].href).toBe('https://test.com')
			})

			it('extracts meta tags', async () => {
				const mockFetch = vi.fn().mockResolvedValueOnce({
					ok: true,
					text: async () => `
						<html>
							<head>
								<title>Test Page</title>
								<meta name="description" content="Test description">
							</head>
							<body></body>
						</html>
					`,
				})
				globalThis.fetch = createFetchMock(mockFetch)

				const result = await scrapeTool.execute(
					{ url: 'https://example.com', extract: 'meta', maxLength: 10000, timeout: 10000 },
					context,
				)

				const data = expectResultData(result, ResultSchemas.scrape)
				expect(data.meta?.title).toBe('Test Page')
				expect(data.meta?.description).toBe('Test description')
			})
		})
	})

	describe('regexTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(regexTool.id).toBe('regex')
			})

			it('validates test operation', () => {
				const result = regexTool.inputSchema.safeParse({
					operation: 'test',
					text: 'hello world',
					pattern: 'hello',
				})
				expect(result.success).toBe(true)
			})

			it('validates with flags', () => {
				const result = regexTool.inputSchema.safeParse({
					operation: 'match',
					text: 'Hello World',
					pattern: 'hello',
					flags: 'i',
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution - test', () => {
			it('tests pattern match', async () => {
				const result = await regexTool.execute(
					{ operation: 'test', text: 'hello world', pattern: 'hello', flags: 'g' },
					context,
				)
				const data = expectResultData(result, ResultSchemas.regex)
				expect(data.matches).toBe(true)
			})

			it('tests pattern no match', async () => {
				const result = await regexTool.execute(
					{ operation: 'test', text: 'hello world', pattern: 'foo', flags: 'g' },
					context,
				)
				const data = expectResultData(result, ResultSchemas.regex)
				expect(data.matches).toBe(false)
			})
		})

		describe('execution - matchAll', () => {
			it('finds all matches', async () => {
				const result = await regexTool.execute(
					{ operation: 'matchAll', text: 'cat bat rat', pattern: '\\w+at', flags: 'g' },
					context,
				)
				const data = expectResultData(result, ResultSchemas.regex)
				expect(data.matches).toHaveLength(3)
			})
		})

		describe('execution - replace', () => {
			it('replaces matches', async () => {
				const result = await regexTool.execute(
					{
						operation: 'replace',
						text: 'hello world',
						pattern: 'world',
						replacement: 'there',
						flags: 'g',
					},
					context,
				)
				const data = expectResultData(result, ResultSchemas.regex)
				expect(data.result).toBe('hello there')
			})
		})

		describe('execution - extract', () => {
			it('extracts captured groups', async () => {
				const result = await regexTool.execute(
					{
						operation: 'extract',
						text: 'user@example.com admin@test.org',
						pattern: '(\\w+)@(\\w+\\.\\w+)',
						groupNames: ['user', 'domain'],
						flags: 'g',
					},
					context,
				)
				expect(result.success).toBe(true)
				// Extract returns a custom shape with extracted array
				const data = result.data as { extracted: Array<{ user: string; domain: string }> }
				expect(data?.extracted).toHaveLength(2)
				expect(data?.extracted[0].user).toBe('user')
				expect(data?.extracted[0].domain).toBe('example.com')
			})
		})

		describe('error handling', () => {
			it('handles invalid regex pattern', async () => {
				const result = await regexTool.execute(
					{ operation: 'test', text: 'test', pattern: '[invalid', flags: 'g' },
					context,
				)
				expect(result.success).toBe(false)
				expect(result.error).toContain('Invalid regex pattern')
			})
		})
	})

	describe('cryptoTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(cryptoTool.id).toBe('crypto')
			})

			it('validates generateKey operation', () => {
				const result = cryptoTool.inputSchema.safeParse({
					operation: 'generateKey',
				})
				expect(result.success).toBe(true)
			})

			it('validates randomBytes operation', () => {
				const result = cryptoTool.inputSchema.safeParse({
					operation: 'randomBytes',
					bytes: 32,
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('generates encryption key', async () => {
				const result = await cryptoTool.execute(
					{ operation: 'generateKey', bytes: 32 },
					context,
				)
				const data = expectResultData(result, ResultSchemas.crypto)
				expect(data.key).toBeDefined()
				expect(data.algorithm).toBe('AES-GCM')
			})

			it('generates random bytes', async () => {
				const result = await cryptoTool.execute(
					{ operation: 'randomBytes', bytes: 16 },
					context,
				)
				const data = expectResultData(result, ResultSchemas.crypto)
				expect(data.hex).toBeDefined()
				expect(data.base64).toBeDefined()
				expect(data.bytes).toBe(16)
			})

			it('encrypts and decrypts data', async () => {
				// Generate a key first
				const keyResult = await cryptoTool.execute(
					{ operation: 'generateKey', bytes: 32 },
					context,
				)
				const keyData = expectResultData(keyResult, ResultSchemas.crypto)
				const key = keyData.key as string

				// Encrypt
				const encryptResult = await cryptoTool.execute(
					{ operation: 'encrypt', data: 'secret message', key, bytes: 32 },
					context,
				)
				const encryptData = expectResultData(encryptResult, ResultSchemas.crypto)

				// Decrypt
				const decryptResult = await cryptoTool.execute(
					{
						operation: 'decrypt',
						data: encryptData.encrypted,
						key,
						iv: encryptData.iv,
						bytes: 32,
					},
					context,
				)
				const decryptData = expectResultData(decryptResult, ResultSchemas.crypto)
				expect(decryptData.decrypted).toBe('secret message')
			})
		})
	})

	describe('jsonSchemaTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(jsonSchemaTool.id).toBe('json_schema')
			})

			it('validates schema validation request', () => {
				const result = jsonSchemaTool.inputSchema.safeParse({
					data: { name: 'test' },
					schema: { type: 'object', properties: { name: { type: 'string' } } },
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('validates valid data', async () => {
				const result = await jsonSchemaTool.execute(
					{
						data: { name: 'John', age: 30 },
						schema: {
							type: 'object',
							properties: { name: { type: 'string' }, age: { type: 'number' } },
							required: ['name'],
						},
					},
					context,
				)
				const data = expectResultData(result, ResultSchemas.validation)
				expect(data.valid).toBe(true)
				expect(data.errors).toHaveLength(0)
			})

			it('detects type errors', async () => {
				const result = await jsonSchemaTool.execute(
					{
						data: { name: 123 },
						schema: {
							type: 'object',
							properties: { name: { type: 'string' } },
						},
					},
					context,
				)
				const data = expectResultData(result, ResultSchemas.validation)
				expect(data.valid).toBe(false)
				expect(data.errors?.length).toBeGreaterThan(0)
			})

			it('detects missing required fields', async () => {
				const result = await jsonSchemaTool.execute(
					{
						data: {},
						schema: {
							type: 'object',
							required: ['name'],
						},
					},
					context,
				)
				const data = expectResultData(result, ResultSchemas.validation)
				expect(data.valid).toBe(false)
			})

			it('validates string constraints', async () => {
				const result = await jsonSchemaTool.execute(
					{
						data: { code: 'AB' },
						schema: {
							type: 'object',
							properties: { code: { type: 'string', minLength: 3 } },
						},
					},
					context,
				)
				const data = expectResultData(result, ResultSchemas.validation)
				expect(data.valid).toBe(false)
			})

			it('validates number constraints', async () => {
				const result = await jsonSchemaTool.execute(
					{
						data: { age: 150 },
						schema: {
							type: 'object',
							properties: { age: { type: 'number', maximum: 120 } },
						},
					},
					context,
				)
				const data = expectResultData(result, ResultSchemas.validation)
				expect(data.valid).toBe(false)
			})

			it('validates enum values', async () => {
				const result = await jsonSchemaTool.execute(
					{
						data: { status: 'invalid' },
						schema: {
							type: 'object',
							properties: { status: { enum: ['active', 'inactive'] } },
						},
					},
					context,
				)
				const data = expectResultData(result, ResultSchemas.validation)
				expect(data.valid).toBe(false)
			})
		})
	})

	describe('csvTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(csvTool.id).toBe('csv')
			})

			it('validates parse operation', () => {
				const result = csvTool.inputSchema.safeParse({
					operation: 'parse',
					data: 'name,age\nJohn,30',
				})
				expect(result.success).toBe(true)
			})

			it('validates stringify operation', () => {
				const result = csvTool.inputSchema.safeParse({
					operation: 'stringify',
					data: [{ name: 'John', age: 30 }],
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution - parse', () => {
			it('parses CSV with headers', async () => {
				const result = await csvTool.execute(
					{
						operation: 'parse',
						data: 'name,age\nJohn,30\nJane,25',
						options: { headers: true, delimiter: ',', skipEmptyLines: false },
					},
					context,
				)
				expect(result.success).toBe(true)
				const data = result.data as { data: Record<string, string>[] }
				expect(data?.data).toHaveLength(2)
				expect(data?.data[0].name).toBe('John')
				expect(data?.data[0].age).toBe('30')
			})

			it('handles custom delimiter', async () => {
				const result = await csvTool.execute(
					{
						operation: 'parse',
						data: 'name;age\nJohn;30',
						options: { delimiter: ';', headers: true, skipEmptyLines: false },
					},
					context,
				)
				expect(result.success).toBe(true)
				const data = result.data as { data: Record<string, string>[] }
				expect(data?.data[0].name).toBe('John')
			})

			it('handles quoted values', async () => {
				const result = await csvTool.execute(
					{
						operation: 'parse',
						data: 'name,bio\n"John","Hello, World"',
						options: { headers: true, delimiter: ',', skipEmptyLines: false },
					},
					context,
				)
				expect(result.success).toBe(true)
				const data = result.data as { data: Record<string, string>[] }
				expect(data?.data[0].bio).toBe('Hello, World')
			})
		})

		describe('execution - stringify', () => {
			it('converts objects to CSV', async () => {
				const result = await csvTool.execute(
					{
						operation: 'stringify',
						data: [
							{ name: 'John', age: 30 },
							{ name: 'Jane', age: 25 },
						],
						options: { headers: true, delimiter: ',', skipEmptyLines: false },
					},
					context,
				)
				expect(result.success).toBe(true)
				const data = result.data as { csv: string }
				expect(data?.csv).toContain('name,age')
				expect(data?.csv).toContain('John,30')
			})

			it('escapes special characters', async () => {
				const result = await csvTool.execute(
					{
						operation: 'stringify',
						data: [{ name: 'John, Jr.', bio: 'Hello "World"' }],
						options: { headers: true, delimiter: ',', skipEmptyLines: false },
					},
					context,
				)
				expect(result.success).toBe(true)
				const data = result.data as { csv: string }
				expect(data?.csv).toContain('"John, Jr."')
			})
		})
	})

	describe('templateTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(templateTool.id).toBe('template')
			})

			it('validates template request', () => {
				const result = templateTool.inputSchema.safeParse({
					template: 'Hello {{name}}!',
					variables: { name: 'World' },
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('replaces variables', async () => {
				const result = await templateTool.execute(
					{
						template: 'Hello {{name}}!',
						variables: { name: 'World' },
					},
					context,
				)
				const data = expectResultData(result, ResultSchemas.template)
				expect(data.result).toBe('Hello World!')
			})

			it('handles nested variables', async () => {
				const result = await templateTool.execute(
					{
						template: '{{user.name}} is {{user.age}} years old',
						variables: { user: { name: 'John', age: 30 } },
					},
					context,
				)
				const data = expectResultData(result, ResultSchemas.template)
				expect(data.result).toBe('John is 30 years old')
			})

			it('handles missing variables with empty string', async () => {
				const result = await templateTool.execute(
					{
						template: 'Hello {{name}}{{missing}}!',
						variables: { name: 'World' },
						options: { missingBehavior: 'empty', escapeHtml: false },
					},
					context,
				)
				const data = expectResultData(result, ResultSchemas.template)
				expect(data.result).toBe('Hello World!')
				expect(data.missingVariables).toContain('missing')
			})

			it('keeps missing variables when configured', async () => {
				const result = await templateTool.execute(
					{
						template: 'Hello {{name}}!',
						variables: {},
						options: { missingBehavior: 'keep', escapeHtml: false },
					},
					context,
				)
				const data = expectResultData(result, ResultSchemas.template)
				expect(data.result).toBe('Hello {{name}}!')
			})

			it('escapes HTML when configured', async () => {
				const result = await templateTool.execute(
					{
						template: '{{content}}',
						variables: { content: '<script>alert("xss")</script>' },
						options: { escapeHtml: true, missingBehavior: 'empty' },
					},
					context,
				)
				const data = expectResultData(result, ResultSchemas.template)
				expect(data.result).not.toContain('<script>')
				expect(data.result).toContain('&lt;script&gt;')
			})
		})
	})

	describe('getDataTools', () => {
		it('returns all data tools', () => {
			const tools = getDataTools(context)

			expect(tools).toHaveLength(7)
			expect(tools.map((t) => t.id)).toEqual([
				'rss',
				'scrape',
				'regex',
				'crypto',
				'json_schema',
				'csv',
				'template',
			])
		})
	})
})
