import type { MiddlewareHandler } from 'hono'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db'
import { workspaces, workspaceMembers } from 'web-app/db/schema'
import type { AuthVariables } from './auth'

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface WorkspaceInfo {
	id: string
	name: string
	slug: string
	ownerId: string
}

export interface WorkspaceVariables extends AuthVariables {
	workspace: WorkspaceInfo
	workspaceRole: WorkspaceRole
}

/**
 * Workspace middleware that validates workspace access.
 * Expects workspaceId in query params or route params.
 * Must be used after authMiddleware.
 */
export const workspaceMiddleware: MiddlewareHandler<{ Variables: WorkspaceVariables }> = async (c, next) => {
	const user = c.get('user')
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	const db = getDb(c)
	if (!db) {
		return c.json({ error: 'Service unavailable' }, 503)
	}

	// Get workspaceId from query or params
	const workspaceId = c.req.query('workspaceId') || c.req.param('workspaceId')

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

	c.set('workspace', {
		id: workspace.id,
		name: workspace.name,
		slug: workspace.slug,
		ownerId: workspace.ownerId,
	})
	c.set('workspaceRole', membership.role as WorkspaceRole)

	await next()
}

/**
 * Check if user has permission for an action based on role.
 */
export function hasPermission(role: WorkspaceRole, action: 'read' | 'write' | 'admin' | 'owner'): boolean {
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
	action: 'read' | 'write' | 'admin' | 'owner'
): MiddlewareHandler<{ Variables: WorkspaceVariables }> {
	return async (c, next) => {
		const role = c.get('workspaceRole')

		if (!role || !hasPermission(role, action)) {
			return c.json({ error: 'Insufficient permissions' }, 403)
		}

		await next()
	}
}
