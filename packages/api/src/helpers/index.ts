/**
 * API Helper utilities for routes.
 *
 * Provides common patterns for:
 * - Response schemas and definitions
 * - Permission checks
 * - Error handling
 * - Testing utilities
 * - Content negotiation
 * - Cookie management
 */

// Accepts helpers - for content negotiation
export {
	acceptsContentType,
	acceptsJson,
	acceptsSSE,
	getPreferredEncoding,
	getPreferredFormat,
	getPreferredLanguage,
	type ResponseFormat,
	type SupportedLanguage,
} from './accepts'
// Cookie helpers - for cookie management
export {
	CookieNames,
	getAllCookies,
	getCookieValue,
	getSignedCookieValue,
	getWorkspaceCookie,
	removeCookie,
	type SecureCookieOptions,
	setSecureCookie,
	setSignedSecureCookie,
	setWorkspaceCookie,
} from './cookie'
// Permission helpers
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
// Response schemas and common responses
export {
	commonResponses,
	ErrorSchema,
	IdParamSchema,
	SuccessSchema,
} from './responses'

// Testing helpers are exported separately to avoid circular dependencies
// Import directly from './testing' when needed in tests
