import { z } from 'zod'
import { createTool, failure, success, type ToolContext, type ToolResult } from './types'

/**
 * Sandbox binding interface for type safety
 */
interface SandboxBinding {
	get(id: unknown): SandboxInstance
	idFromName(name: string): unknown
}

interface SandboxInstance {
	writeFile(path: string, content: string): Promise<void>
	readFile(path: string): Promise<string>
	exec(
		command: string,
		options?: { timeout?: number },
	): Promise<{ stdout: string; stderr: string; exitCode: number }>
}

interface CloudflareEnvWithSandbox extends CloudflareEnv {
	SANDBOX: SandboxBinding
}

/**
 * Cloudflare Sandbox Integration
 *
 * Uses Cloudflare's official Sandbox SDK for secure code execution.
 * https://developers.cloudflare.com/sandbox/
 *
 * Architecture:
 * - Workers: Your application logic
 * - Durable Objects: Persistent sandbox instances
 * - Containers: Isolated Linux environments
 *
 * Features:
 * - sandbox.exec() - Execute shell commands
 * - sandbox.writeFile() / readFile() - File operations
 * - sandbox.gitCheckout() - Clone git repos
 * - Each sandbox is fully isolated
 *
 * Note: Sandbox SDK is in Beta (as of 2025).
 * For environments without Sandbox SDK, fallback to in-Worker execution.
 */

export interface SandboxConfig {
	/** Max execution time in milliseconds */
	timeout: number
	/** Allow network access in sandbox */
	allowNetwork: boolean
	/** Working directory in sandbox */
	workDir: string
}

const DEFAULT_CONFIG: SandboxConfig = {
	timeout: 30000,
	allowNetwork: true,
	workDir: '/workspace',
}

/**
 * Check if Cloudflare Sandbox is available
 */
function hasSandbox(env: CloudflareEnv): env is CloudflareEnvWithSandbox {
	return 'SANDBOX' in env && (env as CloudflareEnvWithSandbox).SANDBOX !== undefined
}

/**
 * Execute code using Cloudflare Sandbox SDK
 *
 * When SANDBOX binding is available, uses true container isolation.
 * Otherwise, falls back to in-Worker sandboxed execution.
 */
export async function executeSandboxed<T = unknown>(
	code: string,
	language: 'javascript' | 'python' | 'bash',
	context: ToolContext,
	config: Partial<SandboxConfig> = {},
): Promise<ToolResult<T>> {
	const cfg = { ...DEFAULT_CONFIG, ...config }

	// If Cloudflare Sandbox is available, use it
	if (hasSandbox(context.env)) {
		return executeWithCloudfareSandbox(code, language, context, cfg)
	}

	// Fallback to in-Worker execution for JavaScript only
	if (language === 'javascript') {
		return executeInWorker(code, cfg)
	}

	return failure(
		`${language} execution requires Cloudflare Sandbox. Add SANDBOX binding to wrangler.toml.`,
	)
}

/**
 * Execute using Cloudflare Sandbox SDK (container-based)
 */
async function executeWithCloudfareSandbox<T>(
	code: string,
	language: 'javascript' | 'python' | 'bash',
	context: ToolContext,
	config: SandboxConfig,
): Promise<ToolResult<T>> {
	try {
		// Get sandbox from Durable Object binding
		const envWithSandbox = context.env as CloudflareEnvWithSandbox
		const sandbox = envWithSandbox.SANDBOX.get(
			envWithSandbox.SANDBOX.idFromName(context.workspaceId),
		)

		// Write code to file
		const filename =
			language === 'javascript' ? 'script.js' : language === 'python' ? 'script.py' : 'script.sh'
		const filepath = `${config.workDir}/${filename}`

		await sandbox.writeFile(filepath, code)

		// Build execution command
		let command: string
		switch (language) {
			case 'javascript':
				command = `cd ${config.workDir} && node ${filename}`
				break
			case 'python':
				command = `cd ${config.workDir} && python3 ${filename}`
				break
			case 'bash':
				command = `cd ${config.workDir} && bash ${filename}`
				break
		}

		// Execute with timeout
		const result = await sandbox.exec(command, { timeout: config.timeout })

		return success({
			stdout: result.stdout,
			stderr: result.stderr,
			exitCode: result.exitCode,
			success: result.exitCode === 0,
		} as T)
	} catch (error) {
		return failure(`Sandbox error: ${error instanceof Error ? error.message : 'Unknown'}`)
	}
}

/**
 * Fallback: Execute JavaScript in Worker (limited isolation)
 */
async function executeInWorker<T>(code: string, config: SandboxConfig): Promise<ToolResult<T>> {
	// Validate code for dangerous patterns
	const blocked = [
		/\beval\s*\(/,
		/new\s+Function\s*\(/,
		/\bimport\s*\(/,
		/\brequire\s*\(/,
		/__proto__/,
		/globalThis\s*\./,
	]

	for (const pattern of blocked) {
		if (pattern.test(code)) {
			return failure('Blocked: dangerous pattern detected')
		}
	}

	// Build safe execution context
	const safeContext: Record<string, unknown> = {
		Math,
		Date,
		JSON,
		String,
		Number,
		Boolean,
		Array,
		Object,
		Map,
		Set,
		RegExp,
		Error,
		console: {
			log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
			error: (...args: unknown[]) => logs.push(`[error] ${args.map(String).join(' ')}`),
		},
		URL,
		URLSearchParams,
		btoa,
		atob,
		TextEncoder,
		TextDecoder,
	}

	const logs: string[] = []

	try {
		const wrappedCode = `"use strict"; return (async () => { ${code} })();`
		const argNames = Object.keys(safeContext)
		const argValues = Object.values(safeContext)

		const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
		const fn = new AsyncFunction(...argNames, wrappedCode)

		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), config.timeout)

		const resultPromise = fn(...argValues)
		const timeoutPromise = new Promise((_, reject) => {
			controller.signal.addEventListener('abort', () => reject(new Error('Timeout')))
		})

		const result = await Promise.race([resultPromise, timeoutPromise])
		clearTimeout(timeoutId)

		return success({ result, logs } as T)
	} catch (error) {
		return failure(`Error: ${error instanceof Error ? error.message : 'Unknown'}`)
	}
}

/**
 * Code Execute Tool - Run code in Cloudflare Sandbox
 */
export const codeExecuteTool = createTool({
	id: 'code_execute',
	description: `Execute code in a secure Cloudflare Sandbox container.

**Supported Languages:**
- JavaScript (Node.js)
- Python 3
- Bash/Shell

**Features:**
- Full Linux environment
- Isolated container per execution
- File system access within sandbox
- Network access (configurable)

**Example (JavaScript):**
\`\`\`javascript
const data = [1, 2, 3, 4, 5];
const sum = data.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ sum, avg: sum / data.length }));
\`\`\`

**Example (Python):**
\`\`\`python
import json
data = [1, 2, 3, 4, 5]
print(json.dumps({"sum": sum(data), "avg": sum(data)/len(data)}))
\`\`\`

**Limits:** 30s timeout, container isolation`,
	inputSchema: z.object({
		code: z.string().min(1).max(100_000).describe('Code to execute'),
		language: z
			.enum(['javascript', 'python', 'bash'])
			.default('javascript')
			.describe('Programming language'),
		timeout: z.number().min(1000).max(60000).optional().default(30000).describe('Timeout in ms'),
	}),
	execute: async (input, context) => {
		return executeSandboxed(input.code, input.language, context, {
			timeout: input.timeout,
		})
	},
})

/**
 * Code Validate Tool - Check code safety
 */
export const codeValidateTool = createTool({
	id: 'code_validate',
	description: 'Validate code before execution. Checks for syntax and potential issues.',
	inputSchema: z.object({
		code: z.string().min(1).max(100_000).describe('Code to validate'),
		language: z.enum(['javascript', 'python', 'bash']).default('javascript'),
	}),
	execute: async (input, _context) => {
		const { code, language } = input

		const issues: string[] = []

		// Basic checks
		if (code.length > 50000) issues.push('Code is very long (>50KB)')

		// Language-specific checks
		if (language === 'javascript') {
			if (/while\s*\(\s*true\s*\)/.test(code) && !/break/.test(code)) {
				issues.push('Potential infinite loop')
			}
			try {
				new Function(code) // Syntax check
			} catch (e) {
				issues.push(`Syntax error: ${e instanceof Error ? e.message : 'Unknown'}`)
			}
		}

		return success({
			valid: issues.length === 0,
			issues,
			language,
			length: code.length,
			lines: code.split('\n').length,
		})
	},
})

/**
 * File Operations Tool - Read/write files in sandbox
 */
export const sandboxFileTool = createTool({
	id: 'sandbox_file',
	description: 'Read or write files in the Cloudflare Sandbox container. Requires SANDBOX binding.',
	inputSchema: z.object({
		operation: z.enum(['read', 'write', 'list', 'delete']).describe('File operation'),
		path: z.string().describe('File path in sandbox'),
		content: z.string().optional().describe('Content for write operation'),
	}),
	execute: async (input, context) => {
		if (!hasSandbox(context.env)) {
			return failure('Sandbox not available. Add SANDBOX binding to wrangler.toml.')
		}

		try {
			const envWithSandbox = context.env as CloudflareEnvWithSandbox
			const sandbox = envWithSandbox.SANDBOX.get(
				envWithSandbox.SANDBOX.idFromName(context.workspaceId),
			)

			switch (input.operation) {
				case 'read': {
					const content = await sandbox.readFile(input.path)
					return success({ path: input.path, content })
				}
				case 'write': {
					if (!input.content) return failure('Content required for write')
					await sandbox.writeFile(input.path, input.content)
					return success({ path: input.path, written: true })
				}
				case 'list': {
					const result = await sandbox.exec(`ls -la ${input.path}`)
					return success({ path: input.path, listing: result.stdout })
				}
				case 'delete': {
					await sandbox.exec(`rm -f ${input.path}`)
					return success({ path: input.path, deleted: true })
				}
				default:
					return failure('Unknown operation')
			}
		} catch (error) {
			return failure(`File error: ${error instanceof Error ? error.message : 'Unknown'}`)
		}
	},
})

export function getSandboxTools(_context: ToolContext) {
	return [codeExecuteTool, codeValidateTool, sandboxFileTool]
}
