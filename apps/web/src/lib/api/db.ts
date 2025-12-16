import type { Context } from 'hono'
import { createDb, type Database } from 'web-app/db/client'

export function getDb(c: Context): Database | null {
	const d1 = (c.env as { DB?: D1Database })?.DB
	if (!d1) {
		return null
	}
	return createDb(d1)
}
