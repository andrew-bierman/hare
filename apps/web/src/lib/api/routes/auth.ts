import { Hono } from 'hono'
import { createAuth } from 'web-app/lib/auth'
import { getD1, CloudflareEnvError } from '../db'
import type { HonoEnv } from '../types'

const app = new Hono<HonoEnv>().all('/*', async (c) => {
	let d1: D1Database
	try {
		d1 = await getD1(c)
	} catch (e) {
		if (e instanceof CloudflareEnvError) {
			// For session endpoints, return null session instead of error
			// This allows client to handle "not logged in" gracefully
			const path = c.req.path
			if (path.includes('/session') || path.includes('/get-session')) {
				return c.json({ session: null, user: null })
			}
			return c.json({ error: 'Database not available', code: 'DB_UNAVAILABLE' }, 503)
		}
		throw e
	}

	const auth = createAuth(d1)
	return auth.handler(c.req.raw)
})

export default app
