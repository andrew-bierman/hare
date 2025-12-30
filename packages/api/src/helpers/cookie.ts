import type { Context } from 'hono'
import { deleteCookie, getCookie, getSignedCookie, setCookie, setSignedCookie } from 'hono/cookie'
import { COOKIE_CONFIG, COOKIE_NAMES, serverEnv } from '@hare/config'

/**
 * Cookie helpers using Hono's cookie helper.
 *
 * Provides convenient wrappers for common cookie operations.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Cookie options with sensible defaults for secure cookies.
 */
export interface SecureCookieOptions {
	/** Max age in seconds (default: 7 days) */
	maxAge?: number
	/** Cookie path (default: '/') */
	path?: string
	/** HTTP only flag (default: true) */
	httpOnly?: boolean
	/** Secure flag - requires HTTPS (default: true in production) */
	secure?: boolean
	/** SameSite attribute (default: 'lax') */
	sameSite?: 'strict' | 'lax' | 'none'
}

export interface GetCookieOptions {
	/** Hono context */
	c: Context
	/** Cookie name */
	name: string
}

export interface SetCookieOptions {
	/** Hono context */
	c: Context
	/** Cookie name */
	name: string
	/** Cookie value */
	value: string
	/** Optional cookie options */
	options?: SecureCookieOptions
}

export interface RemoveCookieOptions {
	/** Hono context */
	c: Context
	/** Cookie name */
	name: string
	/** Cookie path (default: '/') */
	path?: string
}

export interface SignedCookieOptions extends SetCookieOptions {
	/** Secret for signing */
	secret: string
}

export interface GetSignedCookieOptions extends GetCookieOptions {
	/** Secret for verification */
	secret: string
}

export interface SetWorkspaceCookieOptions {
	/** Hono context */
	c: Context
	/** Workspace ID to set */
	workspaceId: string
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_COOKIE_OPTIONS: SecureCookieOptions = {
	maxAge: COOKIE_CONFIG.SESSION_EXPIRY_SECONDS,
	path: COOKIE_CONFIG.DEFAULT_PATH,
	httpOnly: true,
	secure: serverEnv.NODE_ENV === 'production',
	sameSite: 'lax',
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Get a cookie value by name.
 */
export function getCookieValue(options: GetCookieOptions): string | undefined {
	const { c, name } = options
	return getCookie(c, name)
}

/**
 * Get all cookies as a key-value object.
 */
export function getAllCookies(c: Context): Record<string, string> {
	return getCookie(c)
}

/**
 * Set a cookie with secure defaults.
 */
export function setSecureCookie(opts: SetCookieOptions): void {
	const { c, name, value, options } = opts
	const cookieOpts = { ...DEFAULT_COOKIE_OPTIONS, ...options }
	setCookie(c, name, value, cookieOpts)
}

/**
 * Delete a cookie.
 */
export function removeCookie(options: RemoveCookieOptions): void {
	const { c, name, path = COOKIE_CONFIG.DEFAULT_PATH } = options
	deleteCookie(c, name, { path })
}

/**
 * Get a signed cookie value (requires secret).
 * Returns undefined if the cookie doesn't exist or signature is invalid.
 */
export async function getSignedCookieValue(
	options: GetSignedCookieOptions,
): Promise<string | undefined | false> {
	const { c, name, secret } = options
	return getSignedCookie(c, secret, name)
}

/**
 * Set a signed cookie (HMAC SHA-256 signature).
 * Use for sensitive data that shouldn't be tampered with.
 */
export async function setSignedSecureCookie(opts: SignedCookieOptions): Promise<void> {
	const { c, name, value, secret, options } = opts
	const cookieOpts = { ...DEFAULT_COOKIE_OPTIONS, ...options }
	await setSignedCookie(c, name, value, secret, cookieOpts)
}

/**
 * Common cookie names used in the application.
 * @deprecated Use COOKIE_NAMES from @hare/config instead
 */
export const CookieNames = COOKIE_NAMES

/**
 * Helper to get the current workspace ID from cookie.
 */
export function getWorkspaceCookie(c: Context): string | undefined {
	return getCookieValue({ c, name: COOKIE_NAMES.WORKSPACE })
}

/**
 * Helper to set the current workspace ID in cookie.
 */
export function setWorkspaceCookie(options: SetWorkspaceCookieOptions): void {
	const { c, workspaceId } = options
	setSecureCookie({
		c,
		name: COOKIE_NAMES.WORKSPACE,
		value: workspaceId,
		options: {
			maxAge: COOKIE_CONFIG.WORKSPACE_EXPIRY_SECONDS,
			httpOnly: false, // Allow JS access for client-side workspace switching
		},
	})
}
