import type { Context } from 'hono'
import { deleteCookie, getCookie, getSignedCookie, setCookie, setSignedCookie } from 'hono/cookie'
import { serverEnv } from 'web-app/lib/env/server'

/**
 * Cookie helpers using Hono's cookie helper.
 *
 * Provides convenient wrappers for common cookie operations.
 */

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

const DEFAULT_COOKIE_OPTIONS: SecureCookieOptions = {
	maxAge: 60 * 60 * 24 * 7, // 7 days
	path: '/',
	httpOnly: true,
	secure: serverEnv.NODE_ENV === 'production',
	sameSite: 'lax',
}

/**
 * Get a cookie value by name.
 */
export function getCookieValue(c: Context, name: string): string | undefined {
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
export function setSecureCookie(
	c: Context,
	name: string,
	value: string,
	options?: SecureCookieOptions,
): void {
	const opts = { ...DEFAULT_COOKIE_OPTIONS, ...options }
	setCookie(c, name, value, opts)
}

/**
 * Delete a cookie.
 */
export function removeCookie(c: Context, name: string, path = '/'): void {
	deleteCookie(c, name, { path })
}

/**
 * Get a signed cookie value (requires secret).
 * Returns undefined if the cookie doesn't exist or signature is invalid.
 */
export async function getSignedCookieValue(
	c: Context,
	name: string,
	secret: string,
): Promise<string | undefined | false> {
	return getSignedCookie(c, secret, name)
}

/**
 * Set a signed cookie (HMAC SHA-256 signature).
 * Use for sensitive data that shouldn't be tampered with.
 */
export async function setSignedSecureCookie(
	c: Context,
	name: string,
	value: string,
	secret: string,
	options?: SecureCookieOptions,
): Promise<void> {
	const opts = { ...DEFAULT_COOKIE_OPTIONS, ...options }
	await setSignedCookie(c, name, value, secret, opts)
}

/**
 * Common cookie names used in the application.
 */
export const CookieNames = {
	/** Session cookie name */
	SESSION: 'hare_session',
	/** User preferences cookie */
	PREFERENCES: 'hare_prefs',
	/** Theme preference */
	THEME: 'hare_theme',
	/** Workspace context */
	WORKSPACE: 'hare_workspace',
} as const

/**
 * Helper to get the current workspace ID from cookie.
 */
export function getWorkspaceCookie(c: Context): string | undefined {
	return getCookieValue(c, CookieNames.WORKSPACE)
}

/**
 * Helper to set the current workspace ID in cookie.
 */
export function setWorkspaceCookie(c: Context, workspaceId: string): void {
	setSecureCookie(c, CookieNames.WORKSPACE, workspaceId, {
		maxAge: 60 * 60 * 24 * 30, // 30 days
		httpOnly: false, // Allow JS access for client-side workspace switching
	})
}
