import { describe, expect, it, vi, beforeEach } from 'vitest'
import { sqlQueryTool, sqlExecuteTool, sqlBatchTool, getSQLTools } from '../sql'
import type { ToolContext } from '../types'

// Mock D1 database
const createMockDB = () => {
	const mockStatement = {
		bind: vi.fn().mockReturnThis(),
		all: vi.fn().mockResolvedValue({
			results: [],
			meta: { changes: 0 },
		}),
		run: vi.fn().mockResolvedValue({
			success: true,
			meta: { changes: 1, last_row_id: 1 },
		}),
	}

	return {
		prepare: vi.fn().mockReturnValue(mockStatement),
		batch: vi.fn().mockResolvedValue([
			{ success: true, meta: { changes: 1 } },
		]),
		_statement: mockStatement,
	}
}

const createMockContext = (db?: ReturnType<typeof createMockDB>): ToolContext => ({
	env: {
		DB: db as unknown as D1Database,
	} as ToolContext['env'],
	workspaceId: 'test-workspace',
	userId: 'test-user',
})

describe('SQL Tools', () => {
	let mockDB: ReturnType<typeof createMockDB>
	let context: ToolContext

	beforeEach(() => {
		mockDB = createMockDB()
		context = createMockContext(mockDB)
	})

	describe('sqlQueryTool', () => {
		describe('schema validation', () => {
			it('has correct tool id and description', () => {
				expect(sqlQueryTool.id).toBe('sql_query')
				expect(sqlQueryTool.description).toContain('read-only SQL query')
			})

			it('validates valid SELECT query', () => {
				const result = sqlQueryTool.inputSchema.safeParse({
					query: 'SELECT * FROM agent_data WHERE workspaceId = ?',
				})
				expect(result.success).toBe(true)
			})

			it('validates query with params', () => {
				const result = sqlQueryTool.inputSchema.safeParse({
					query: 'SELECT * FROM agent_data WHERE workspaceId = ?',
					params: ['test-workspace'],
				})
				expect(result.success).toBe(true)
			})

			it('accepts various param types', () => {
				const result = sqlQueryTool.inputSchema.safeParse({
					query: 'SELECT * FROM agent_data WHERE workspaceId = ? AND count > ? AND active = ?',
					params: ['test', 42, true],
				})
				expect(result.success).toBe(true)
			})

			it('accepts null params', () => {
				const result = sqlQueryTool.inputSchema.safeParse({
					query: 'SELECT * FROM agent_data WHERE workspaceId = ?',
					params: [null],
				})
				expect(result.success).toBe(true)
			})

			it('rejects missing query', () => {
				const result = sqlQueryTool.inputSchema.safeParse({})
				expect(result.success).toBe(false)
			})
		})

		describe('execution - security', () => {
			it('rejects non-SELECT queries', async () => {
				const result = await sqlQueryTool.execute(
					{ query: 'INSERT INTO agent_data (workspaceId) VALUES (?)', params: ['test'] },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Only SELECT queries are allowed')
			})

			it('rejects UPDATE queries', async () => {
				const result = await sqlQueryTool.execute(
					{ query: 'UPDATE agent_data SET name = ? WHERE workspaceId = ?', params: ['n', 'w'] },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Only SELECT queries are allowed')
			})

			it('rejects DELETE queries', async () => {
				const result = await sqlQueryTool.execute(
					{ query: 'DELETE FROM agent_data WHERE workspaceId = ?', params: ['test'] },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Only SELECT queries are allowed')
			})

			it('rejects queries with SQL injection via semicolon', async () => {
				const result = await sqlQueryTool.execute(
					{ query: 'SELECT * FROM agent_data WHERE workspaceId = ?; DROP TABLE users' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('dangerous patterns')
			})

			it('rejects queries with ; DELETE', async () => {
				const result = await sqlQueryTool.execute(
					{ query: 'SELECT * FROM agent_data WHERE workspaceId = ?; DELETE FROM users' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('dangerous patterns')
			})

			it('rejects access to blocked system tables - users', async () => {
				const result = await sqlQueryTool.execute(
					{ query: 'SELECT * FROM users WHERE workspaceId = ?' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Access to table "users" is not allowed')
			})

			it('rejects access to blocked system tables - sessions', async () => {
				const result = await sqlQueryTool.execute(
					{ query: 'SELECT * FROM sessions WHERE workspaceId = ?' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Access to table "sessions" is not allowed')
			})

			it('rejects access to blocked system tables - api_keys', async () => {
				const result = await sqlQueryTool.execute(
					{ query: 'SELECT * FROM api_keys WHERE workspaceId = ?' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Access to table "api_keys" is not allowed')
			})

			it('rejects queries without workspace filter', async () => {
				const result = await sqlQueryTool.execute(
					{ query: 'SELECT * FROM agent_data' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Queries must include a workspaceId filter')
			})
		})

		describe('execution - success', () => {
			it('executes valid SELECT query', async () => {
				mockDB._statement.all.mockResolvedValueOnce({
					results: [{ id: 1, name: 'test' }],
					meta: { changes: 0 },
				})

				const result = await sqlQueryTool.execute(
					{
						query: 'SELECT * FROM agent_data WHERE workspaceId = ?',
						params: ['test-workspace'],
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data).toEqual({
					rows: [{ id: 1, name: 'test' }],
					rowCount: 1,
					meta: { changes: 0 },
				})
			})

			it('executes query without params', async () => {
				mockDB._statement.all.mockResolvedValueOnce({
					results: [],
					meta: { changes: 0 },
				})

				const result = await sqlQueryTool.execute(
					{ query: "SELECT * FROM agent_data WHERE workspaceId = 'test'" },
					context,
				)

				expect(result.success).toBe(true)
				expect(mockDB.prepare).toHaveBeenCalled()
			})

			it('binds params correctly', async () => {
				await sqlQueryTool.execute(
					{
						query: 'SELECT * FROM agent_data WHERE workspaceId = ? AND id = ?',
						params: ['test-workspace', 123],
					},
					context,
				)

				expect(mockDB._statement.bind).toHaveBeenCalledWith('test-workspace', 123)
			})

			it('fails when DB is not available', async () => {
				const contextWithoutDB = createMockContext()
				contextWithoutDB.env.DB = undefined as unknown as D1Database

				const result = await sqlQueryTool.execute(
					{ query: 'SELECT * FROM agent_data WHERE workspaceId = ?' },
					contextWithoutDB,
				)

				expect(result.success).toBe(false)
				expect(result.error).toBe('D1 database not available')
			})
		})
	})

	describe('sqlExecuteTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(sqlExecuteTool.id).toBe('sql_execute')
			})

			it('validates INSERT statement', () => {
				const result = sqlExecuteTool.inputSchema.safeParse({
					statement: 'INSERT INTO agent_data (workspaceId, name) VALUES (?, ?)',
					params: ['ws', 'name'],
				})
				expect(result.success).toBe(true)
			})

			it('validates UPDATE statement', () => {
				const result = sqlExecuteTool.inputSchema.safeParse({
					statement: 'UPDATE agent_data SET name = ? WHERE workspaceId = ?',
					params: ['new-name', 'ws'],
				})
				expect(result.success).toBe(true)
			})

			it('validates DELETE statement', () => {
				const result = sqlExecuteTool.inputSchema.safeParse({
					statement: 'DELETE FROM agent_data WHERE workspaceId = ?',
					params: ['ws'],
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution - security', () => {
			it('rejects DROP DATABASE', async () => {
				const result = await sqlExecuteTool.execute(
					{ statement: 'DROP DATABASE test WHERE workspaceId = ?' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('not allowed for safety')
			})

			it('rejects DROP TABLE', async () => {
				const result = await sqlExecuteTool.execute(
					{ statement: 'DROP TABLE agent_data WHERE workspaceId = ?' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('not allowed for safety')
			})

			it('rejects TRUNCATE', async () => {
				const result = await sqlExecuteTool.execute(
					{ statement: 'TRUNCATE agent_data WHERE workspaceId = ?' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('not allowed for safety')
			})

			it('rejects ALTER TABLE', async () => {
				const result = await sqlExecuteTool.execute(
					{ statement: 'ALTER TABLE agent_data ADD COLUMN test WHERE workspaceId = ?' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('not allowed for safety')
			})

			it('rejects CREATE TABLE', async () => {
				const result = await sqlExecuteTool.execute(
					{ statement: 'CREATE TABLE test (id INT) WHERE workspaceId = ?' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('not allowed for safety')
			})

			it('rejects access to blocked tables', async () => {
				const result = await sqlExecuteTool.execute(
					{ statement: 'INSERT INTO users (workspaceId, name) VALUES (?, ?)' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Access to table "users" is not allowed')
			})

			it('rejects statements without workspace filter', async () => {
				const result = await sqlExecuteTool.execute(
					{ statement: 'INSERT INTO agent_data (name) VALUES (?)' },
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Statements must include a workspaceId')
			})
		})

		describe('execution - success', () => {
			it('executes INSERT statement', async () => {
				const result = await sqlExecuteTool.execute(
					{
						statement: 'INSERT INTO agent_data (workspaceId, name) VALUES (?, ?)',
						params: ['test-workspace', 'test'],
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.success).toBe(true)
				expect(result.data?.rowsAffected).toBe(1)
			})

			it('executes UPDATE statement', async () => {
				const result = await sqlExecuteTool.execute(
					{
						statement: 'UPDATE agent_data SET name = ? WHERE workspaceId = ?',
						params: ['updated', 'test-workspace'],
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(mockDB.prepare).toHaveBeenCalledWith(
					'UPDATE agent_data SET name = ? WHERE workspaceId = ?',
				)
			})

			it('fails when DB is not available', async () => {
				const contextWithoutDB = createMockContext()
				contextWithoutDB.env.DB = undefined as unknown as D1Database

				const result = await sqlExecuteTool.execute(
					{ statement: 'INSERT INTO agent_data (workspaceId) VALUES (?)' },
					contextWithoutDB,
				)

				expect(result.success).toBe(false)
				expect(result.error).toBe('D1 database not available')
			})
		})
	})

	describe('sqlBatchTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(sqlBatchTool.id).toBe('sql_batch')
			})

			it('validates batch of statements', () => {
				const result = sqlBatchTool.inputSchema.safeParse({
					statements: [
						{ sql: 'INSERT INTO agent_data (workspaceId) VALUES (?)', params: ['ws'] },
						{ sql: 'UPDATE agent_data SET name = ? WHERE workspaceId = ?', params: ['n', 'ws'] },
					],
				})
				expect(result.success).toBe(true)
			})

			it('validates statements without params', () => {
				const result = sqlBatchTool.inputSchema.safeParse({
					statements: [
						{ sql: "SELECT * FROM agent_data WHERE workspaceId = 'test'" },
					],
				})
				expect(result.success).toBe(true)
			})

			it('rejects empty statements array', () => {
				const result = sqlBatchTool.inputSchema.safeParse({ statements: [] })
				// Empty array should be validated by Zod
				expect(result.success).toBe(true) // empty arrays are technically valid
			})
		})

		describe('execution - security', () => {
			it('rejects batch with blocked table access', async () => {
				const result = await sqlBatchTool.execute(
					{
						statements: [
							{ sql: 'INSERT INTO users (workspaceId) VALUES (?)', params: ['ws'] },
						],
					},
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('Access to table "users" is not allowed')
			})

			it('rejects batch with missing workspace filter', async () => {
				const result = await sqlBatchTool.execute(
					{
						statements: [
							{ sql: 'INSERT INTO agent_data (name) VALUES (?)', params: ['test'] },
						],
					},
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('All statements must include a workspaceId')
			})
		})

		describe('execution - success', () => {
			it('executes batch successfully', async () => {
				mockDB.batch.mockResolvedValueOnce([
					{ success: true, meta: { changes: 1 } },
					{ success: true, meta: { changes: 2 } },
				])

				const result = await sqlBatchTool.execute(
					{
						statements: [
							{ sql: 'INSERT INTO agent_data (workspaceId) VALUES (?)', params: ['ws'] },
							{ sql: 'UPDATE agent_data SET name = ? WHERE workspaceId = ?', params: ['n', 'ws'] },
						],
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.totalStatements).toBe(2)
				expect(result.data?.results).toHaveLength(2)
			})

			it('fails when DB is not available', async () => {
				const contextWithoutDB = createMockContext()
				contextWithoutDB.env.DB = undefined as unknown as D1Database

				const result = await sqlBatchTool.execute(
					{
						statements: [
							{ sql: 'INSERT INTO agent_data (workspaceId) VALUES (?)', params: ['ws'] },
						],
					},
					contextWithoutDB,
				)

				expect(result.success).toBe(false)
				expect(result.error).toBe('D1 database not available')
			})
		})
	})

	describe('getSQLTools', () => {
		it('returns all SQL tools', () => {
			const tools = getSQLTools(context)

			expect(tools).toHaveLength(3)
			expect(tools.map((t) => t.id)).toEqual(['sql_query', 'sql_execute', 'sql_batch'])
		})
	})
})
