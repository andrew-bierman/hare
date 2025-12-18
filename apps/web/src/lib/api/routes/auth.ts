import { Hono } from 'hono'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { createAuth } from 'web-app/lib/auth'

/**
 * Get D1 database binding from context.
 */
async function getD1(c: { env: unknown }): Promise<D1Database | null> {
	// First try Hono context
	const honoD1 = (c.env as { DB?: D1Database })?.DB
	if (honoD1) {
		return honoD1
	}

	// Try sync mode (edge runtime)
	try {
		const { env } = getCloudflareContext()
		if (env.DB) {
			return env.DB
		}
	} catch {
		// Sync mode failed
	}

	// Try async mode (Node.js runtime)
	try {
		const { env } = await getCloudflareContext({ async: true })
		if (env.DB) {
			return env.DB
		}
	} catch {
		// Async mode failed
	}

	return null
}

const app = new Hono().all('/*', async (c) => {
	const d1 = await getD1(c)

	if (!d1) {
		// Return proper error for missing database
		const path = c.req.path
		if (path.includes('/session') || path.includes('/get-session')) {
			return c.json({ session: null, user: null })
		}
		return c.json({ error: 'Database not available' }, 503)
	}

	const auth = createAuth(d1)
	return auth.handler(c.req.raw)
})

export default app
