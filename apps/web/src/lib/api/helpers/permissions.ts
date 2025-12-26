import type { Context } from 'hono'
import type { WorkspaceRole } from '../types'

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
export function handleRouteError(c: Context, error: unknown) {
	if (error instanceof ForbiddenError) {
		return c.json({ error: error.message }, 403)
	}
	if (error instanceof NotFoundError) {
		return c.json({ error: error.message }, 404)
	}
	console.error('Unhandled route error:', error)
	return c.json({ error: 'Internal server error' }, 500)
}
