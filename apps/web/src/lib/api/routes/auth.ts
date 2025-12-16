import { Hono } from 'hono'
import { createAuth } from 'web-app/lib/auth'

const app = new Hono().all('/*', async (c) => {
	const d1 = (c.env as { DB?: D1Database })?.DB

	if (!d1) {
		// Development fallback with mock responses
		const path = c.req.path
		if (path.includes('/session')) {
			return c.json({ session: null, user: null })
		}
		return c.json({ error: 'Database not available in development' }, 500)
	}

	const auth = createAuth(d1)
	return auth.handler(c.req.raw)
})

export default app
