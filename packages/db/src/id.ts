/**
 * Simple ID generation using crypto.randomUUID()
 *
 * This replaces @paralleldrive/cuid2 which calls crypto.getRandomValues()
 * at module initialization time, violating Cloudflare Workers' global scope restrictions.
 *
 * crypto.randomUUID() is available natively in:
 * - Cloudflare Workers
 * - Modern browsers
 * - Node.js 16+
 */

export function createId(): string {
	return crypto.randomUUID()
}

export function isCuid(id: string): boolean {
	// UUID v4 format validation
	return (
		typeof id === 'string' &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
	)
}
