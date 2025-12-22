import type { MiddlewareHandler } from 'hono'
import type { HonoEnv } from '../types'

interface SecureHeadersOptions {
	/** Enable Content Security Policy (default: true) */
	contentSecurityPolicy?: boolean | string
	/** Enable Strict Transport Security (default: true) */
	strictTransportSecurity?: boolean | string
	/** Enable X-Frame-Options (default: 'SAMEORIGIN') */
	xFrameOptions?: false | 'DENY' | 'SAMEORIGIN'
	/** Enable X-Content-Type-Options (default: true) */
	xContentTypeOptions?: boolean
	/** Enable X-XSS-Protection (default: true for legacy browsers) */
	xXssProtection?: boolean | string
	/** Enable Referrer-Policy (default: 'strict-origin-when-cross-origin') */
	referrerPolicy?: false | string
	/** Enable Permissions-Policy (default: limited permissions) */
	permissionsPolicy?: false | string
}

/**
 * Default Content Security Policy
 * This is a strict policy that should work for most API-only applications.
 * For apps with UI, customize this policy to match your needs.
 */
const DEFAULT_CSP = [
	"default-src 'self'",
	"script-src 'self'",
	"style-src 'self'",
	"img-src 'self' data: https:",
	"font-src 'self' data:",
	"connect-src 'self' https:",
	"frame-ancestors 'self'",
].join('; ')

/**
 * Secure headers middleware for adding security-related HTTP headers.
 * Helps prevent common web vulnerabilities like XSS, clickjacking, etc.
 *
 * Note: The default CSP is strict and doesn't allow unsafe-inline or unsafe-eval.
 * If your application needs these, provide a custom CSP via options.
 */
export function secureHeaders(options: SecureHeadersOptions = {}): MiddlewareHandler<HonoEnv> {
	const {
		contentSecurityPolicy = true,
		strictTransportSecurity = true,
		xFrameOptions = 'SAMEORIGIN',
		xContentTypeOptions = true,
		xXssProtection = true,
		referrerPolicy = 'strict-origin-when-cross-origin',
		permissionsPolicy = true,
	} = options

	return async (c, next) => {
		// Content Security Policy
		if (contentSecurityPolicy) {
			const cspValue =
				typeof contentSecurityPolicy === 'string' ? contentSecurityPolicy : DEFAULT_CSP
			c.header('Content-Security-Policy', cspValue)
		}

		// Strict Transport Security (HSTS)
		if (strictTransportSecurity) {
			const hstsValue =
				typeof strictTransportSecurity === 'string'
					? strictTransportSecurity
					: 'max-age=31536000; includeSubDomains'
			c.header('Strict-Transport-Security', hstsValue)
		}

		// X-Frame-Options
		if (xFrameOptions) {
			c.header('X-Frame-Options', xFrameOptions)
		}

		// X-Content-Type-Options
		if (xContentTypeOptions) {
			c.header('X-Content-Type-Options', 'nosniff')
		}

		// X-XSS-Protection (legacy, but still useful for older browsers)
		if (xXssProtection) {
			const xssValue = typeof xXssProtection === 'string' ? xXssProtection : '1; mode=block'
			c.header('X-XSS-Protection', xssValue)
		}

		// Referrer-Policy
		if (referrerPolicy) {
			c.header('Referrer-Policy', referrerPolicy)
		}

		// Permissions-Policy
		if (permissionsPolicy) {
			const permissionsValue =
				typeof permissionsPolicy === 'string'
					? permissionsPolicy
					: 'geolocation=(), microphone=(), camera=()'
			c.header('Permissions-Policy', permissionsValue)
		}

		await next()
	}
}
