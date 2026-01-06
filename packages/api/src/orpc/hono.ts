/**
 * oRPC + Hono Integration
 *
 * Mounts the oRPC handler as a Hono route, allowing oRPC to work
 * alongside existing Hono routes.
 */

import { Hono } from 'hono'
import { RPCHandler } from '@orpc/server/fetch'
import { appRouter } from './routers'
import type { WorkspaceEnv } from '@hare/types'
import { getCloudflareEnv, getDb } from '../db'

// Create the RPC handler
const handler = new RPCHandler(appRouter)

/**
 * Hono app for oRPC routes
 *
 * Mount this at /api/rpc in your main app:
 * ```ts
 * import { orpcApp } from '@hare/api/orpc/hono'
 * app.route('/api/rpc', orpcApp)
 * ```
 */
export const orpcApp = new Hono<WorkspaceEnv>()

// Handle all oRPC requests
orpcApp.all('/*', async (c) => {
	// Extract context from Hono's middleware chain
	const db = getDb(c)
	const env = getCloudflareEnv(c)
	const user = c.get('user')
	const workspace = c.get('workspace')
	const workspaceRole = c.get('workspaceRole')

	// Build context for oRPC
	const context = {
		db,
		env,
		headers: c.req.raw.headers,
		...(user && {
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				image: user.image,
			},
		}),
		...(workspace && {
			workspace: {
				id: workspace.id,
				name: workspace.name,
				slug: workspace.slug,
			},
			workspaceId: workspace.id,
			workspaceRole: workspaceRole ?? 'viewer',
		}),
	}

	// Handle the RPC request
	// Note: Route is mounted at /rpc within /api, so full path is /api/rpc
	const { matched, response } = await handler.handle(c.req.raw, {
		prefix: '/api/rpc',
		context,
	})

	if (matched) {
		return new Response(response.body, response)
	}

	return c.json({ error: 'Not found' }, 404)
})

// Export types for client
export type { AppRouter } from './routers'
