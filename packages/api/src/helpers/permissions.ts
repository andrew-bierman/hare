import type { Context } from 'hono'
import type { WorkspaceRole } from '@hare/types'
import { config } from '@hare/config'

// =============================================================================
// Types
// =============================================================================

export interface HandleRouteErrorOptions {
	/** Hono context */
	c: Context
	/** Error that occurred */
	error: unknown
}

// =============================================================================
// Errors
// =============================================================================

/**
 * Error thrown when a user lacks required permissions.
 */
export class ForbiddenError extends Error {
	constructor(message = 'Insufficient permissions') {
		super(message)
		this.name = 'ForbiddenError'
	}
}

/**
 * Error thrown when a resource is not found.
 */
export class NotFoundError extends Error {
	constructor(resource = 'Resource') {
		super(`${resource} not found`)
		this.name = 'NotFoundError'
	}
}

/**
 * Check if the role has write access (not a viewer).
 */
export function hasWriteAccess(role: WorkspaceRole): boolean {
	return role !== 'viewer'
}

/**
 * Check if the role has admin access (owner or admin).
 */
export function hasAdminAccess(role: WorkspaceRole): boolean {
	return role === 'owner' || role === 'admin'
}

/**
 * Check if the role is owner.
 */
export function isOwner(role: WorkspaceRole): boolean {
	return role === 'owner'
}

/**
 * Require write access or throw ForbiddenError.
 */
export function requireWriteAccess(role: WorkspaceRole): void {
	if (!hasWriteAccess(role)) {
		throw new ForbiddenError()
	}
}

/**
 * Require admin access or throw ForbiddenError.
 */
export function requireAdminAccess(role: WorkspaceRole): void {
	if (!hasAdminAccess(role)) {
		throw new ForbiddenError()
	}
}

/**
 * Require owner role or throw ForbiddenError.
 */
export function requireOwner(role: WorkspaceRole): void {
	if (!isOwner(role)) {
		throw new ForbiddenError('Only owner can perform this action')
	}
}

/**
 * Handle common errors and return appropriate JSON responses.
 * Use this in route handlers to standardize error handling.
 */
export function handleRouteError(options: HandleRouteErrorOptions) {
	const { c, error } = options
	if (error instanceof ForbiddenError) {
		return c.json({ error: error.message }, config.http.status.FORBIDDEN)
	}
	if (error instanceof NotFoundError) {
		return c.json({ error: error.message }, config.http.status.NOT_FOUND)
	}
	console.error('Unhandled route error:', error)
	return c.json({ error: 'Internal server error' }, config.http.status.INTERNAL_SERVER_ERROR)
}
