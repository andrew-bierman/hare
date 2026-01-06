/**
 * oRPC Base Setup
 *
 * Defines context types, base procedures, and middleware for oRPC routes.
 */

import { os, ORPCError } from '@orpc/server'
import type { Database } from '@hare/db'
import type { CloudflareEnv, WorkspaceRole } from '@hare/types'

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
 * Validates that user exists in context, returns 401 if not
 */
export const authedProcedure = os
	.$context<BaseContext & { user?: AuthContext['user'] }>()
	.use(({ context, next }) => {
		if (!context.user) {
			throw new ORPCError('UNAUTHORIZED', { message: 'Authentication required' })
		}
		return next({
			context: context as AuthContext,
		})
	})

/**
 * Workspace procedure - requires workspace access
 * Most routes use this as they operate within a workspace context
 * Validates that both user and workspace exist in context
 */
export const workspaceProcedure = os
	.$context<
		BaseContext & {
			user?: AuthContext['user']
			workspace?: WorkspaceContext['workspace']
			workspaceId?: string
			workspaceRole?: WorkspaceContext['workspaceRole']
		}
	>()
	.use(({ context, next }) => {
		if (!context.user) {
			throw new ORPCError('UNAUTHORIZED', { message: 'Authentication required' })
		}
		if (!context.workspace || !context.workspaceId || !context.workspaceRole) {
			throw new ORPCError('FORBIDDEN', { message: 'Workspace access required' })
		}
		return next({
			context: context as WorkspaceContext,
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
	if (context.workspaceRole === 'viewer') {
		throw new ORPCError('FORBIDDEN', { message: 'Member access required' })
	}
	return next({ context })
})

/**
 * Require write access (member, admin, or owner)
 */
export const requireWrite = workspaceProcedure.use(({ context, next }) => {
	if (context.workspaceRole === 'viewer') {
		throw new ORPCError('FORBIDDEN', { message: 'Write access required' })
	}
	return next({ context })
})

/**
 * Require admin access (admin or owner)
 */
export const requireAdmin = workspaceProcedure.use(({ context, next }) => {
	if (context.workspaceRole !== 'admin' && context.workspaceRole !== 'owner') {
		throw new ORPCError('FORBIDDEN', { message: 'Admin access required' })
	}
	return next({ context })
})

/**
 * Require owner access
 */
export const requireOwner = workspaceProcedure.use(({ context, next }) => {
	if (context.workspaceRole !== 'owner') {
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
