import type { Context } from 'hono'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { createDb, type Database } from 'web-app/db/client'

/**
 * Get database instance from Cloudflare context.
 * Uses getCloudflareContext() to access D1 binding in opennextjs-cloudflare.
 */
export async function getDb(c: Context): Promise<Database | null> {
	// First try Hono context (for wrangler dev / production worker)
	const honoD1 = (c.env as { DB?: D1Database })?.DB
	if (honoD1) {
		return createDb(honoD1)
	}

	// Try sync mode first (for edge runtime with initOpenNextCloudflareForDev)
	try {
		const { env } = getCloudflareContext()
		if (env.DB) {
			return createDb(env.DB)
		}
	} catch {
		// Sync mode failed, try async mode
	}

	// Fall back to async mode (for Node.js runtime)
	try {
		const { env } = await getCloudflareContext({ async: true })
		if (env.DB) {
			return createDb(env.DB)
		}
	} catch {
		// Async mode failed
	}

	return null
}

/**
 * Get the full Cloudflare environment with all bindings.
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
		return env
	} catch {
		// Sync mode failed, try async mode
	}

	// Fall back to async mode (for Node.js runtime)
	try {
		const { env } = await getCloudflareContext({ async: true })
		return env
	} catch (e) {
		console.error('Failed to get Cloudflare env:', e)
		return null
	}
}
