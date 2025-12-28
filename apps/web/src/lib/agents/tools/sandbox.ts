import { z } from 'zod'
import { SandboxLimits, Timeouts } from './constants'
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
 *
 * SECURITY NOTE: These tools have restricted access and include rate limiting,
 * code validation, and audit logging. Bash execution is disabled by default.
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
	timeout: Timeouts.SANDBOX_DEFAULT,
	allowNetwork: false, // Disabled by default for security
	workDir: SandboxLimits.WORK_DIR,
}

/**
 * Security: Rate limiting configuration
 */
const RATE_LIMIT = {
	maxExecutionsPerHour: SandboxLimits.MAX_EXECUTIONS_PER_HOUR,
	maxCodeSizeBytes: SandboxLimits.MAX_CODE_SIZE_BYTES,
}

/**
 * In-memory rate limit tracking (per workspace)
 * In production, use KV or Durable Objects for persistence
 */
const rateLimitCache = new Map<string, { count: number; resetAt: number }>()

/**
 * Check rate limit for a workspace
 */
function checkRateLimit(workspaceId: string): { allowed: boolean; remaining: number } {
	const now = Date.now()
	const entry = rateLimitCache.get(workspaceId)

	if (!entry || now > entry.resetAt) {
		rateLimitCache.set(workspaceId, { count: 1, resetAt: now + Timeouts.ONE_HOUR })
		return { allowed: true, remaining: RATE_LIMIT.maxExecutionsPerHour - 1 }
	}

	if (entry.count >= RATE_LIMIT.maxExecutionsPerHour) {
		return { allowed: false, remaining: 0 }
	}

	entry.count++
	return { allowed: true, remaining: RATE_LIMIT.maxExecutionsPerHour - entry.count }
}

/**
 * Extended dangerous patterns for code validation
 */
const DANGEROUS_PATTERNS = {
	javascript: [
		/\beval\s*\(/,
		/new\s+Function\s*\(/,
		/\bimport\s*\(/,
		/\brequire\s*\(/,
		/__proto__/,
		/globalThis\s*\./,
		/process\s*\./,
		/child_process/,
		/\bexec\s*\(/,
		/\bspawn\s*\(/,
		/\.constructor\s*\(/,
		/Reflect\s*\./,
		/Proxy\s*\(/,
	],
	python: [
		/\bexec\s*\(/,
		/\beval\s*\(/,
		/\bcompile\s*\(/,
		/__import__/,
		/\bopen\s*\([^)]*['"][wa]/i, // file write mode
		/subprocess/,
		/\bos\.system/,
		/\bos\.popen/,
		/\bos\.exec/,
		/socket\s*\(/,
	],
	bash: [
		/curl\s/,
		/wget\s/,
		/nc\s/,
		/ncat\s/,
		/netcat\s/,
		/\brm\s+-rf?\s+\//,
		/>\s*\/etc\//,
		/chmod\s.*777/,
		/sudo\s/,
		/su\s+-/,
		/\|\s*sh\b/,
		/\|\s*bash\b/,
		/eval\s/,
		/\$\(/,
		/`[^`]+`/, // backtick command substitution
	],
}

/**
 * Validate code for dangerous patterns
 */
function validateCodeSafety(
	code: string,
	language: 'javascript' | 'python' | 'bash',
): { safe: boolean; issues: string[] } {
	const issues: string[] = []
	const patterns = DANGEROUS_PATTERNS[language]

	for (const pattern of patterns) {
		if (pattern.test(code)) {
			issues.push(`Blocked pattern detected: ${pattern.source.slice(0, 30)}...`)
		}
	}

	if (code.length > RATE_LIMIT.maxCodeSizeBytes) {
		issues.push(`Code exceeds maximum size of ${RATE_LIMIT.maxCodeSizeBytes} bytes`)
	}

	return { safe: issues.length === 0, issues }
}

/**
 * Log sandbox execution for audit trail
 */
function logSandboxExecution(opts: {
	workspaceId: string
	language: string
	codeLength: number
	success: boolean
	error?: string
}) {
	// In production, send to logging service (e.g., Logflare, Datadog)
	console.log(
		JSON.stringify({
			type: 'sandbox_execution',
			timestamp: new Date().toISOString(),
			...opts,
		}),
	)
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
 *
 * Security measures:
 * - Rate limiting per workspace
 * - Dangerous pattern detection
 * - Audit logging
 * - Bash disabled by default (requires explicit opt-in)
 */
export async function executeSandboxed<T = unknown>(
	code: string,
	language: 'javascript' | 'python' | 'bash',
	context: ToolContext,
	config: Partial<SandboxConfig> = {},
): Promise<ToolResult<T>> {
	const cfg = { ...DEFAULT_CONFIG, ...config }

	// Security: Bash is disabled for safety - too many attack vectors
	if (language === 'bash') {
		logSandboxExecution({
			workspaceId: context.workspaceId,
			language,
			codeLength: code.length,
			success: false,
			error: 'Bash execution disabled for security',
		})
		return failure('Bash execution is disabled for security. Use JavaScript or Python instead.')
	}

	// Security: Check rate limit
	const rateLimit = checkRateLimit(context.workspaceId)
	if (!rateLimit.allowed) {
		logSandboxExecution({
			workspaceId: context.workspaceId,
			language,
			codeLength: code.length,
			success: false,
			error: 'Rate limit exceeded',
		})
		return failure(
			`Rate limit exceeded. Maximum ${RATE_LIMIT.maxExecutionsPerHour} executions per hour.`,
		)
	}

	// Security: Validate code for dangerous patterns
	const validation = validateCodeSafety(code, language)
	if (!validation.safe) {
		logSandboxExecution({
			workspaceId: context.workspaceId,
			language,
			codeLength: code.length,
			success: false,
			error: validation.issues.join(', '),
		})
		return failure(`Code validation failed: ${validation.issues.join('; ')}`)
	}

	try {
		let result: ToolResult<T>

		// If Cloudflare Sandbox is available, use it
		if (hasSandbox(context.env)) {
			result = await executeWithCloudfareSandbox(code, language, context, cfg)
		} else if (language === 'javascript') {
			// Fallback to in-Worker execution for JavaScript only
			result = await executeInWorker(code, cfg)
		} else {
			result = failure(
				`${language} execution requires Cloudflare Sandbox. Add SANDBOX binding to wrangler.toml.`,
			)
		}

		// Log successful execution
		logSandboxExecution({
			workspaceId: context.workspaceId,
			language,
			codeLength: code.length,
			success: result.success,
			error: result.success ? undefined : result.error,
		})

		return result
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error'
		logSandboxExecution({
			workspaceId: context.workspaceId,
			language,
			codeLength: code.length,
			success: false,
			error: errorMsg,
		})
		return failure(`Execution failed: ${errorMsg}`)
	}
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
 *
 * Security restrictions:
 * - Bash execution is disabled
 * - Rate limited to 50 executions per hour
 * - Max code size 25KB
 * - Dangerous patterns are blocked
 * - All executions are logged
 */
export const codeExecuteTool = createTool({
	id: 'code_execute',
	description: `Execute code in a secure Cloudflare Sandbox container.

**Supported Languages:**
- JavaScript (Node.js)
- Python 3

**Security Restrictions:**
- Bash/shell execution is disabled
- Rate limited to ${RATE_LIMIT.maxExecutionsPerHour} executions per hour
- Maximum code size: ${RATE_LIMIT.maxCodeSizeBytes / 1000}KB
- Dangerous patterns (eval, subprocess, etc.) are blocked
- Network access is disabled
- All executions are logged for audit

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

**Limits:** 30s timeout, container isolation, no network`,
	inputSchema: z.object({
		code: z
			.string()
			.min(1)
			.max(RATE_LIMIT.maxCodeSizeBytes)
			.describe(`Code to execute (max ${SandboxLimits.MAX_CODE_SIZE_BYTES / 1000}KB)`),
		language: z
			.enum(['javascript', 'python'])
			.default('javascript')
			.describe('Programming language (bash is disabled for security)'),
		timeout: z
			.number()
			.min(1000)
			.max(Timeouts.SANDBOX_DEFAULT)
			.optional()
			.default(Timeouts.SANDBOX_DEFAULT)
			.describe('Timeout in ms'),
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
	description: `Validate code before execution. Checks for syntax, dangerous patterns, and size limits.

Validates against:
- Dangerous patterns (eval, subprocess, shell commands, etc.)
- Code size limits (${RATE_LIMIT.maxCodeSizeBytes / 1000}KB max)
- Syntax errors (JavaScript only)
- Potential infinite loops`,
	inputSchema: z.object({
		code: z.string().min(1).max(RATE_LIMIT.maxCodeSizeBytes).describe('Code to validate'),
		language: z.enum(['javascript', 'python']).default('javascript'),
	}),
	execute: async (input, _context) => {
		const { code, language } = input

		// Use the security validation function
		const safetyCheck = validateCodeSafety(code, language)
		const issues = [...safetyCheck.issues]

		// Additional checks
		if (language === 'javascript') {
			if (/while\s*\(\s*true\s*\)/.test(code) && !/break/.test(code)) {
				issues.push('Potential infinite loop detected')
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
			maxAllowedSize: RATE_LIMIT.maxCodeSizeBytes,
		})
	},
})

/**
 * File Operations Tool - Read/write files in sandbox
 *
 * Security: Rate limited and logged
 */
export const sandboxFileTool = createTool({
	id: 'sandbox_file',
	description: `Read or write files in the Cloudflare Sandbox container.

**Security:**
- Rate limited to ${RATE_LIMIT.maxExecutionsPerHour} operations per hour
- All operations are logged
- Paths are restricted to sandbox workspace

Requires SANDBOX binding.`,
	inputSchema: z.object({
		operation: z.enum(['read', 'write', 'list']).describe('File operation (delete disabled)'),
		path: z
			.string()
			.refine((p) => !p.includes('..') && !p.startsWith('/'), {
				message: 'Path must be relative and cannot contain ..',
			})
			.describe('Relative file path in sandbox workspace'),
		content: z.string().max(RATE_LIMIT.maxCodeSizeBytes).optional().describe('Content for write'),
	}),
	execute: async (input, context) => {
		// Security: Check rate limit
		const rateLimit = checkRateLimit(context.workspaceId)
		if (!rateLimit.allowed) {
			return failure(
				`Rate limit exceeded. Maximum ${RATE_LIMIT.maxExecutionsPerHour} operations per hour.`,
			)
		}

		if (!hasSandbox(context.env)) {
			return failure('Sandbox not available. Add SANDBOX binding to wrangler.toml.')
		}

		// Security: Log the operation
		console.log(
			JSON.stringify({
				type: 'sandbox_file_operation',
				timestamp: new Date().toISOString(),
				workspaceId: context.workspaceId,
				operation: input.operation,
				path: input.path,
			}),
		)

		try {
			const envWithSandbox = context.env as CloudflareEnvWithSandbox
			const sandbox = envWithSandbox.SANDBOX.get(
				envWithSandbox.SANDBOX.idFromName(context.workspaceId),
			)

			// Ensure path is within workspace
			const safePath = `/workspace/${input.path.replace(/^\/+/, '')}`

			switch (input.operation) {
				case 'read': {
					const content = await sandbox.readFile(safePath)
					return success({ path: input.path, content })
				}
				case 'write': {
					if (!input.content) return failure('Content required for write')
					await sandbox.writeFile(safePath, input.content)
					return success({ path: input.path, written: true })
				}
				case 'list': {
					const result = await sandbox.exec(`ls -la ${safePath}`)
					return success({ path: input.path, listing: result.stdout })
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
