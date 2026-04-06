import { z } from 'zod'
import { createTool, failure, success, type ToolResult } from '../types'
import {
	Base64OutputSchema,
	HashToolOutputSchema,
	UrlOutputSchema,
	UuidOutputSchema,
} from './schemas'

/**
 * UUID Tool - Generate unique identifiers.
 */
export const uuidTool = createTool({
	id: 'uuid',
	description: 'Generate UUIDs (v4), nano IDs, or other unique identifiers.',
	outputSchema: UuidOutputSchema,
	inputSchema: z.object({
		type: z
			.enum(['uuid', 'nanoid', 'ulid', 'cuid', 'timestamp', 'short'])
			.optional()
			.default('uuid')
			.describe('Type of ID to generate'),
		count: z.number().optional().default(1).describe('Number of IDs to generate'),
		length: z.number().optional().default(21).describe('Length for nanoid/short'),
		prefix: z.string().optional().describe('Optional prefix to add'),
	}),
	execute: async (params, _context): Promise<ToolResult<unknown>> => {
		try {
			const { type, count, length, prefix } = params

			const generateId = (): string => {
				let id: string

				switch (type) {
					case 'uuid':
						id = crypto.randomUUID()
						break

					case 'nanoid': {
						const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
						const bytes = new Uint8Array(length)
						crypto.getRandomValues(bytes)
						id = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
						break
					}

					case 'ulid': {
						// ULID: Universally Unique Lexicographically Sortable Identifier
						const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
						const now = Date.now()
						let ulid = ''
						// Timestamp (10 chars)
						for (let i = 9; i >= 0; i--) {
							ulid = ENCODING[Math.floor(now / 32 ** i) % 32] + ulid
						}
						// Random (16 chars)
						const random = new Uint8Array(10)
						crypto.getRandomValues(random)
						for (const byte of random) {
							ulid += ENCODING[byte % 32]
						}
						id = ulid
						break
					}

					case 'cuid': {
						// Simplified CUID-like generation
						const timestamp = Date.now().toString(36)
						const random = Math.random().toString(36).slice(2, 10)
						id = `c${timestamp}${random}`
						break
					}

					case 'timestamp':
						id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
						break

					case 'short': {
						const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
						const bytes = new Uint8Array(length)
						crypto.getRandomValues(bytes)
						id = Array.from(bytes, (byte) => chars[byte % chars.length]).join('')
						break
					}

					default:
						id = crypto.randomUUID()
				}

				return prefix ? `${prefix}${id}` : id
			}

			if (count === 1) {
				return success({ id: generateId() })
			}

			const ids = Array.from({ length: count }, () => generateId())
			return success({ ids, count: ids.length })
		} catch (error) {
			return failure(`UUID error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Hash Tool - Generate cryptographic hashes.
 */
export const hashTool = createTool({
	id: 'hash',
	description: 'Generate cryptographic hashes (SHA-256, SHA-384, SHA-512) or verify hashes.',
	outputSchema: HashToolOutputSchema,
	inputSchema: z.object({
		operation: z
			.enum(['hash', 'verify', 'hmac'])
			.optional()
			.default('hash')
			.describe('Operation to perform'),
		data: z.string().describe('Data to hash'),
		algorithm: z
			.enum(['SHA-256', 'SHA-384', 'SHA-512'])
			.optional()
			.default('SHA-256')
			.describe('Hash algorithm'),
		encoding: z.enum(['hex', 'base64']).optional().default('hex').describe('Output encoding'),
		expected: z.string().optional().describe('Expected hash for verification'),
		key: z.string().optional().describe('Secret key for HMAC'),
	}),
	execute: async (params, _context): Promise<ToolResult<unknown>> => {
		try {
			const { operation, data, algorithm, encoding, expected, key } = params

			const arrayBufferToHex = (buffer: ArrayBuffer): string => {
				return Array.from(new Uint8Array(buffer))
					.map((b) => b.toString(16).padStart(2, '0'))
					.join('')
			}

			const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
				return btoa(String.fromCharCode(...new Uint8Array(buffer)))
			}

			const encode = (buffer: ArrayBuffer): string => {
				return encoding === 'base64' ? arrayBufferToBase64(buffer) : arrayBufferToHex(buffer)
			}

			switch (operation) {
				case 'hash': {
					const encoder = new TextEncoder()
					const hashBuffer = await crypto.subtle.digest(algorithm, encoder.encode(data))
					const hash = encode(hashBuffer)
					return success({ hash, algorithm, encoding, inputLength: data.length })
				}

				case 'verify': {
					if (!expected) return failure('Expected hash required for verification')
					const encoder = new TextEncoder()
					const hashBuffer = await crypto.subtle.digest(algorithm, encoder.encode(data))
					const hash = encode(hashBuffer)
					const matches = hash.toLowerCase() === expected.toLowerCase()
					return success({ matches, computed: hash, expected })
				}

				case 'hmac': {
					if (!key) return failure('Key required for HMAC')
					const encoder = new TextEncoder()
					const keyData = await crypto.subtle.importKey(
						'raw',
						encoder.encode(key),
						{ name: 'HMAC', hash: algorithm },
						false,
						['sign'],
					)
					const signature = await crypto.subtle.sign('HMAC', keyData, encoder.encode(data))
					const hmac = encode(signature)
					return success({ hmac, algorithm, encoding })
				}

				default:
					return failure(`Unknown operation: ${operation}`)
			}
		} catch (error) {
			return failure(`Hash error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Base64 Tool - Encode/decode base64.
 */
export const base64Tool = createTool({
	id: 'base64',
	description:
		'Encode data to base64 or decode base64 to text. Supports standard and URL-safe variants.',
	outputSchema: Base64OutputSchema,
	inputSchema: z.object({
		operation: z.enum(['encode', 'decode']).describe('Operation to perform'),
		data: z.string().describe('Data to encode/decode'),
		urlSafe: z.boolean().optional().default(false).describe('Use URL-safe base64 variant'),
	}),
	execute: async (params, _context): Promise<ToolResult<unknown>> => {
		try {
			const { operation, data, urlSafe } = params

			switch (operation) {
				case 'encode': {
					let encoded = btoa(unescape(encodeURIComponent(data)))
					if (urlSafe) {
						encoded = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
					}
					return success({
						result: encoded,
						originalLength: data.length,
						encodedLength: encoded.length,
					})
				}

				case 'decode': {
					let input = data
					if (urlSafe) {
						input = input.replace(/-/g, '+').replace(/_/g, '/')
						while (input.length % 4) input += '='
					}
					const decoded = decodeURIComponent(escape(atob(input)))
					return success({
						result: decoded,
						encodedLength: data.length,
						decodedLength: decoded.length,
					})
				}

				default:
					return failure(`Unknown operation: ${operation}`)
			}
		} catch (error) {
			return failure(`Base64 error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * URL Tool - Parse and construct URLs.
 */
export const urlTool = createTool({
	id: 'url',
	description:
		'Parse URLs, construct URLs, encode/decode URL components, or manipulate query parameters.',
	outputSchema: UrlOutputSchema,
	inputSchema: z.object({
		operation: z
			.enum([
				'parse',
				'build',
				'encode',
				'decode',
				'addParams',
				'removeParams',
				'getParams',
				'join',
			])
			.describe('Operation to perform'),
		url: z.string().optional().describe('URL to operate on'),
		base: z.string().optional().describe('Base URL for building/joining'),
		path: z.string().optional().describe('Path for building'),
		params: z.record(z.string(), z.string()).optional().describe('Query parameters'),
		paramNames: z.array(z.string()).optional().describe('Parameter names to remove'),
		text: z.string().optional().describe('Text to encode/decode'),
	}),
	execute: async (params, _context): Promise<ToolResult<unknown>> => {
		try {
			const { operation, url, base, path, params: queryParams, paramNames, text } = params

			switch (operation) {
				case 'parse': {
					if (!url) return failure('URL required')
					const parsed = new URL(url)
					return success({
						href: parsed.href,
						protocol: parsed.protocol,
						host: parsed.host,
						hostname: parsed.hostname,
						port: parsed.port,
						pathname: parsed.pathname,
						search: parsed.search,
						hash: parsed.hash,
						origin: parsed.origin,
						params: Object.fromEntries(parsed.searchParams.entries()),
					})
				}

				case 'build': {
					if (!base) return failure('Base URL required')
					const built = new URL(path || '', base)
					if (queryParams) {
						for (const [key, value] of Object.entries(queryParams)) {
							built.searchParams.set(key, value)
						}
					}
					return success({ url: built.href })
				}

				case 'encode': {
					if (!text) return failure('Text required')
					return success({
						encoded: encodeURIComponent(text),
						original: text,
					})
				}

				case 'decode': {
					if (!text) return failure('Text required')
					return success({
						decoded: decodeURIComponent(text),
						original: text,
					})
				}

				case 'addParams': {
					if (!url) return failure('URL required')
					const parsed = new URL(url)
					if (queryParams) {
						for (const [key, value] of Object.entries(queryParams)) {
							parsed.searchParams.set(key, value)
						}
					}
					return success({ url: parsed.href })
				}

				case 'removeParams': {
					if (!url) return failure('URL required')
					const parsed = new URL(url)
					if (paramNames) {
						for (const name of paramNames) {
							parsed.searchParams.delete(name)
						}
					}
					return success({ url: parsed.href })
				}

				case 'getParams': {
					if (!url) return failure('URL required')
					const parsed = new URL(url)
					return success({
						params: Object.fromEntries(parsed.searchParams.entries()),
						count: parsed.searchParams.size,
					})
				}

				case 'join': {
					if (!base) return failure('Base URL required')
					if (!path) return failure('Path required')
					const joined = new URL(path, base)
					return success({ url: joined.href })
				}

				default:
					return failure(`Unknown operation: ${operation}`)
			}
		} catch (error) {
			return failure(`URL error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})
