import { serverEnv } from '@hare/config'
import Elysia from 'elysia'

/**
 * Security headers plugin for Elysia
 * Adds security-related HTTP headers to all responses
 *
 * Content-Security-Policy, Strict-Transport-Security, X-Frame-Options,
 * X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
 */
export const securityHeaders = new Elysia({ name: 'security-headers' }).onAfterHandle(({ set }) => {
	const isDev = serverEnv.NODE_ENV === 'development'

	// Content-Security-Policy
	const scriptSrc = [
		"'self'",
		"'unsafe-inline'",
		'https://cdn.jsdelivr.net',
		...(isDev ? ["'unsafe-eval'"] : []),
	].join(' ')

	const cspDirectives = [
		`default-src 'self'`,
		`script-src ${scriptSrc}`,
		`style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net`,
		`img-src 'self' data: https: blob:`,
		`font-src 'self' data: https://fonts.scalar.com`,
		`connect-src 'self' https://*.cloudflare.com https://api.scalar.com`,
		`frame-src 'none'`,
		`object-src 'none'`,
		`base-uri 'self'`,
		`form-action 'self'`,
		`frame-ancestors 'none'`,
		// Only upgrade insecure requests in production to avoid breaking local HTTP dev
		...(!isDev ? ['upgrade-insecure-requests'] : []),
	]
	const csp = cspDirectives.join('; ')

	set.headers['Content-Security-Policy'] = csp
	// Strict-Transport-Security with preload
	set.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
	// X-Content-Type-Options
	set.headers['X-Content-Type-Options'] = 'nosniff'
	// X-Frame-Options
	set.headers['X-Frame-Options'] = 'DENY'
	// X-XSS-Protection (legacy, but doesn't hurt)
	set.headers['X-XSS-Protection'] = '1; mode=block'
	// Referrer-Policy
	set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
	// Permissions-Policy
	set.headers['Permissions-Policy'] = [
		'camera=()',
		'microphone=()',
		'geolocation=()',
		'payment=()',
		'usb=()',
		'bluetooth=()',
		'magnetometer=()',
		'gyroscope=()',
		'accelerometer=()',
	].join(', ')
})
