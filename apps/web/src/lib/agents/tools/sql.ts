import { z } from 'zod'
import { createTool, success, failure, type ToolContext } from './types'

/**
 * SQL Query Tool - Execute read-only SQL queries on D1.
 */
export const sqlQueryTool = createTool({
	id: 'sql_query',
	description: 'Execute a read-only SQL query on the D1 database. Only SELECT statements are allowed for safety.',
	inputSchema: z.object({
		query: z.string().describe('The SQL SELECT query to execute'),
		params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().describe('Query parameters for prepared statement'),
	}),
	execute: async (params, context) => {
		const db = context.env.DB
		if (!db) {
			return failure('D1 database not available')
		}

		// Security: Only allow SELECT statements
		const normalizedQuery = params.query.trim().toLowerCase()
		if (!normalizedQuery.startsWith('select')) {
			return failure('Only SELECT queries are allowed. Use sql_execute for other operations.')
		}

		// Block dangerous patterns
		const dangerousPatterns = [
			/;\s*drop/i,
			/;\s*delete/i,
			/;\s*update/i,
			/;\s*insert/i,
			/;\s*alter/i,
			/;\s*create/i,
			/;\s*truncate/i,
		]
		for (const pattern of dangerousPatterns) {
			if (pattern.test(params.query)) {
				return failure('Query contains dangerous patterns. Only single SELECT statements are allowed.')
			}
		}

		try {
			const stmt = db.prepare(params.query)
			const boundStmt = params.params ? stmt.bind(...params.params) : stmt

			const result = await boundStmt.all()
			return success({
				rows: result.results,
				rowCount: result.results?.length ?? 0,
				meta: result.meta,
			})
		} catch (error) {
			return failure(`SQL query failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * SQL Execute Tool - Execute write operations on D1 (requires elevated permissions).
 */
export const sqlExecuteTool = createTool({
	id: 'sql_execute',
	description: 'Execute a SQL statement that modifies data (INSERT, UPDATE, DELETE). Requires elevated permissions.',
	inputSchema: z.object({
		statement: z.string().describe('The SQL statement to execute'),
		params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().describe('Statement parameters for prepared statement'),
	}),
	execute: async (params, context) => {
		const db = context.env.DB
		if (!db) {
			return failure('D1 database not available')
		}

		// Block extremely dangerous operations
		const _normalizedStmt = params.statement.trim().toLowerCase()
		const blockedPatterns = [/drop\s+database/i, /drop\s+table/i, /truncate/i, /alter\s+table.*drop/i]
		for (const pattern of blockedPatterns) {
			if (pattern.test(params.statement)) {
				return failure('This operation is not allowed for safety reasons.')
			}
		}

		try {
			const stmt = db.prepare(params.statement)
			const boundStmt = params.params ? stmt.bind(...params.params) : stmt

			const result = await boundStmt.run()
			return success({
				success: result.success,
				rowsAffected: result.meta?.changes ?? 0,
				lastRowId: result.meta?.last_row_id,
				meta: result.meta,
			})
		} catch (error) {
			return failure(`SQL execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * SQL Batch Tool - Execute multiple SQL statements in a transaction.
 */
export const sqlBatchTool = createTool({
	id: 'sql_batch',
	description: 'Execute multiple SQL statements in a batch. All statements run in a transaction.',
	inputSchema: z.object({
		statements: z.array(
			z.object({
				sql: z.string().describe('The SQL statement'),
				params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().describe('Statement parameters'),
			})
		).describe('Array of SQL statements to execute'),
	}),
	execute: async (params, context) => {
		const db = context.env.DB
		if (!db) {
			return failure('D1 database not available')
		}

		try {
			const preparedStatements = params.statements.map((stmt) => {
				const prepared = db.prepare(stmt.sql)
				return stmt.params ? prepared.bind(...stmt.params) : prepared
			})

			const results = await db.batch(preparedStatements)
			return success({
				results: results.map((r, i) => ({
					index: i,
					success: r.success,
					rowsAffected: r.meta?.changes ?? 0,
				})),
				totalStatements: results.length,
			})
		} catch (error) {
			return failure(`SQL batch failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Get all SQL tools.
 */
export function getSQLTools(_context: ToolContext) {
	return [sqlQueryTool, sqlExecuteTool, sqlBatchTool]
}
