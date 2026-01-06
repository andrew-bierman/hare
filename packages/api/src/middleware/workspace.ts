import { and, eq } from 'drizzle-orm'
import type { MiddlewareHandler } from 'hono'
import { workspaceMembers, workspaces } from '@hare/db'
import { getDb } from '../db'
import { isWorkspaceRole, type WorkspaceEnv, type WorkspaceRole } from '@hare/types'

/**
 * Workspace middleware that validates workspace access.
 * Accepts workspaceId from X-Workspace-Id header, query params, or route params.
 * Header is preferred for cleaner URLs and consistency with oRPC.
 * Must be used after authMiddleware.
 */
export const workspaceMiddleware: MiddlewareHandler<WorkspaceEnv> = async (c, next) => {
	const user = c.get('user')
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	const db = getDb(c)

	// Get workspaceId from header (preferred), query, or params
	const workspaceId =
		c.req.header('X-Workspace-Id') || c.req.query('workspaceId') || c.req.param('workspaceId')

	if (!workspaceId) {
		return c.json({ error: 'Workspace ID required' }, 400)
	}

	// Get workspace
	const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId))

	if (!workspace) {
		return c.json({ error: 'Workspace not found' }, 404)
	}

	// Check if user is owner
	if (workspace.ownerId === user.id) {
		c.set('workspace', {
			id: workspace.id,
			name: workspace.name,
			slug: workspace.slug,
			ownerId: workspace.ownerId,
		})
		c.set('workspaceRole', 'owner')
		await next()
		return
	}

	// Check workspace membership
	const [membership] = await db
		.select()
		.from(workspaceMembers)
		.where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))

	if (!membership) {
		return c.json({ error: 'Access denied to workspace' }, 403)
	}

	// Validate role from database
	if (!isWorkspaceRole(membership.role)) {
		console.error(`Invalid workspace role in database: ${membership.role}`)
		return c.json({ error: 'Invalid workspace configuration' }, 500)
	}

	c.set('workspace', {
		id: workspace.id,
		name: workspace.name,
		slug: workspace.slug,
		ownerId: workspace.ownerId,
	})
	c.set('workspaceRole', membership.role)

	await next()
}

/**
 * Input for checking permission.
 */
export interface HasPermissionInput {
	role: WorkspaceRole
	action: 'read' | 'write' | 'admin' | 'owner'
}

/**
 * Check if user has permission for an action based on role.
 */
export function hasPermission(input: HasPermissionInput): boolean {
	const { role, action } = input
	const permissions: Record<WorkspaceRole, Set<string>> = {
		owner: new Set(['read', 'write', 'admin', 'owner']),
		admin: new Set(['read', 'write', 'admin']),
		member: new Set(['read', 'write']),
		viewer: new Set(['read']),
	}

	return permissions[role]?.has(action) ?? false
}

/**
 * Middleware factory for permission-based access control.
 */
export function requirePermission(
	action: 'read' | 'write' | 'admin' | 'owner',
): MiddlewareHandler<WorkspaceEnv> {
	return async (c, next) => {
		const role = c.get('workspaceRole')

		if (!role || !hasPermission({ role, action })) {
			return c.json({ error: 'Insufficient permissions' }, 403)
		}

		await next()
	}
}
