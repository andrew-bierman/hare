/**
 * Custom server entry point for Cloudflare Workers
 *
 * This file:
 * - Intercepts /api/* requests and routes them to Elysia
 * - Passes all other requests to TanStack Start
 * - Exports Durable Object classes for Cloudflare Workers
 */

import { app } from '@hare/api'
import type { CloudflareEnv } from '@hare/types'
import tanstackHandler from '@tanstack/react-start/server-entry'

// Combined fetch handler
const handler: ExportedHandler<CloudflareEnv> = {
	async fetch(request, env, _ctx) {
		const url = new URL(request.url)

		// Route /api/* requests to Elysia
		if (url.pathname.startsWith('/api')) {
			return app.fetch(request)
		}

		// All other requests go to TanStack Start
		return (
			tanstackHandler as { fetch: (req: Request, env: CloudflareEnv) => Promise<Response> }
		).fetch(request, env)
	},
}

export default handler

// Export Durable Objects for Cloudflare Workers
export { HareAgent, HareMcpAgent } from '@hare/agent/workers'
