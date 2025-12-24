/**
 * API Helper utilities for routes.
 *
 * Provides common patterns for:
 * - Response schemas and definitions
 * - Permission checks
 * - Error handling
 */

export {
	commonResponses,
	ErrorSchema,
	IdParamSchema,
	SuccessSchema,
} from './responses'

export {
	ForbiddenError,
	handleRouteError,
	hasAdminAccess,
	hasWriteAccess,
	isOwner,
	NotFoundError,
	requireAdminAccess,
	requireOwner,
	requireWriteAccess,
} from './permissions'
