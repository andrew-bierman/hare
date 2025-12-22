import { z } from 'zod'
import { createTool, success, failure, type ToolContext } from './types'

/**
 * DateTime Tool - Get current time, format dates, calculate differences.
 */
export const datetimeTool = createTool({
	id: 'datetime',
	description:
		'Get current date/time, format dates, parse dates, or calculate time differences. Supports ISO 8601 and common formats.',
	inputSchema: z.object({
		operation: z
			.enum(['now', 'format', 'parse', 'diff', 'add', 'subtract'])
			.describe('Operation to perform'),
		date: z.string().optional().describe('Date string to operate on (ISO 8601 or common formats)'),
		date2: z.string().optional().describe('Second date for diff operation'),
		format: z
			.string()
			.optional()
			.describe(
				'Output format: "iso", "date", "time", "datetime", "relative", "unix", or custom format tokens'
			),
		timezone: z.string().optional().default('UTC').describe('Timezone (e.g., "America/New_York", "UTC")'),
		amount: z.number().optional().describe('Amount to add/subtract'),
		unit: z
			.enum(['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds'])
			.optional()
			.describe('Unit for add/subtract'),
	}),
	execute: async (params, _context) => {
		try {
			const { operation, date, date2, format, timezone, amount, unit } = params

			const parseDate = (d?: string): Date => {
				if (!d) return new Date()
				const parsed = new Date(d)
				if (isNaN(parsed.getTime())) throw new Error(`Invalid date: ${d}`)
				return parsed
			}

			const formatDate = (d: Date, fmt?: string, tz?: string): string => {
				const options: Intl.DateTimeFormatOptions = { timeZone: tz || 'UTC' }

				switch (fmt) {
					case 'iso':
						return d.toISOString()
					case 'date':
						return d.toLocaleDateString('en-US', { ...options, dateStyle: 'full' })
					case 'time':
						return d.toLocaleTimeString('en-US', { ...options, timeStyle: 'medium' })
					case 'datetime':
						return d.toLocaleString('en-US', { ...options, dateStyle: 'full', timeStyle: 'medium' })
					case 'unix':
						return String(Math.floor(d.getTime() / 1000))
					case 'relative': {
						const now = new Date()
						const diffMs = now.getTime() - d.getTime()
						const diffSec = Math.abs(Math.floor(diffMs / 1000))
						const diffMin = Math.floor(diffSec / 60)
						const diffHour = Math.floor(diffMin / 60)
						const diffDay = Math.floor(diffHour / 24)

						const past = diffMs > 0
						if (diffSec < 60) return past ? 'just now' : 'in a moment'
						if (diffMin < 60) return past ? `${diffMin} minutes ago` : `in ${diffMin} minutes`
						if (diffHour < 24) return past ? `${diffHour} hours ago` : `in ${diffHour} hours`
						if (diffDay < 30) return past ? `${diffDay} days ago` : `in ${diffDay} days`
						return d.toLocaleDateString('en-US', options)
					}
					default:
						return d.toISOString()
				}
			}

			switch (operation) {
				case 'now': {
					const now = new Date()
					return success({
						iso: now.toISOString(),
						unix: Math.floor(now.getTime() / 1000),
						formatted: formatDate(now, format, timezone),
						timezone,
					})
				}

				case 'format': {
					const d = parseDate(date)
					return success({
						original: date,
						formatted: formatDate(d, format, timezone),
						iso: d.toISOString(),
					})
				}

				case 'parse': {
					const d = parseDate(date)
					return success({
						original: date,
						iso: d.toISOString(),
						unix: Math.floor(d.getTime() / 1000),
						year: d.getUTCFullYear(),
						month: d.getUTCMonth() + 1,
						day: d.getUTCDate(),
						hour: d.getUTCHours(),
						minute: d.getUTCMinutes(),
						second: d.getUTCSeconds(),
						dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
							d.getUTCDay()
						],
					})
				}

				case 'diff': {
					const d1 = parseDate(date)
					const d2 = parseDate(date2)
					const diffMs = d2.getTime() - d1.getTime()
					const diffSec = diffMs / 1000
					const diffMin = diffSec / 60
					const diffHour = diffMin / 60
					const diffDay = diffHour / 24

					return success({
						milliseconds: diffMs,
						seconds: Math.floor(diffSec),
						minutes: Math.floor(diffMin),
						hours: Math.floor(diffHour),
						days: Math.floor(diffDay),
						weeks: Math.floor(diffDay / 7),
						humanReadable:
							Math.abs(diffDay) >= 1
								? `${Math.abs(Math.floor(diffDay))} days`
								: Math.abs(diffHour) >= 1
									? `${Math.abs(Math.floor(diffHour))} hours`
									: `${Math.abs(Math.floor(diffMin))} minutes`,
					})
				}

				case 'add':
				case 'subtract': {
					if (amount === undefined || !unit) {
						return failure('Amount and unit are required for add/subtract operations')
					}
					const d = parseDate(date)
					const multiplier = operation === 'subtract' ? -1 : 1
					const ms = amount * multiplier

					switch (unit) {
						case 'milliseconds':
							d.setTime(d.getTime() + ms)
							break
						case 'seconds':
							d.setTime(d.getTime() + ms * 1000)
							break
						case 'minutes':
							d.setTime(d.getTime() + ms * 60 * 1000)
							break
						case 'hours':
							d.setTime(d.getTime() + ms * 60 * 60 * 1000)
							break
						case 'days':
							d.setDate(d.getDate() + amount * multiplier)
							break
						case 'weeks':
							d.setDate(d.getDate() + amount * 7 * multiplier)
							break
						case 'months':
							d.setMonth(d.getMonth() + amount * multiplier)
							break
						case 'years':
							d.setFullYear(d.getFullYear() + amount * multiplier)
							break
					}

					return success({
						original: date || new Date().toISOString(),
						result: d.toISOString(),
						formatted: formatDate(d, format, timezone),
					})
				}

				default:
					return failure(`Unknown operation: ${operation}`)
			}
		} catch (error) {
			return failure(`DateTime error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * JSON Tool - Parse, stringify, transform, and query JSON data.
 */
export const jsonTool = createTool({
	id: 'json',
	description:
		'Parse JSON strings, stringify objects, extract values using dot notation paths, or transform JSON data.',
	inputSchema: z.object({
		operation: z.enum(['parse', 'stringify', 'get', 'set', 'delete', 'merge', 'keys', 'values', 'flatten']).describe(
			'Operation to perform'
		),
		data: z.unknown().describe('The JSON data or string to operate on'),
		path: z.string().optional().describe('Dot notation path for get/set/delete (e.g., "user.name", "items[0].id")'),
		value: z.unknown().optional().describe('Value to set at path'),
		data2: z.unknown().optional().describe('Second object for merge operation'),
		pretty: z.boolean().optional().default(true).describe('Pretty print output for stringify'),
	}),
	execute: async (params, _context) => {
		try {
			const { operation, data, path, value, data2, pretty } = params

			const getByPath = (obj: unknown, pathStr: string): unknown => {
				const parts = pathStr.replace(/\[(\d+)\]/g, '.$1').split('.')
				let current: unknown = obj
				for (const part of parts) {
					if (current === null || current === undefined) return undefined
					if (typeof current !== 'object') return undefined
					current = (current as Record<string, unknown>)[part]
				}
				return current
			}

			const setByPath = (obj: unknown, pathStr: string, val: unknown): unknown => {
				const result = JSON.parse(JSON.stringify(obj))
				const parts = pathStr.replace(/\[(\d+)\]/g, '.$1').split('.')
				let current: Record<string, unknown> = result

				for (let i = 0; i < parts.length - 1; i++) {
					const part = parts[i]
					if (!(part in current)) {
						current[part] = Number.isNaN(Number(parts[i + 1])) ? {} : []
					}
					current = current[part] as Record<string, unknown>
				}

				current[parts[parts.length - 1]] = val
				return result
			}

			const deleteByPath = (obj: unknown, pathStr: string): unknown => {
				const result = JSON.parse(JSON.stringify(obj))
				const parts = pathStr.replace(/\[(\d+)\]/g, '.$1').split('.')
				let current: Record<string, unknown> = result

				for (let i = 0; i < parts.length - 1; i++) {
					const part = parts[i]
					if (!(part in current)) return result
					current = current[part] as Record<string, unknown>
				}

				delete current[parts[parts.length - 1]]
				return result
			}

			const flattenObject = (obj: unknown, prefix = ''): Record<string, unknown> => {
				const result: Record<string, unknown> = {}

				if (typeof obj !== 'object' || obj === null) {
					return { [prefix]: obj }
				}

				if (Array.isArray(obj)) {
					obj.forEach((item, index) => {
						const newKey = prefix ? `${prefix}[${index}]` : `[${index}]`
						Object.assign(result, flattenObject(item, newKey))
					})
				} else {
					for (const [key, val] of Object.entries(obj)) {
						const newKey = prefix ? `${prefix}.${key}` : key
						if (typeof val === 'object' && val !== null) {
							Object.assign(result, flattenObject(val, newKey))
						} else {
							result[newKey] = val
						}
					}
				}

				return result
			}

			switch (operation) {
				case 'parse': {
					if (typeof data !== 'string') {
						return failure('Parse requires a string input')
					}
					const parsed = JSON.parse(data)
					return success({ result: parsed, type: typeof parsed })
				}

				case 'stringify': {
					const str = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
					return success({ result: str, length: str.length })
				}

				case 'get': {
					if (!path) return failure('Path is required for get operation')
					const result = getByPath(data, path)
					return success({ path, value: result, found: result !== undefined })
				}

				case 'set': {
					if (!path) return failure('Path is required for set operation')
					const result = setByPath(data, path, value)
					return success({ result })
				}

				case 'delete': {
					if (!path) return failure('Path is required for delete operation')
					const result = deleteByPath(data, path)
					return success({ result })
				}

				case 'merge': {
					if (typeof data !== 'object' || typeof data2 !== 'object') {
						return failure('Merge requires two objects')
					}
					const result = { ...data, ...data2 }
					return success({ result })
				}

				case 'keys': {
					if (typeof data !== 'object' || data === null) {
						return failure('Keys requires an object')
					}
					return success({ keys: Object.keys(data as object), count: Object.keys(data as object).length })
				}

				case 'values': {
					if (typeof data !== 'object' || data === null) {
						return failure('Values requires an object')
					}
					return success({
						values: Object.values(data as object),
						count: Object.values(data as object).length,
					})
				}

				case 'flatten': {
					const result = flattenObject(data)
					return success({ result, keys: Object.keys(result) })
				}

				default:
					return failure(`Unknown operation: ${operation}`)
			}
		} catch (error) {
			return failure(`JSON error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Text Tool - String manipulation operations.
 */
export const textTool = createTool({
	id: 'text',
	description:
		'Perform text operations: split, join, replace, case conversion, trim, pad, truncate, word count, and more.',
	inputSchema: z.object({
		operation: z
			.enum([
				'split',
				'join',
				'replace',
				'replaceAll',
				'uppercase',
				'lowercase',
				'capitalize',
				'titleCase',
				'trim',
				'padStart',
				'padEnd',
				'truncate',
				'reverse',
				'wordCount',
				'charCount',
				'lines',
				'slug',
				'camelCase',
				'snakeCase',
				'kebabCase',
				'extract',
				'contains',
				'startsWith',
				'endsWith',
				'repeat',
			])
			.describe('Text operation to perform'),
		text: z.string().describe('The text to operate on'),
		separator: z.string().optional().describe('Separator for split/join'),
		search: z.string().optional().describe('String to search for in replace operations'),
		replacement: z.string().optional().describe('Replacement string'),
		length: z.number().optional().describe('Length for pad/truncate'),
		padChar: z.string().optional().default(' ').describe('Character to pad with'),
		suffix: z.string().optional().default('...').describe('Suffix for truncate'),
		pattern: z.string().optional().describe('Regex pattern for extract'),
		times: z.number().optional().default(1).describe('Number of times for repeat'),
	}),
	execute: async (params, _context) => {
		try {
			const { operation, text, separator, search, replacement, length, padChar, suffix, pattern, times } = params

			switch (operation) {
				case 'split':
					return success({ result: text.split(separator || ''), count: text.split(separator || '').length })

				case 'join':
					// Expects text to be parseable as JSON array
					try {
						const arr = JSON.parse(text)
						if (!Array.isArray(arr)) return failure('Join requires a JSON array string')
						return success({ result: arr.join(separator || '') })
					} catch {
						return failure('Join requires a valid JSON array string')
					}

				case 'replace':
					if (!search) return failure('Search string required')
					return success({ result: text.replace(search, replacement || '') })

				case 'replaceAll':
					if (!search) return failure('Search string required')
					return success({ result: text.split(search).join(replacement || '') })

				case 'uppercase':
					return success({ result: text.toUpperCase() })

				case 'lowercase':
					return success({ result: text.toLowerCase() })

				case 'capitalize':
					return success({ result: text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() })

				case 'titleCase':
					return success({
						result: text
							.toLowerCase()
							.split(' ')
							.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
							.join(' '),
					})

				case 'trim':
					return success({ result: text.trim() })

				case 'padStart':
					if (!length) return failure('Length required for padStart')
					return success({ result: text.padStart(length, padChar) })

				case 'padEnd':
					if (!length) return failure('Length required for padEnd')
					return success({ result: text.padEnd(length, padChar) })

				case 'truncate':
					if (!length) return failure('Length required for truncate')
					return success({
						result: text.length > length ? text.slice(0, length - suffix.length) + suffix : text,
						truncated: text.length > length,
					})

				case 'reverse':
					return success({ result: text.split('').reverse().join('') })

				case 'wordCount': {
					const words = text
						.trim()
						.split(/\s+/)
						.filter((w) => w.length > 0)
					return success({ count: words.length, words })
				}

				case 'charCount':
					return success({
						total: text.length,
						withoutSpaces: text.replace(/\s/g, '').length,
						letters: text.replace(/[^a-zA-Z]/g, '').length,
						digits: text.replace(/[^0-9]/g, '').length,
					})

				case 'lines': {
					const lines = text.split(/\r?\n/)
					return success({ lines, count: lines.length })
				}

				case 'slug':
					return success({
						result: text
							.toLowerCase()
							.trim()
							.replace(/[^\w\s-]/g, '')
							.replace(/[\s_-]+/g, '-')
							.replace(/^-+|-+$/g, ''),
					})

				case 'camelCase':
					return success({
						result: text
							.toLowerCase()
							.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase()),
					})

				case 'snakeCase':
					return success({
						result: text
							.replace(/([a-z])([A-Z])/g, '$1_$2')
							.replace(/[\s-]+/g, '_')
							.toLowerCase(),
					})

				case 'kebabCase':
					return success({
						result: text
							.replace(/([a-z])([A-Z])/g, '$1-$2')
							.replace(/[\s_]+/g, '-')
							.toLowerCase(),
					})

				case 'extract': {
					if (!pattern) return failure('Pattern required for extract')
					const regex = new RegExp(pattern, 'g')
					const matches = text.match(regex)
					return success({ matches: matches || [], count: matches?.length || 0 })
				}

				case 'contains':
					if (!search) return failure('Search string required')
					return success({ result: text.includes(search), index: text.indexOf(search) })

				case 'startsWith':
					if (!search) return failure('Search string required')
					return success({ result: text.startsWith(search) })

				case 'endsWith':
					if (!search) return failure('Search string required')
					return success({ result: text.endsWith(search) })

				case 'repeat':
					return success({ result: text.repeat(times) })

				default:
					return failure(`Unknown operation: ${operation}`)
			}
		} catch (error) {
			return failure(`Text error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Math Tool - Mathematical calculations.
 */
export const mathTool = createTool({
	id: 'math',
	description:
		'Perform mathematical operations: basic arithmetic, statistics, rounding, random numbers, and more.',
	inputSchema: z.object({
		operation: z
			.enum([
				'add',
				'subtract',
				'multiply',
				'divide',
				'modulo',
				'power',
				'sqrt',
				'abs',
				'floor',
				'ceil',
				'round',
				'min',
				'max',
				'sum',
				'average',
				'median',
				'random',
				'randomInt',
				'percentage',
				'clamp',
				'evaluate',
			])
			.describe('Math operation to perform'),
		a: z.number().optional().describe('First number'),
		b: z.number().optional().describe('Second number'),
		numbers: z.array(z.number()).optional().describe('Array of numbers for aggregate operations'),
		min: z.number().optional().describe('Minimum value for random/clamp'),
		max: z.number().optional().describe('Maximum value for random/clamp'),
		decimals: z.number().optional().default(2).describe('Decimal places for rounding'),
		expression: z.string().optional().describe('Safe math expression to evaluate'),
	}),
	execute: async (params, _context) => {
		try {
			const { operation, a, b, numbers, min, max, decimals, expression } = params

			switch (operation) {
				case 'add':
					if (a === undefined || b === undefined) return failure('Two numbers required')
					return success({ result: a + b })

				case 'subtract':
					if (a === undefined || b === undefined) return failure('Two numbers required')
					return success({ result: a - b })

				case 'multiply':
					if (a === undefined || b === undefined) return failure('Two numbers required')
					return success({ result: a * b })

				case 'divide':
					if (a === undefined || b === undefined) return failure('Two numbers required')
					if (b === 0) return failure('Division by zero')
					return success({ result: a / b })

				case 'modulo':
					if (a === undefined || b === undefined) return failure('Two numbers required')
					return success({ result: a % b })

				case 'power':
					if (a === undefined || b === undefined) return failure('Two numbers required')
					return success({ result: a ** b })

				case 'sqrt':
					if (a === undefined) return failure('Number required')
					if (a < 0) return failure('Cannot calculate square root of negative number')
					return success({ result: Math.sqrt(a) })

				case 'abs':
					if (a === undefined) return failure('Number required')
					return success({ result: Math.abs(a) })

				case 'floor':
					if (a === undefined) return failure('Number required')
					return success({ result: Math.floor(a) })

				case 'ceil':
					if (a === undefined) return failure('Number required')
					return success({ result: Math.ceil(a) })

				case 'round': {
					if (a === undefined) return failure('Number required')
					const factor = 10 ** decimals
					return success({ result: Math.round(a * factor) / factor })
				}

				case 'min':
					if (!numbers || numbers.length === 0) return failure('Array of numbers required')
					return success({ result: Math.min(...numbers) })

				case 'max':
					if (!numbers || numbers.length === 0) return failure('Array of numbers required')
					return success({ result: Math.max(...numbers) })

				case 'sum':
					if (!numbers || numbers.length === 0) return failure('Array of numbers required')
					return success({ result: numbers.reduce((acc, n) => acc + n, 0) })

				case 'average':
					if (!numbers || numbers.length === 0) return failure('Array of numbers required')
					return success({ result: numbers.reduce((acc, n) => acc + n, 0) / numbers.length })

				case 'median': {
					if (!numbers || numbers.length === 0) return failure('Array of numbers required')
					const sorted = [...numbers].sort((x, y) => x - y)
					const mid = Math.floor(sorted.length / 2)
					const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
					return success({ result: median })
				}

				case 'random': {
					const lo = min ?? 0
					const hi = max ?? 1
					return success({ result: Math.random() * (hi - lo) + lo })
				}

				case 'randomInt': {
					const minInt = min ?? 0
					const maxInt = max ?? 100
					return success({ result: Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt })
				}

				case 'percentage':
					if (a === undefined || b === undefined) return failure('Two numbers required (part, whole)')
					if (b === 0) return failure('Whole cannot be zero')
					return success({ result: (a / b) * 100, formatted: `${((a / b) * 100).toFixed(decimals)}%` })

				case 'clamp':
					if (a === undefined || min === undefined || max === undefined) {
						return failure('Value, min, and max required')
					}
					return success({ result: Math.min(Math.max(a, min), max) })

				case 'evaluate': {
					if (!expression) return failure('Expression required')
					// Safe evaluation - only allow numbers and basic operators
					const safeExpression = expression.replace(/[^0-9+\-*/%().^ ]/g, '')
					if (safeExpression !== expression) {
						return failure('Expression contains invalid characters')
					}
					// Replace ^ with ** for power
					const jsExpression = safeExpression.replace(/\^/g, '**')
					const result = Function(`"use strict"; return (${jsExpression})`)()
					return success({ result, expression })
				}

				default:
					return failure(`Unknown operation: ${operation}`)
			}
		} catch (error) {
			return failure(`Math error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * UUID Tool - Generate unique identifiers.
 */
export const uuidTool = createTool({
	id: 'uuid',
	description: 'Generate UUIDs (v4), nano IDs, or other unique identifiers.',
	inputSchema: z.object({
		type: z.enum(['uuid', 'nanoid', 'ulid', 'cuid', 'timestamp', 'short']).optional().default('uuid').describe(
			'Type of ID to generate'
		),
		count: z.number().optional().default(1).describe('Number of IDs to generate'),
		length: z.number().optional().default(21).describe('Length for nanoid/short'),
		prefix: z.string().optional().describe('Optional prefix to add'),
	}),
	execute: async (params, _context) => {
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
	inputSchema: z.object({
		operation: z.enum(['hash', 'verify', 'hmac']).optional().default('hash').describe('Operation to perform'),
		data: z.string().describe('Data to hash'),
		algorithm: z.enum(['SHA-256', 'SHA-384', 'SHA-512']).optional().default('SHA-256').describe('Hash algorithm'),
		encoding: z.enum(['hex', 'base64']).optional().default('hex').describe('Output encoding'),
		expected: z.string().optional().describe('Expected hash for verification'),
		key: z.string().optional().describe('Secret key for HMAC'),
	}),
	execute: async (params, _context) => {
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
						['sign']
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
	description: 'Encode data to base64 or decode base64 to text. Supports standard and URL-safe variants.',
	inputSchema: z.object({
		operation: z.enum(['encode', 'decode']).describe('Operation to perform'),
		data: z.string().describe('Data to encode/decode'),
		urlSafe: z.boolean().optional().default(false).describe('Use URL-safe base64 variant'),
	}),
	execute: async (params, _context) => {
		try {
			const { operation, data, urlSafe } = params

			switch (operation) {
				case 'encode': {
					let encoded = btoa(unescape(encodeURIComponent(data)))
					if (urlSafe) {
						encoded = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
					}
					return success({ result: encoded, originalLength: data.length, encodedLength: encoded.length })
				}

				case 'decode': {
					let input = data
					if (urlSafe) {
						input = input.replace(/-/g, '+').replace(/_/g, '/')
						while (input.length % 4) input += '='
					}
					const decoded = decodeURIComponent(escape(atob(input)))
					return success({ result: decoded, encodedLength: data.length, decodedLength: decoded.length })
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
	inputSchema: z.object({
		operation: z
			.enum(['parse', 'build', 'encode', 'decode', 'addParams', 'removeParams', 'getParams', 'join'])
			.describe('Operation to perform'),
		url: z.string().optional().describe('URL to operate on'),
		base: z.string().optional().describe('Base URL for building/joining'),
		path: z.string().optional().describe('Path for building'),
		params: z.record(z.string(), z.string()).optional().describe('Query parameters'),
		paramNames: z.array(z.string()).optional().describe('Parameter names to remove'),
		text: z.string().optional().describe('Text to encode/decode'),
	}),
	execute: async (params, _context) => {
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

/**
 * Delay Tool - Wait for a specified time.
 */
export const delayTool = createTool({
	id: 'delay',
	description: 'Wait for a specified amount of time before continuing. Useful for rate limiting or timing.',
	inputSchema: z.object({
		duration: z.number().min(0).max(30000).describe('Duration to wait in milliseconds (max 30 seconds)'),
		reason: z.string().optional().describe('Reason for the delay (for logging)'),
	}),
	execute: async (params, _context) => {
		const { duration, reason } = params
		const start = Date.now()
		await new Promise((resolve) => setTimeout(resolve, duration))
		const actual = Date.now() - start

		return success({
			requested: duration,
			actual,
			reason,
		})
	},
})

/**
 * Get all utility tools.
 */
export function getUtilityTools(_context: ToolContext) {
	return [datetimeTool, jsonTool, textTool, mathTool, uuidTool, hashTool, base64Tool, urlTool, delayTool]
}
