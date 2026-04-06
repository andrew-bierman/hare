import { z } from 'zod'
import { createTool, failure, success, type ToolResult } from '../types'
import { JsonOutputSchema } from './schemas'

/**
 * JSON Tool - Parse, stringify, transform, and query JSON data.
 */
export const jsonTool = createTool({
	id: 'json',
	description:
		'Parse JSON strings, stringify objects, extract values using dot notation paths, or transform JSON data.',
	outputSchema: JsonOutputSchema,
	inputSchema: z.object({
		operation: z
			.enum(['parse', 'stringify', 'get', 'set', 'delete', 'merge', 'keys', 'values', 'flatten'])
			.describe('Operation to perform'),
		data: z.unknown().describe('The JSON data or string to operate on'),
		path: z
			.string()
			.optional()
			.describe('Dot notation path for get/set/delete (e.g., "user.name", "items[0].id")'),
		value: z.unknown().optional().describe('Value to set at path'),
		data2: z.unknown().optional().describe('Second object for merge operation'),
		pretty: z.boolean().optional().default(true).describe('Pretty print output for stringify'),
	}),
	execute: async (params, _context): Promise<ToolResult<unknown>> => {
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
				const result = structuredClone(obj) as Record<string, unknown>
				const parts = pathStr.replace(/\[(\d+)\]/g, '.$1').split('.')
				let current: Record<string, unknown> = result

				for (let i = 0; i < parts.length - 1; i++) {
					const part = parts[i]
					const nextPart = parts[i + 1]
					if (part && !(part in current)) {
						current[part] = nextPart && Number.isNaN(Number(nextPart)) ? {} : []
					}
					if (part) {
						current = current[part] as Record<string, unknown>
					}
				}

				const lastPart = parts[parts.length - 1]
				if (lastPart) {
					current[lastPart] = val
				}
				return result
			}

			const deleteByPath = (obj: unknown, pathStr: string): unknown => {
				const result = structuredClone(obj) as Record<string, unknown>
				const parts = pathStr.replace(/\[(\d+)\]/g, '.$1').split('.')
				let current: Record<string, unknown> = result

				for (let i = 0; i < parts.length - 1; i++) {
					const part = parts[i]
					if (!part || !(part in current)) return result
					current = current[part] as Record<string, unknown>
				}

				const lastPart = parts[parts.length - 1]
				if (lastPart) {
					delete current[lastPart]
				}
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
					return success({
						keys: Object.keys(data as object),
						count: Object.keys(data as object).length,
					})
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
