import { createDb, type Database } from '@hare/db'
import type { CloudflareEnv } from '@hare/types'
import type { Context } from 'hono'

// Re-export Database type for routes
export type { Database }

/**
 * Error thrown when Cloudflare environment is not available.
 */
export class CloudflareEnvError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'CloudflareEnvError'
	}
}

/**
 * Get D1 database binding from Hono context.
 * In TanStack Start on Cloudflare, env is passed through the request context to Hono.
 */
export function getD1(c: { env: unknown }): D1Database {
	const honoEnv = c.env as CloudflareEnv | undefined
	if (honoEnv?.DB) {
		return honoEnv.DB
	}

	throw new CloudflareEnvError(
		'D1 database binding not available. Ensure DB is configured in wrangler.jsonc.',
	)
}

/**
 * Get database instance from Hono context.
 */
export function getDb(c: Context): Database {
	return createDb(getD1(c))
}

/**
 * Get the full Cloudflare environment with all bindings.
 */
export function getCloudflareEnv(c: Context): CloudflareEnv {
	const honoEnv = c.env as CloudflareEnv | undefined
	if (honoEnv?.DB) {
		return honoEnv
	}

	throw new CloudflareEnvError(
		'Cloudflare environment not available. Ensure bindings are configured.',
	)
}
