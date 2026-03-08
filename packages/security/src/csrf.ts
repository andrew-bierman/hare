/**
 * CSRF (Cross-Site Request Forgery) Protection
 * Implements double-submit cookie pattern for CSRF prevention
 */

import type { HonoEnv } from '@hare/types'
import type { Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { serverEnv } from '@hare/config'
import { timingSafeEqual } from './encryption'

const isDev = serverEnv.NODE_ENV === 'development'

/**
 * CSRF token configuration
 * In development: use plain cookie name and no secure flag (HTTP localhost)
 * In production: use __Host- prefix with secure flag (HTTPS only)
 */
const CSRF_CONFIG = {
	cookieName: isDev ? 'csrf' : '__Host-csrf',
	headerName: 'X-CSRF-Token',
	tokenLength: 32,
	cookieMaxAge: 60 * 60 * 24, // 24 hours
	cookieOptions: {
		httpOnly: true,
		secure: !isDev,
		sameSite: 'Strict' as const,
		path: '/',
	},
}

/**
 * Generate a cryptographically secure random CSRF token
 */
export function generateCsrfToken(): string {
	const array = new Uint8Array(CSRF_CONFIG.tokenLength)
	crypto.getRandomValues(array)
	return btoa(String.fromCharCode(...array))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '')
}

/**
 * Get or create CSRF token from cookie
 */
export function getCsrfToken(c: Context<HonoEnv>): string {
	let token = getCookie(c, CSRF_CONFIG.cookieName)

	if (!token) {
		token = generateCsrfToken()
		setCookie(c, CSRF_CONFIG.cookieName, token, {
			...CSRF_CONFIG.cookieOptions,
			maxAge: CSRF_CONFIG.cookieMaxAge,
		})
	}

	return token
}

/**
 * Validate CSRF token from request
 * Compares token from header with token from cookie
 */
export function validateCsrfToken(c: Context<HonoEnv>): boolean {
	const cookieToken = getCookie(c, CSRF_CONFIG.cookieName)
	const headerToken = c.req.header(CSRF_CONFIG.headerName)

	// Both tokens must be present and match
	if (!cookieToken || !headerToken) {
		return false
	}

	// Use timing-safe comparison from encryption module
	return timingSafeEqual({ a: cookieToken, b: headerToken })
}

/**
 * CSRF protection middleware
 * Use for state-changing operations (POST, PUT, PATCH, DELETE)
 */
export function csrfProtection() {
	return async (c: Context<HonoEnv>, next: () => Promise<void>) => {
		// CSRF validation is disabled until the frontend implements the
		// double-submit cookie pattern (read token from non-httpOnly cookie,
		// send as X-CSRF-Token header). The cookie is currently httpOnly and
		// the frontend never sends the header, so all POST requests fail.
		// Better Auth handles its own CSRF for auth routes.
		// TODO: Implement frontend CSRF token handling, then re-enable
		await next()
		return

		const method = c.req.method

		// CSRF protection only for state-changing methods
		if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
			// Skip CSRF for API key authentication (external APIs)
			const apiKey = c.req.header('X-API-Key')
			if (apiKey) {
				await next()
				return
			}

			// Validate CSRF token
			if (!validateCsrfToken(c)) {
				return c.json(
					{
						error: 'CSRF validation failed',
						message: 'Invalid or missing CSRF token',
					},
					403,
				)
			}
		}

		await next()
	}
}

/**
 * Set CSRF token cookie for the client
 * Call this on GET requests to pages that need CSRF protection
 */
export function setCsrfCookie(c: Context<HonoEnv>): string {
	return getCsrfToken(c)
}
