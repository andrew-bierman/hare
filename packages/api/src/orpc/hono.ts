/**
 * oRPC + Hono Integration
 *
 * Mounts the oRPC handler as a Hono route, allowing oRPC to work
 * alongside existing Hono routes.
 */

import { workspaceMembers, workspaces } from '@hare/db/schema'
import type { OrpcEnv, WorkspaceRole } from '@hare/types'
import { isWorkspaceRole } from '@hare/types'
import { RPCHandler } from '@orpc/server/fetch'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { getCloudflareEnv, getDb } from '../db'
import { optionalAuthMiddleware } from '../middleware/auth'
import { appRouter } from './routers'

// Create the RPC handler
const handler = new RPCHandler(appRouter)

/**
 * Hono app for oRPC routes
 *
 * Uses OrpcEnv since oRPC procedures handle their own auth validation.
 * The optionalAuthMiddleware extracts user from session if present,
 * and the procedures validate auth requirements themselves.
 *
 * Workspace context is extracted from X-Workspace-Id header when present.
 *
 * Mount this at /api/rpc in your main app:
 * ```ts
 * import { orpcApp } from '@hare/api/orpc/hono'
 * app.route('/api/rpc', orpcApp)
 * ```
 */
export const orpcApp = new Hono<OrpcEnv>()

// Apply optional auth middleware to extract user from session
orpcApp.use('*', optionalAuthMiddleware)

// Handle all oRPC requests
orpcApp.all('/*', async (c) => {
	// Extract context from Hono's middleware chain
	const db = getDb(c)
	const env = getCloudflareEnv(c)
	const user = c.get('user')

	// Try to get workspace from Hono context first (may be set by other middleware)
	let workspace = c.get('workspace')
	let workspaceRole = c.get('workspaceRole')

	// If no workspace in context but user is authenticated and X-Workspace-Id header is present,
	// fetch workspace and verify access
	const workspaceIdHeader = c.req.header('X-Workspace-Id')
	if (!workspace && user && workspaceIdHeader) {
		// Fetch workspace
		const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceIdHeader))

		if (ws) {
			// Check if user is owner
			if (ws.ownerId === user.id) {
				workspace = {
					id: ws.id,
					name: ws.name,
					slug: ws.slug,
					ownerId: ws.ownerId,
				}
				workspaceRole = 'owner'
			} else {
				// Check workspace membership
				const [membership] = await db
					.select()
					.from(workspaceMembers)
					.where(and(eq(workspaceMembers.workspaceId, ws.id), eq(workspaceMembers.userId, user.id)))

				if (membership && isWorkspaceRole(membership.role)) {
					workspace = {
						id: ws.id,
						name: ws.name,
						slug: ws.slug,
						ownerId: ws.ownerId,
					}
					workspaceRole = membership.role as WorkspaceRole
				}
			}
		}
	}

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
	// Type assertion needed because oRPC infers merged context types but procedures
	// handle auth/workspace validation at runtime via middleware
	const { matched, response } = await handler.handle(c.req.raw, {
		prefix: '/api/rpc',
		context: context as Parameters<typeof handler.handle>[1]['context'],
	})

	if (matched) {
		return new Response(response.body, response)
	}

	return c.json({ error: 'Not found' }, 404)
})

// Export types for client
export type { AppRouter } from './routers'
