/**
 * Custom server entry point for Cloudflare Workers
 *
 * This file:
 * - Intercepts /api/* requests and routes them to Hono
 * - Passes all other requests to TanStack Start
 * - Exports Durable Object classes for Cloudflare Workers
 */

import { app } from '@hare/api'
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
		return tanstackHandler.fetch(request, env, ctx)
	},
}

export default handler

// Export Durable Objects for Cloudflare Workers
export { HareAgent } from './lib/agents/hare-agent'
export { HareMcpAgent } from './lib/agents/mcp-agent'
