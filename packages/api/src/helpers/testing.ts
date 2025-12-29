import { testClient } from 'hono/testing'
import { type AppType, app } from '../index'

/**
 * Type-safe test client for the Hare API.
 *
 * Usage:
 * ```typescript
 * import { client } from 'web-app/lib/api/helpers/testing'
 *
 * // Type-safe API calls with autocompletion
 * const res = await client.agents.$get({ query: { workspaceId: 'xxx' } })
 * const data = await res.json()
 * ```
 *
 * Note: For routes that require authentication, you'll need to mock
 * the auth middleware or provide valid session headers.
 */
export const client = testClient(app)

/**
 * Create a test client with custom headers (useful for auth testing).
 *
 * Usage:
 * ```typescript
 * const authedClient = createTestClient({
 *   'Cookie': 'session=xxx',
 *   'Authorization': 'Bearer xxx'
 * })
 * ```
 */
export function createTestClient(headers?: Record<string, string>) {
	return testClient(app, {
		headers,
	})
}

/**
 * Helper to create a mock request with common test headers.
 */
export function createMockRequest(
	path: string,
	options?: {
		method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
		body?: unknown
		headers?: Record<string, string>
	},
) {
	const { method = 'GET', body, headers = {} } = options ?? {}

	return new Request(`http://localhost${path}`, {
		method,
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
		body: body ? JSON.stringify(body) : undefined,
	})
}

// Re-export the app type for external use
export type { AppType }
