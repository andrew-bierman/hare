import { z } from 'zod'
import { createTool, failure, success, type ToolContext } from './types'

/**
 * RSS Feed Tool - Fetch and parse RSS/Atom feeds.
 */
export const rssTool = createTool({
	id: 'rss',
	description: 'Fetch and parse RSS or Atom feeds to get the latest content from websites.',
	inputSchema: z.object({
		url: z.string().url().describe('RSS/Atom feed URL'),
		limit: z.number().optional().default(10).describe('Maximum number of items to return'),
	}),
	execute: async (params, _context) => {
		try {
			const { url, limit } = params

			const response = await fetch(url, {
				headers: { 'User-Agent': 'Hare-Agent/1.0' },
			})

			if (!response.ok) {
				return failure(`Failed to fetch feed: ${response.status}`)
			}

			const text = await response.text()

			// Simple XML parsing for RSS/Atom feeds
			const items: Array<{
				title: string
				link: string
				description: string
				pubDate: string
			}> = []

			// RSS 2.0 format
			const itemMatches = text.matchAll(/<item>([\s\S]*?)<\/item>/gi)
			for (const match of itemMatches) {
				if (items.length >= limit) break
				const itemXml = match[1]
				if (!itemXml) continue
				const title = itemXml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)?.[1] || ''
				const link = itemXml.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i)?.[1] || ''
				const description =
					itemXml.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/is)?.[1] || ''
				const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i)?.[1] || ''
				items.push({ title, link, description: description.slice(0, 500), pubDate })
			}

			// Atom format fallback
			if (items.length === 0) {
				const entryMatches = text.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)
				for (const match of entryMatches) {
					if (items.length >= limit) break
					const entryXml = match[1]
					if (!entryXml) continue
					const title = entryXml.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || ''
					const link = entryXml.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/i)?.[1] || ''
					const description =
						entryXml.match(/<(?:summary|content)[^>]*>(.*?)<\/(?:summary|content)>/is)?.[1] || ''
					const pubDate =
						entryXml.match(/<(?:published|updated)>(.*?)<\/(?:published|updated)>/i)?.[1] || ''
					items.push({ title, link, description: description.slice(0, 500), pubDate })
				}
			}

			return success({ items, count: items.length, feedUrl: url })
		} catch (error) {
			return failure(`RSS error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Web Scrape Tool - Fetch and extract content from web pages.
 */
export const scrapeTool = createTool({
	id: 'scrape',
	description: 'Fetch a web page and extract text content, links, or metadata.',
	inputSchema: z.object({
		url: z.string().url().describe('URL to scrape'),
		selector: z.string().optional().describe('CSS-like selector to extract specific content'),
		extract: z
			.enum(['text', 'links', 'images', 'meta', 'all'])
			.optional()
			.default('text')
			.describe('What to extract from the page'),
	}),
	execute: async (params, _context) => {
		try {
			const { url, extract } = params

			const response = await fetch(url, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; Hare-Agent/1.0; +https://hare.dev)',
				},
			})

			if (!response.ok) {
				return failure(`Failed to fetch page: ${response.status}`)
			}

			const html = await response.text()

			const result: Record<string, unknown> = { url }

			if (extract === 'text' || extract === 'all') {
				// Remove scripts, styles, and tags
				const text = html
					.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
					.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
					.replace(/<[^>]+>/g, ' ')
					.replace(/\s+/g, ' ')
					.trim()
				result.text = text.slice(0, 10000)
			}

			if (extract === 'links' || extract === 'all') {
				const linkMatches = html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/gi)
				const links: Array<{ href: string; text: string }> = []
				for (const match of linkMatches) {
					if (links.length >= 50) break
					const href = match[1] || ''
					const text = match[2] || ''
					if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
						links.push({ href, text: text.trim() })
					}
				}
				result.links = links
			}

			if (extract === 'images' || extract === 'all') {
				const imgMatches = html.matchAll(/<img[^>]+src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*\/?>/gi)
				const images: Array<{ src: string; alt: string }> = []
				for (const match of imgMatches) {
					if (images.length >= 30) break
					images.push({ src: match[1] || '', alt: match[2] || '' })
				}
				result.images = images
			}

			if (extract === 'meta' || extract === 'all') {
				const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || ''
				const description =
					html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)?.[1] || ''
				result.meta = { title, description }
			}

			return success(result)
		} catch (error) {
			return failure(`Scrape error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Regex Tool - Match and extract patterns from text.
 */
export const regexTool = createTool({
	id: 'regex',
	description: 'Match, extract, or replace text using regular expressions.',
	inputSchema: z.object({
		operation: z.enum(['match', 'matchAll', 'replace', 'split', 'test']).describe('Operation'),
		text: z.string().describe('Text to search'),
		pattern: z.string().describe('Regular expression pattern'),
		flags: z.string().optional().default('g').describe('Regex flags (g, i, m, etc.)'),
		replacement: z.string().optional().describe('Replacement string for replace operation'),
	}),
	execute: async (params, _context) => {
		try {
			const { operation, text, pattern, flags, replacement } = params

			const regex = new RegExp(pattern, flags)

			switch (operation) {
				case 'match': {
					const match = text.match(regex)
					return success({ match, found: !!match })
				}
				case 'matchAll': {
					const matches = [
						...text.matchAll(new RegExp(pattern, flags.includes('g') ? flags : `${flags}g`)),
					]
					return success({
						matches: matches.map((m) => ({
							match: m[0],
							groups: m.slice(1),
							index: m.index,
						})),
						count: matches.length,
					})
				}
				case 'replace':
					return success({ result: text.replace(regex, replacement || '') })
				case 'split':
					return success({ parts: text.split(regex) })
				case 'test':
					return success({ matches: regex.test(text) })
				default:
					return failure(`Unknown operation: ${operation}`)
			}
		} catch (error) {
			return failure(`Regex error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Crypto Tool - Encryption and decryption utilities.
 */
export const cryptoTool = createTool({
	id: 'crypto',
	description: 'Generate random values, encrypt/decrypt data using AES-GCM.',
	inputSchema: z.object({
		operation: z.enum(['random', 'encrypt', 'decrypt', 'generateKey']).describe('Crypto operation'),
		data: z.string().optional().describe('Data to encrypt/decrypt'),
		key: z.string().optional().describe('Base64-encoded key for encrypt/decrypt'),
		iv: z.string().optional().describe('Base64-encoded IV for decrypt'),
		length: z.number().optional().default(32).describe('Length for random bytes'),
		encoding: z.enum(['hex', 'base64']).optional().default('base64').describe('Output encoding'),
	}),
	execute: async (params, _context) => {
		try {
			const { operation, data, key, iv, length, encoding } = params

			const toHex = (buffer: ArrayBuffer) =>
				Array.from(new Uint8Array(buffer))
					.map((b) => b.toString(16).padStart(2, '0'))
					.join('')
			const toBase64 = (buffer: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)))
			const encode = (buffer: ArrayBuffer) =>
				encoding === 'hex' ? toHex(buffer) : toBase64(buffer)

			switch (operation) {
				case 'random': {
					const bytes = new Uint8Array(length)
					crypto.getRandomValues(bytes)
					return success({ value: encode(bytes.buffer), length })
				}
				case 'generateKey': {
					const cryptoKey = await crypto.subtle.generateKey(
						{ name: 'AES-GCM', length: 256 },
						true,
						['encrypt', 'decrypt'],
					)
					const exported = await crypto.subtle.exportKey('raw', cryptoKey)
					return success({ key: toBase64(exported) })
				}
				case 'encrypt': {
					if (!data || !key) return failure('Data and key required for encryption')
					const keyBytes = Uint8Array.from(atob(key), (c) => c.charCodeAt(0))
					const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, [
						'encrypt',
					])
					const ivBytes = new Uint8Array(12)
					crypto.getRandomValues(ivBytes)
					const encrypted = await crypto.subtle.encrypt(
						{ name: 'AES-GCM', iv: ivBytes },
						cryptoKey,
						new TextEncoder().encode(data),
					)
					return success({
						encrypted: toBase64(encrypted),
						iv: toBase64(ivBytes.buffer),
					})
				}
				case 'decrypt': {
					if (!data || !key || !iv) return failure('Data, key, and IV required for decryption')
					const keyBytes = Uint8Array.from(atob(key), (c) => c.charCodeAt(0))
					const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0))
					const dataBytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
					const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, [
						'decrypt',
					])
					const decrypted = await crypto.subtle.decrypt(
						{ name: 'AES-GCM', iv: ivBytes },
						cryptoKey,
						dataBytes,
					)
					return success({ decrypted: new TextDecoder().decode(decrypted) })
				}
				default:
					return failure(`Unknown operation: ${operation}`)
			}
		} catch (error) {
			return failure(`Crypto error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * JSON Schema Tool - Validate and generate JSON schemas.
 */
export const jsonSchemaTool = createTool({
	id: 'json_schema',
	description: 'Validate JSON data against a schema or generate a schema from sample data.',
	inputSchema: z.object({
		operation: z.enum(['validate', 'generate']).describe('Operation to perform'),
		data: z.unknown().describe('JSON data to validate or generate schema from'),
		schema: z.record(z.string(), z.unknown()).optional().describe('JSON Schema for validation'),
	}),
	execute: async (params, _context) => {
		try {
			const { operation, data, schema } = params

			if (operation === 'generate') {
				const generateSchema = (value: unknown): Record<string, unknown> => {
					if (value === null) return { type: 'null' }
					if (Array.isArray(value)) {
						if (value.length === 0) return { type: 'array', items: {} }
						return { type: 'array', items: generateSchema(value[0]) }
					}
					switch (typeof value) {
						case 'string':
							return { type: 'string' }
						case 'number':
							return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' }
						case 'boolean':
							return { type: 'boolean' }
						case 'object': {
							const properties: Record<string, unknown> = {}
							for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
								properties[k] = generateSchema(v)
							}
							return { type: 'object', properties, required: Object.keys(properties) }
						}
						default:
							return {}
					}
				}
				return success({ schema: generateSchema(data) })
			}

			if (operation === 'validate') {
				if (!schema) return failure('Schema required for validation')
				// Simple validation - check type matches
				const validate = (value: unknown, sch: Record<string, unknown>): boolean => {
					const type = sch.type as string
					if (type === 'null') return value === null
					if (type === 'string') return typeof value === 'string'
					if (type === 'number' || type === 'integer') return typeof value === 'number'
					if (type === 'boolean') return typeof value === 'boolean'
					if (type === 'array') return Array.isArray(value)
					if (type === 'object')
						return typeof value === 'object' && value !== null && !Array.isArray(value)
					return true
				}
				const valid = validate(data, schema)
				return success({ valid, data, schema })
			}

			return failure(`Unknown operation: ${operation}`)
		} catch (error) {
			return failure(
				`JSON Schema error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * CSV Tool - Parse and generate CSV data.
 */
export const csvTool = createTool({
	id: 'csv',
	description: 'Parse CSV text to JSON or convert JSON to CSV format.',
	inputSchema: z.object({
		operation: z.enum(['parse', 'stringify']).describe('Operation to perform'),
		data: z.unknown().describe('CSV string to parse or array to stringify'),
		headers: z.boolean().optional().default(true).describe('First row contains headers'),
		delimiter: z.string().optional().default(',').describe('Field delimiter'),
	}),
	execute: async (params, _context) => {
		try {
			const { operation, data, headers, delimiter } = params

			if (operation === 'parse') {
				if (typeof data !== 'string') return failure('CSV data must be a string')
				const lines = data.split('\n').filter((l) => l.trim())
				if (lines.length === 0) return success({ rows: [], count: 0 })

				const parseLine = (line: string) => {
					const result: string[] = []
					let current = ''
					let inQuotes = false
					for (const char of line) {
						if (char === '"') {
							inQuotes = !inQuotes
						} else if (char === delimiter && !inQuotes) {
							result.push(current.trim())
							current = ''
						} else {
							current += char
						}
					}
					result.push(current.trim())
					return result
				}

				if (headers && lines.length > 0) {
					const headerRow = parseLine(lines[0] || '')
					const rows = lines.slice(1).map((line) => {
						const values = parseLine(line)
						const row: Record<string, string> = {}
						headerRow.forEach((h, i) => {
							row[h] = values[i] || ''
						})
						return row
					})
					return success({ rows, headers: headerRow, count: rows.length })
				}

				const rows = lines.map(parseLine)
				return success({ rows, count: rows.length })
			}

			if (operation === 'stringify') {
				if (!Array.isArray(data)) return failure('Data must be an array')
				if (data.length === 0) return success({ csv: '', count: 0 })

				const escapeField = (field: unknown) => {
					const str = String(field ?? '')
					if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
						return `"${str.replace(/"/g, '""')}"`
					}
					return str
				}

				const firstRow = data[0]
				if (typeof firstRow === 'object' && firstRow !== null && !Array.isArray(firstRow)) {
					const keys = Object.keys(firstRow)
					const lines = [
						keys.map(escapeField).join(delimiter),
						...data.map((row) =>
							keys.map((k) => escapeField((row as Record<string, unknown>)[k])).join(delimiter),
						),
					]
					return success({ csv: lines.join('\n'), count: data.length })
				}

				const lines = data.map((row) =>
					Array.isArray(row) ? row.map(escapeField).join(delimiter) : escapeField(row),
				)
				return success({ csv: lines.join('\n'), count: data.length })
			}

			return failure(`Unknown operation: ${operation}`)
		} catch (error) {
			return failure(`CSV error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Template Tool - Simple string templating.
 */
export const templateTool = createTool({
	id: 'template',
	description: 'Render templates with variable substitution using {{variable}} syntax.',
	inputSchema: z.object({
		template: z.string().describe('Template string with {{variable}} placeholders'),
		variables: z.record(z.string(), z.unknown()).describe('Variables to substitute'),
		strict: z.boolean().optional().default(false).describe('Fail if variables are missing'),
	}),
	execute: async (params, _context) => {
		try {
			const { template, variables, strict } = params

			const missing: string[] = []
			const result = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
				if (key in variables) {
					return String(variables[key] ?? '')
				}
				if (strict) {
					missing.push(key)
				}
				return match
			})

			if (strict && missing.length > 0) {
				return failure(`Missing variables: ${missing.join(', ')}`)
			}

			return success({ result, variablesUsed: Object.keys(variables) })
		} catch (error) {
			return failure(`Template error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Get all data tools.
 */
export function getDataTools(_context: ToolContext) {
	return [rssTool, scrapeTool, regexTool, cryptoTool, jsonSchemaTool, csvTool, templateTool]
}
