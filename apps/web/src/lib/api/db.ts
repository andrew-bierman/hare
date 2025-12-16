import type { Context } from 'hono'
import { createDb } from 'web-app/db/client'

export function getDb(c: Context) {
	const d1 = (c.env as { DB?: D1Database })?.DB
	if (!d1) {
		throw new Error('D1 database not available')
	}
	return createDb(d1)
}
