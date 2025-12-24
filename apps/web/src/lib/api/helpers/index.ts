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

// Response schemas and common responses
export {
	commonResponses,
	ErrorSchema,
	IdParamSchema,
	SuccessSchema,
} from './responses'

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

// Testing helpers - for type-safe API testing
export { client, createTestClient, createMockRequest, type AppType } from './testing'

// Accepts helpers - for content negotiation
export {
	getPreferredFormat,
	getPreferredLanguage,
	getPreferredEncoding,
	acceptsContentType,
	acceptsJson,
	acceptsSSE,
	type ResponseFormat,
	type SupportedLanguage,
} from './accepts'

// Cookie helpers - for cookie management
export {
	getCookieValue,
	getAllCookies,
	setSecureCookie,
	removeCookie,
	getSignedCookieValue,
	setSignedSecureCookie,
	getWorkspaceCookie,
	setWorkspaceCookie,
	CookieNames,
	type SecureCookieOptions,
} from './cookie'
