import type { D1Database } from '@cloudflare/workers-types'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { Context } from 'hono'
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
export async function getD1(c: Context): Promise<D1Database> {
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
		// Async mode failed
	}

	throw new CloudflareEnvError(
		'D1 database binding not available. Ensure DB is configured in wrangler.toml.',
	)
}

/**
 * Get database instance from Cloudflare context.
 * Returns null only when database is genuinely unavailable (for optional DB access).
 * For required DB access, use getD1() which throws on failure.
 */
export async function getDb(c: Context): Promise<Database | null> {
	try {
		const d1 = await getD1(c)
		return createDb(d1)
	} catch (e) {
		if (e instanceof CloudflareEnvError) {
			return null
		}
		throw e
	}
}

/**
 * Get database instance, throwing if not available.
 * Use this for routes that require database access.
 */
export async function requireDb(c: Context): Promise<Database> {
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
		// Async mode failed
	}

	throw new CloudflareEnvError(
		'Cloudflare environment not available. Ensure bindings are configured.',
	)
}
