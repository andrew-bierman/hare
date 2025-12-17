import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { SqlToolConfig, ToolContext } from './types'

const sqlInputSchema = z.object({
	query: z.string().describe('The SQL query to execute. Only SELECT queries are allowed.'),
	params: z.array(z.string()).optional().describe('Parameters to bind to the query (use ? placeholders)'),
})

/**
 * Create a SQL (D1) query tool for agents.
 * Executes read-only SQL queries against the D1 database.
 */
export function createSqlTool(config: SqlToolConfig, ctx: ToolContext) {
	const { allowedTables = [], readOnly = true, maxRows = 100 } = config.config

	return createTool({
		id: config.id,
		description: config.description || 'Execute SQL queries against the database',
		inputSchema: sqlInputSchema,
		execute: async ({ context }) => {
			const { query, params = [] } = context
			const db = ctx.env.DB

			if (!db) {
				return { success: false, error: 'Database not available' }
			}

			try {
				// Normalize the query
				const normalizedQuery = query.trim().toUpperCase()

				// Only allow SELECT queries if readOnly
				if (readOnly && !normalizedQuery.startsWith('SELECT')) {
					return { success: false, error: 'Only SELECT queries are allowed' }
				}

				// Block dangerous operations even if not readOnly
				const blockedKeywords = ['DROP', 'TRUNCATE', 'ALTER', 'CREATE INDEX', 'ATTACH', 'DETACH']
				for (const keyword of blockedKeywords) {
					if (normalizedQuery.includes(keyword)) {
						return { success: false, error: `${keyword} operations are not allowed` }
					}
				}

				// Check if query accesses only allowed tables
				if (allowedTables.length > 0) {
					const tablePattern = /\bFROM\s+(\w+)|\bJOIN\s+(\w+)|\bINTO\s+(\w+)|\bUPDATE\s+(\w+)/gi
					const matches = [...query.matchAll(tablePattern)]
					const accessedTables = matches
						.flatMap((m) => [m[1], m[2], m[3], m[4]])
						.filter(Boolean)
						.map((t) => t.toLowerCase())

					for (const table of accessedTables) {
						if (!allowedTables.map((t) => t.toLowerCase()).includes(table)) {
							return { success: false, error: `Access to table '${table}' is not allowed` }
						}
					}
				}

				// Add LIMIT if not present for SELECT queries
				let finalQuery = query.trim().replace(/;$/, '')
				if (normalizedQuery.startsWith('SELECT') && !normalizedQuery.includes('LIMIT')) {
					finalQuery = `${finalQuery} LIMIT ${maxRows}`
				}

				// Execute the query
				const result = await db.prepare(finalQuery).bind(...params).all()

				return {
					success: true,
					rows: result.results.slice(0, maxRows),
					rowCount: result.results.length,
					truncated: result.results.length > maxRows,
					meta: {
						duration: result.meta?.duration,
						rowsRead: result.meta?.rows_read,
						rowsWritten: result.meta?.rows_written,
					},
				}
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Query execution failed',
				}
			}
		},
	})
}
