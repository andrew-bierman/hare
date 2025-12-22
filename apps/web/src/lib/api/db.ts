import type { Context } from 'hono'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { createDb, type Database } from 'web-app/db/client'

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
 * Get D1 database binding from Cloudflare context.
 * Throws CloudflareEnvError if D1 is not available.
 */
export async function getD1(c: { env: unknown }): Promise<D1Database> {
	// First try Hono context (for wrangler dev / production worker)
	const honoEnv = c.env as CloudflareEnv | undefined
	if (honoEnv?.DB) {
		return honoEnv.DB
	}

	// Try sync mode (for edge runtime with initOpenNextCloudflareForDev)
	try {
		const { env } = getCloudflareContext()
		if (env.DB) {
			return env.DB
		}
	} catch {
		// Sync mode not available, continue to async
	}

	// Try async mode (for Node.js runtime)
	try {
		const { env } = await getCloudflareContext({ async: true })
		if (env.DB) {
			return env.DB
		}
	} catch {
		// Async mode not available either
	}

	throw new CloudflareEnvError('D1 database binding not available. Ensure DB is configured in wrangler.toml.')
}

/**
 * Get database instance from Cloudflare context.
 * Throws CloudflareEnvError if database is not available.
 */
export async function getDb(c: Context): Promise<Database> {
	const d1 = await getD1(c)
	return createDb(d1)
}

/**
 * Get the full Cloudflare environment with all bindings.
 * Throws CloudflareEnvError if environment is not available.
 */
export async function getCloudflareEnv(c: Context): Promise<CloudflareEnv> {
	// First try Hono context
	const honoEnv = c.env as CloudflareEnv | undefined
	if (honoEnv?.DB) {
		return honoEnv
	}

	// Try sync mode (for edge runtime)
	try {
		const { env } = getCloudflareContext()
		if (env.DB) {
			return env
		}
	} catch {
		// Sync mode not available
	}

	// Try async mode (for Node.js runtime)
	try {
		const { env } = await getCloudflareContext({ async: true })
		if (env.DB) {
			return env
		}
	} catch {
		// Async mode not available
	}

	throw new CloudflareEnvError('Cloudflare environment not available. Ensure bindings are configured.')
}
