import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
	codeExecuteTool,
	codeValidateTool,
	sandboxFileTool,
	getSandboxTools,
	executeSandboxed,
} from '../sandbox'
import type { ToolContext } from '../types'

// Mock sandbox binding
const createMockSandbox = () => ({
	writeFile: vi.fn().mockResolvedValue(undefined),
	readFile: vi.fn().mockResolvedValue('file content'),
	exec: vi.fn().mockResolvedValue({ stdout: 'output', stderr: '', exitCode: 0 }),
})

const createMockSandboxBinding = () => {
	const instances = new Map<string, ReturnType<typeof createMockSandbox>>()

	return {
		get: vi.fn((id: unknown) => {
			const idStr = String(id)
			if (!instances.has(idStr)) {
				instances.set(idStr, createMockSandbox())
			}
			return instances.get(idStr)
		}),
		idFromName: vi.fn((name: string) => name),
		_instances: instances,
	}
}

const createMockContext = (hasSandbox = false): ToolContext => ({
	env: hasSandbox
		? ({ SANDBOX: createMockSandboxBinding() } as unknown as ToolContext['env'])
		: ({} as ToolContext['env']),
	workspaceId: 'test-workspace',
	userId: 'test-user',
})

describe('Sandbox Tools', () => {
	let context: ToolContext

	beforeEach(() => {
		context = createMockContext()
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.clearAllMocks()
	})

	describe('codeExecuteTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(codeExecuteTool.id).toBe('code_execute')
			})

			it('validates JavaScript code', () => {
				const result = codeExecuteTool.inputSchema.safeParse({
					code: 'console.log("hello")',
					language: 'javascript',
				})
				expect(result.success).toBe(true)
			})

			it('validates Python code', () => {
				const result = codeExecuteTool.inputSchema.safeParse({
					code: 'print("hello")',
					language: 'python',
				})
				expect(result.success).toBe(true)
			})

			it('validates with timeout', () => {
				const result = codeExecuteTool.inputSchema.safeParse({
					code: 'console.log("hello")',
					language: 'javascript',
					timeout: 5000,
				})
				expect(result.success).toBe(true)
			})

			it('rejects empty code', () => {
				const result = codeExecuteTool.inputSchema.safeParse({
					code: '',
					language: 'javascript',
				})
				expect(result.success).toBe(false)
			})

			it('rejects code over max size', () => {
				const result = codeExecuteTool.inputSchema.safeParse({
					code: 'x'.repeat(30000), // Over 25KB limit
					language: 'javascript',
				})
				expect(result.success).toBe(false)
			})

			it('rejects timeout over 30 seconds', () => {
				const result = codeExecuteTool.inputSchema.safeParse({
					code: 'console.log("hello")',
					language: 'javascript',
					timeout: 35000,
				})
				expect(result.success).toBe(false)
			})
		})

		describe('execution - security', () => {
			it('blocks dangerous JavaScript patterns - eval', async () => {
				const result = await codeExecuteTool.execute(
					{
						code: 'eval("dangerous code")',
						language: 'javascript',
						timeout: 30000,
					},
					context,
				)
				expect(result.success).toBe(false)
				expect(result.error).toContain('validation failed')
			})

			it('blocks dangerous JavaScript patterns - require', async () => {
				const result = await codeExecuteTool.execute(
					{
						code: 'const fs = require("fs")',
						language: 'javascript',
						timeout: 30000,
					},
					context,
				)
				expect(result.success).toBe(false)
			})

			it('blocks dangerous JavaScript patterns - import', async () => {
				const result = await codeExecuteTool.execute(
					{
						code: 'import("fs").then(fs => fs.readFile("/etc/passwd"))',
						language: 'javascript',
						timeout: 30000,
					},
					context,
				)
				expect(result.success).toBe(false)
			})

			it('blocks dangerous Python patterns - exec', async () => {
				const result = await codeExecuteTool.execute(
					{
						code: 'exec("import os; os.system(\'rm -rf /\')")',
						language: 'python',
						timeout: 30000,
					},
					context,
				)
				expect(result.success).toBe(false)
			})

			it('blocks dangerous Python patterns - subprocess', async () => {
				const result = await codeExecuteTool.execute(
					{
						code: 'import subprocess; subprocess.run(["ls"])',
						language: 'python',
						timeout: 30000,
					},
					context,
				)
				expect(result.success).toBe(false)
			})

			it('blocks __proto__ access', async () => {
				const result = await codeExecuteTool.execute(
					{
						code: 'const x = {}; x.__proto__.polluted = true',
						language: 'javascript',
						timeout: 30000,
					},
					context,
				)
				expect(result.success).toBe(false)
			})
		})

		describe('execution - JavaScript without sandbox', () => {
			it('reports code generation is disallowed in Workers (expected in test env)', async () => {
				vi.useRealTimers() // Need real timers for async execution

				const result = await codeExecuteTool.execute(
					{
						code: 'const x = 1 + 2; console.log(x);',
						language: 'javascript',
						timeout: 5000,
					},
					context,
				)

				// In test environment (Cloudflare Workers), code generation via new Function() is blocked
				// This is expected behavior - in production, code execution requires the SANDBOX binding
				expect(result.success).toBe(false)
				expect(result.error).toContain('Code generation from strings disallowed')
			})

			it('requires sandbox for Python', async () => {
				const result = await codeExecuteTool.execute(
					{
						code: 'print("hello")',
						language: 'python',
						timeout: 5000,
					},
					context,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('requires Cloudflare Sandbox')
			})
		})

		describe('execution - with sandbox', () => {
			it('executes code using Cloudflare Sandbox', async () => {
				vi.useRealTimers()
				const sandboxContext = createMockContext(true)

				const result = await codeExecuteTool.execute(
					{
						code: 'console.log("hello")',
						language: 'javascript',
						timeout: 5000,
					},
					sandboxContext,
				)

				expect(result.success).toBe(true)
			})
		})
	})

	describe('codeValidateTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(codeValidateTool.id).toBe('code_validate')
			})

			it('validates code validation request', () => {
				const result = codeValidateTool.inputSchema.safeParse({
					code: 'const x = 1;',
					language: 'javascript',
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('validates safe JavaScript code', async () => {
				const result = await codeValidateTool.execute(
					{
						code: 'const x = 1; const y = x + 2; console.log(y);',
						language: 'javascript',
					},
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.issues).toHaveLength(0)
			})

			it('detects dangerous patterns', async () => {
				const result = await codeValidateTool.execute(
					{
						code: 'eval("dangerous")',
						language: 'javascript',
					},
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				expect(result.data?.issues.length).toBeGreaterThan(0)
			})

			it('detects potential infinite loops', async () => {
				const result = await codeValidateTool.execute(
					{
						code: 'while (true) { console.log("loop"); }',
						language: 'javascript',
					},
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.issues).toContain('Potential infinite loop detected')
			})

			it('detects syntax errors', async () => {
				const result = await codeValidateTool.execute(
					{
						code: 'const x = {',
						language: 'javascript',
					},
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				expect(result.data?.issues.some((i: string) => i.includes('Syntax error'))).toBe(true)
			})

			it('reports code statistics', async () => {
				const result = await codeValidateTool.execute(
					{
						code: 'const x = 1;\nconst y = 2;',
						language: 'javascript',
					},
					context,
				)
				expect(result.success).toBe(true)
				expect(result.data?.length).toBeGreaterThan(0)
				expect(result.data?.lines).toBe(2)
			})
		})
	})

	describe('sandboxFileTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(sandboxFileTool.id).toBe('sandbox_file')
			})

			it('validates read operation', () => {
				const result = sandboxFileTool.inputSchema.safeParse({
					operation: 'read',
					path: 'test.txt',
				})
				expect(result.success).toBe(true)
			})

			it('validates write operation', () => {
				const result = sandboxFileTool.inputSchema.safeParse({
					operation: 'write',
					path: 'test.txt',
					content: 'hello',
				})
				expect(result.success).toBe(true)
			})

			it('validates list operation', () => {
				const result = sandboxFileTool.inputSchema.safeParse({
					operation: 'list',
					path: '.',
				})
				expect(result.success).toBe(true)
			})

			it('rejects path traversal', () => {
				const result = sandboxFileTool.inputSchema.safeParse({
					operation: 'read',
					path: '../etc/passwd',
				})
				expect(result.success).toBe(false)
			})

			it('rejects absolute paths', () => {
				const result = sandboxFileTool.inputSchema.safeParse({
					operation: 'read',
					path: '/etc/passwd',
				})
				expect(result.success).toBe(false)
			})
		})

		describe('execution - without sandbox', () => {
			it('fails when sandbox not available', async () => {
				const result = await sandboxFileTool.execute(
					{
						operation: 'read',
						path: 'test.txt',
					},
					context,
				)
				expect(result.success).toBe(false)
				expect(result.error).toContain('Sandbox not available')
			})
		})

		describe('execution - with sandbox', () => {
			it('reads file', async () => {
				const sandboxContext = createMockContext(true)

				const result = await sandboxFileTool.execute(
					{
						operation: 'read',
						path: 'test.txt',
					},
					sandboxContext,
				)
				expect(result.success).toBe(true)
				expect((result.data as unknown as { content: string })?.content).toBeDefined()
			})

			it('writes file', async () => {
				const sandboxContext = createMockContext(true)

				const result = await sandboxFileTool.execute(
					{
						operation: 'write',
						path: 'test.txt',
						content: 'hello world',
					},
					sandboxContext,
				)
				expect(result.success).toBe(true)
				expect((result.data as unknown as { written: boolean })?.written).toBe(true)
			})

			it('lists directory', async () => {
				const sandboxContext = createMockContext(true)

				const result = await sandboxFileTool.execute(
					{
						operation: 'list',
						path: '.',
					},
					sandboxContext,
				)
				expect(result.success).toBe(true)
				expect((result.data as unknown as { listing: string })?.listing).toBeDefined()
			})
		})
	})

	describe('executeSandboxed', () => {
		it('rejects bash execution', async () => {
			const result = await executeSandboxed(
				'echo "hello"',
				'bash',
				context,
			)
			expect(result.success).toBe(false)
			expect(result.error).toContain('Bash execution is disabled')
		})
	})

	describe('getSandboxTools', () => {
		it('returns all sandbox tools', () => {
			const tools = getSandboxTools(context)

			expect(tools).toHaveLength(3)
			expect(tools.map((t) => t.id)).toEqual([
				'code_execute',
				'code_validate',
				'sandbox_file',
			])
		})
	})
})
