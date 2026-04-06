import { z } from 'zod'
import { createTool, failure, success, type ToolResult } from '../types'
import { TextOutputSchema } from './schemas'

/**
 * Text Tool - String manipulation operations.
 */
export const textTool = createTool({
	id: 'text',
	description:
		'Perform text operations: split, join, replace, case conversion, trim, pad, truncate, word count, and more.',
	outputSchema: TextOutputSchema,
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
	execute: async (params, _context): Promise<ToolResult<unknown>> => {
		try {
			const {
				operation,
				text,
				separator,
				search,
				replacement,
				length,
				padChar,
				suffix,
				pattern,
				times,
			} = params

			switch (operation) {
				case 'split':
					return success({
						result: text.split(separator || ''),
						count: text.split(separator || '').length,
					})

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
						result: text.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase()),
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
