/**
 * Custom server entry point for Cloudflare Workers
 *
 * This file:
 * - Intercepts /api/* requests and routes them to Hono
 * - Passes all other requests to TanStack Start
 * - Exports Durable Object classes for Cloudflare Workers
 */

import { app } from '@hare/api'
import type { CloudflareEnv } from '@hare/types'
import tanstackHandler from '@tanstack/react-start/server-entry'

// Combined fetch handler
const handler: ExportedHandler<CloudflareEnv> = {
	async fetch(request, env, ctx) {
		const url = new URL(request.url)

		// Route /api/* requests to Hono
		if (url.pathname.startsWith('/api')) {
			return app.fetch(request, env, ctx)
		}

		// All other requests go to TanStack Start
		// TanStack Start handler type varies by version, use type assertion
		return (
			tanstackHandler as { fetch: (req: Request, env: CloudflareEnv) => Promise<Response> }
		).fetch(request, env)
	},
}

export default handler

// Export Durable Objects for Cloudflare Workers
export { HareAgent, HareMcpAgent } from '@hare/agent/workers'
