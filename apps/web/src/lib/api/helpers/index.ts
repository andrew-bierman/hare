/**
 * Hono Helpers for the Hare API.
 *
 * These are utility functions (not middleware) that assist in developing
 * the application. They provide convenient wrappers around Hono's built-in
 * helpers with application-specific defaults and types.
 */

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
