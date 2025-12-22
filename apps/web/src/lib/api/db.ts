import type { Context } from 'hono'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { createDb, type Database } from 'web-app/db/client'
import { logger } from 'web-app/lib/logger'

/**
 * Error thrown when Cloudflare environment is not available.
 */
export class EnvironmentError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'EnvironmentError'
	}
}

/**
 * Get D1 database binding from the current context.
 * Tries multiple runtime modes: Hono context, sync edge runtime, async Node.js runtime.
 *
 * @returns D1Database binding or null if not available
 */
export async function getD1(c: { env: unknown }): Promise<D1Database | null> {
	// First try Hono context (for wrangler dev / production worker)
	const honoD1 = (c.env as { DB?: D1Database })?.DB
	if (honoD1) {
		return honoD1
	}

	// Try sync mode (for edge runtime with initOpenNextCloudflareForDev)
	try {
		const { env } = getCloudflareContext()
		if (env.DB) {
			return env.DB
		}
	} catch (error) {
		logger.debug('Cloudflare sync context not available', { mode: 'sync' }, error)
	}

	// Fall back to async mode (for Node.js runtime)
	try {
		const { env } = await getCloudflareContext({ async: true })
		if (env.DB) {
			return env.DB
		}
	} catch (error) {
		logger.debug('Cloudflare async context not available', { mode: 'async' }, error)
	}

	return null
}

/**
 * Get database instance from Cloudflare context.
 * Uses getCloudflareContext() to access D1 binding in opennextjs-cloudflare.
 *
 * @returns Database instance or null if D1 binding is not available
 */
export async function getDb(c: Context): Promise<Database | null> {
	const d1 = await getD1(c)
	if (!d1) {
		return null
	}
	return createDb(d1)
}

/**
 * Get the full Cloudflare environment with all bindings.
 *
 * @returns CloudflareEnv or null if not available
 */
export async function getCloudflareEnv(c: Context): Promise<CloudflareEnv | null> {
	// First try Hono context
	const honoEnv = c.env as CloudflareEnv | undefined
	if (honoEnv?.DB) {
		return honoEnv
	}

	// Try sync mode first (for edge runtime)
	try {
		const { env } = getCloudflareContext()
		if (env) {
			return env
		}
	} catch (error) {
		logger.debug('Cloudflare sync context not available for env', { mode: 'sync' }, error)
	}

	// Fall back to async mode (for Node.js runtime)
	try {
		const { env } = await getCloudflareContext({ async: true })
		if (env) {
			return env
		}
	} catch (error) {
		logger.warn('Failed to get Cloudflare environment', { mode: 'async' }, error)
	}

	return null
}
