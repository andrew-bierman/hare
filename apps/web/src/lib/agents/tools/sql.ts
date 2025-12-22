import { z } from 'zod'
import { createTool, failure, success, type ToolContext } from './types'

/**
 * Tables that agents are allowed to query.
 * These are "agent data" tables, not system tables.
 * System tables (users, sessions, api_keys, etc.) are blocked.
 */
const ALLOWED_TABLES = new Set([
	// Agent-specific data tables that agents can query
	// Add tables here that agents should be able to access
	'agent_data', // Generic agent data storage
	'agent_memories', // Agent memory/context
	'agent_files', // Agent file metadata
])

/**
 * System tables that are blocked from agent access.
 */
const BLOCKED_TABLES = new Set([
	'users',
	'sessions',
	'accounts',
	'verifications',
	'workspaces',
	'workspace_members',
	'agents',
	'tools',
	'agent_tools',
	'api_keys',
	'conversations',
	'messages',
	'usage',
])

/**
 * Check if a query accesses only allowed tables.
 * This is a basic check - for production, consider using a SQL parser.
 */
function validateQueryTables(query: string): { valid: boolean; error?: string } {
	const lowerQuery = query.toLowerCase()

	// Check for blocked tables
	for (const table of BLOCKED_TABLES) {
		// Match table name as word boundary to avoid false positives
		const tablePattern = new RegExp(`\\b${table}\\b`, 'i')
		if (tablePattern.test(lowerQuery)) {
			return {
				valid: false,
				error: `Access to table "${table}" is not allowed. Agents can only access agent data tables.`,
			}
		}
	}

	return { valid: true }
}

/**
 * SQL Query Tool - Execute read-only SQL queries on D1.
 * Restricted to agent data tables only for security.
 */
export const sqlQueryTool = createTool({
	id: 'sql_query',
	description:
		'Execute a read-only SQL query on agent data tables. Only SELECT statements on allowed tables are permitted. System tables are not accessible.',
	inputSchema: z.object({
		query: z.string().describe('The SQL SELECT query to execute'),
		params: z
			.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
			.optional()
			.describe('Query parameters for prepared statement'),
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
				return failure(
					'Query contains dangerous patterns. Only single SELECT statements are allowed.',
				)
			}
		}

		// Validate table access
		const tableCheck = validateQueryTables(params.query)
		if (!tableCheck.valid) {
			return failure(tableCheck.error ?? 'Invalid table access')
		}

		// Require workspaceId parameter for multi-tenant isolation
		if (!params.query.toLowerCase().includes('workspace')) {
			return failure(
				'Queries must include a workspaceId filter for security. Add WHERE workspaceId = ? to your query.',
			)
		}

		try {
			// Ensure workspaceId is in params if query references it
			const queryParams = params.params ?? []

			const stmt = db.prepare(params.query)
			const boundStmt = queryParams.length > 0 ? stmt.bind(...queryParams) : stmt

			const result = await boundStmt.all()
			return success({
				rows: result.results,
				rowCount: result.results?.length ?? 0,
				meta: result.meta,
			})
		} catch (error) {
			return failure(
				`SQL query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * SQL Execute Tool - Execute write operations on D1.
 * Restricted to agent data tables only for security.
 */
export const sqlExecuteTool = createTool({
	id: 'sql_execute',
	description:
		'Execute a SQL statement that modifies agent data (INSERT, UPDATE, DELETE). Only allowed on agent data tables.',
	inputSchema: z.object({
		statement: z.string().describe('The SQL statement to execute'),
		params: z
			.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
			.optional()
			.describe('Statement parameters for prepared statement'),
	}),
	execute: async (params, context) => {
		const db = context.env.DB
		if (!db) {
			return failure('D1 database not available')
		}

		// Block extremely dangerous operations
		const blockedPatterns = [
			/drop\s+database/i,
			/drop\s+table/i,
			/truncate/i,
			/alter\s+table/i,
			/create\s+table/i,
		]
		for (const pattern of blockedPatterns) {
			if (pattern.test(params.statement)) {
				return failure('This operation is not allowed for safety reasons.')
			}
		}

		// Validate table access
		const tableCheck = validateQueryTables(params.statement)
		if (!tableCheck.valid) {
			return failure(tableCheck.error ?? 'Invalid table access')
		}

		// Require workspaceId in statements for multi-tenant isolation
		if (!params.statement.toLowerCase().includes('workspace')) {
			return failure(
				'Statements must include a workspaceId for security. Include workspaceId in your INSERT/UPDATE/DELETE.',
			)
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
			return failure(
				`SQL execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * SQL Batch Tool - Execute multiple SQL statements in a transaction.
 * Restricted to agent data tables only for security.
 */
export const sqlBatchTool = createTool({
	id: 'sql_batch',
	description:
		'Execute multiple SQL statements in a batch. All statements run in a transaction. Only allowed on agent data tables.',
	inputSchema: z.object({
		statements: z
			.array(
				z.object({
					sql: z.string().describe('The SQL statement'),
					params: z
						.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
						.optional()
						.describe('Statement parameters'),
				}),
			)
			.describe('Array of SQL statements to execute'),
	}),
	execute: async (params, context) => {
		const db = context.env.DB
		if (!db) {
			return failure('D1 database not available')
		}

		// Validate all statements
		for (const stmt of params.statements) {
			const tableCheck = validateQueryTables(stmt.sql)
			if (!tableCheck.valid) {
				return failure(tableCheck.error ?? 'Invalid table access')
			}

			// Require workspaceId
			if (!stmt.sql.toLowerCase().includes('workspace')) {
				return failure('All statements must include a workspaceId for security.')
			}
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
			return failure(
				`SQL batch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Get all SQL tools.
 */
export function getSQLTools(_context: ToolContext) {
	return [sqlQueryTool, sqlExecuteTool, sqlBatchTool]
}
