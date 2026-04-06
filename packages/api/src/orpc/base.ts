/**
 * oRPC Base Setup
 *
 * Defines context types, base procedures, and middleware for oRPC routes.
 */

import { WorkspaceRole } from '@hare/config'
import type { Database } from '@hare/db'
import type { CloudflareEnv } from '@hare/types'
import { ORPCError, os } from '@orpc/server'

// =============================================================================
// Context Types
// =============================================================================

/**
 * Base context available to all procedures (from Hono middleware)
 */
export interface BaseContext {
	db: Database
	headers: Headers
	env: CloudflareEnv
	executionCtx: ExecutionContext
}

/**
 * Authenticated context - user is logged in
 */
export interface AuthContext extends BaseContext {
	user: {
		id: string
		email: string
		name: string | null
		image: string | null
	}
}

/**
 * Workspace context - user has workspace access
 */
export interface WorkspaceContext extends AuthContext {
	workspace: {
		id: string
		name: string
		slug: string
	}
	workspaceId: string
	workspaceRole: WorkspaceRole
}

// =============================================================================
// Base Procedures
// =============================================================================

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = os.$context<BaseContext>()

/**
 * Authenticated procedure - requires logged-in user
 * Validates user exists in context at runtime
 */
export const authedProcedure = os.$context<BaseContext>().use(({ context, next }) => {
	// Runtime check for user - context comes from optionalAuthMiddleware
	const user = (context as Partial<AuthContext>).user
	if (!user) {
		throw new ORPCError('UNAUTHORIZED', { message: 'Authentication required' })
	}
	// Return context with user guaranteed to exist
	return next({ context: { ...context, user } as AuthContext })
})

/**
 * Workspace procedure - requires workspace access
 * Most routes use this as they operate within a workspace context
 */
export const workspaceProcedure = os.$context<AuthContext>().use(({ context, next }) => {
	// Runtime check for workspace - context comes from workspaceMiddleware
	const workspace = (context as Partial<WorkspaceContext>).workspace
	const workspaceId = (context as Partial<WorkspaceContext>).workspaceId
	const workspaceRole = (context as Partial<WorkspaceContext>).workspaceRole
	if (!workspace || !workspaceId || !workspaceRole) {
		throw new ORPCError('FORBIDDEN', { message: 'Workspace access required' })
	}
	return next({
		context: { ...context, workspace, workspaceId, workspaceRole } as WorkspaceContext,
	})
})

// =============================================================================
// Permission Middleware
// =============================================================================

/**
 * Require at least viewer access (any workspace member)
 */
export const requireViewer = workspaceProcedure.use(({ context, next }) => {
	// All workspace members have at least viewer access
	return next({ context })
})

/**
 * Require at least member access (can read and interact)
 */
export const requireMember = workspaceProcedure.use(({ context, next }) => {
	if (context.workspaceRole === WorkspaceRole.VIEWER) {
		throw new ORPCError('FORBIDDEN', { message: 'Member access required' })
	}
	return next({ context })
})

/**
 * Require write access (member, admin, or owner)
 */
export const requireWrite = workspaceProcedure.use(({ context, next }) => {
	if (context.workspaceRole === WorkspaceRole.VIEWER) {
		throw new ORPCError('FORBIDDEN', { message: 'Write access required' })
	}
	return next({ context })
})

/**
 * Require admin access (admin or owner)
 */
export const requireAdmin = workspaceProcedure.use(({ context, next }) => {
	if (
		context.workspaceRole !== WorkspaceRole.ADMIN &&
		context.workspaceRole !== WorkspaceRole.OWNER
	) {
		throw new ORPCError('FORBIDDEN', { message: 'Admin access required' })
	}
	return next({ context })
})

/**
 * Require owner access
 */
export const requireOwner = workspaceProcedure.use(({ context, next }) => {
	if (context.workspaceRole !== WorkspaceRole.OWNER) {
		throw new ORPCError('FORBIDDEN', { message: 'Owner access required' })
	}
	return next({ context })
})

// =============================================================================
// Error Helpers
// =============================================================================

export function notFound(message: string): never {
	throw new ORPCError('NOT_FOUND', { message })
}

export function badRequest(message: string): never {
	throw new ORPCError('BAD_REQUEST', { message })
}

export function serverError(message: string): never {
	throw new ORPCError('INTERNAL_SERVER_ERROR', { message })
}
