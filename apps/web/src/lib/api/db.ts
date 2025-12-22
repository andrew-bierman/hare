import type { Context } from 'hono'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { createDb, type Database } from 'web-app/db/client'

/**
 * Error thrown when required Cloudflare bindings are not available.
 */
export class EnvironmentError extends Error {
	constructor(
		message: string,
		public readonly binding: string
	) {
		super(message)
		this.name = 'EnvironmentError'
	}
}

/**
 * Get D1 database binding from the current context.
 * Tries Hono context first, then falls back to OpenNext context modes.
 *
 * @throws {EnvironmentError} if D1 binding is not available
 */
export async function getD1(c: { env: unknown }): Promise<D1Database> {
	// Try Hono context first (wrangler dev / production worker)
	const honoD1 = (c.env as CloudflareEnv | undefined)?.DB
	if (honoD1) {
		return honoD1
	}

	// Try sync mode (edge runtime with initOpenNextCloudflareForDev)
	try {
		const { env } = getCloudflareContext()
		if (env.DB) {
			return env.DB
		}
	} catch {
		// Sync mode not available, try async
	}

	// Try async mode (Node.js runtime)
	try {
		const { env } = await getCloudflareContext({ async: true })
		if (env.DB) {
			return env.DB
		}
	} catch {
		// Async mode not available either
	}

	throw new EnvironmentError(
		'D1 database binding not available. Ensure DB is configured in wrangler.toml and the worker is running in Cloudflare environment.',
		'DB'
	)
}

/**
 * Get database instance from Cloudflare context.
 *
 * @throws {EnvironmentError} if D1 binding is not available
 */
export async function getDb(c: Context): Promise<Database> {
	const d1 = await getD1(c)
	return createDb(d1)
}

/**
 * Get the full Cloudflare environment with all bindings.
 *
 * @throws {EnvironmentError} if environment is not available
 */
export async function getCloudflareEnv(c: Context): Promise<CloudflareEnv> {
	// Try Hono context first
	const honoEnv = c.env as CloudflareEnv | undefined
	if (honoEnv?.DB) {
		return honoEnv
	}

	// Try sync mode (edge runtime)
	try {
		const { env } = getCloudflareContext()
		if (env.DB) {
			return env
		}
	} catch {
		// Sync mode not available
	}

	// Try async mode (Node.js runtime)
	try {
		const { env } = await getCloudflareContext({ async: true })
		if (env.DB) {
			return env
		}
	} catch {
		// Async mode not available
	}

	throw new EnvironmentError(
		'Cloudflare environment not available. Ensure bindings are configured in wrangler.toml.',
		'CloudflareEnv'
	)
}
