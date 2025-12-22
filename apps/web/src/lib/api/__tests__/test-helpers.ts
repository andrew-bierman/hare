import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test'
import type { ExecutionContext } from '@cloudflare/workers-types'

/**
 * Get mock CloudflareEnv for tests
 */
export function getMockEnv(): CloudflareEnv {
	return env as CloudflareEnv
}

/**
 * Create a mock execution context for tests
 */
export function getMockExecutionContext(): ExecutionContext {
	return createExecutionContext()
}

/**
 * Wait for execution context to complete
 */
export async function waitForExecutionContext(ctx: ExecutionContext): Promise<void> {
	await waitOnExecutionContext(ctx)
}
