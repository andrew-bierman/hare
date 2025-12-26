import type { MiddlewareHandler } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { serverEnv } from 'web-app/lib/env/server'

/**
 * Security headers middleware
 * Adds security-related HTTP headers to all responses
 *
 * Note: unsafe-eval is required for Next.js in development mode.
 * In production, Next.js uses static optimization which doesn't require unsafe-eval.
 *
 * Security Headers Implemented:
 * - Content Security Policy (CSP) - Prevents XSS attacks
 * - Strict Transport Security (HSTS) - Forces HTTPS
 * - X-Content-Type-Options - Prevents MIME sniffing
 * - X-Frame-Options - Prevents clickjacking
 * - X-XSS-Protection - Legacy XSS filter
 * - Referrer Policy - Controls referrer information
 * - Permissions Policy - Restricts browser features
 */
export const securityHeadersMiddleware: MiddlewareHandler = secureHeaders({
	// Content Security Policy
	contentSecurityPolicy: {
		defaultSrc: ["'self'"],
		scriptSrc: [
			"'self'",
			"'unsafe-inline'", // TODO: Replace with nonce-based CSP
			...(serverEnv.NODE_ENV === 'development' ? ["'unsafe-eval'"] : []),
		],
		styleSrc: ["'self'", "'unsafe-inline'"], // Required for Tailwind
		imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
		fontSrc: ["'self'", 'data:'],
		connectSrc: ["'self'", 'https://*.cloudflare.com'],
		frameSrc: ["'none'"],
		objectSrc: ["'none'"],
		baseUri: ["'self'"],
		formAction: ["'self'"],
		frameAncestors: ["'none'"], // Equivalent to X-Frame-Options: DENY
		upgradeInsecureRequests: serverEnv.NODE_ENV === 'production' ? [] : undefined,
	},
	// Strict Transport Security - Force HTTPS for 1 year
	strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
	// X-Content-Type-Options - Prevent MIME sniffing
	xContentTypeOptions: 'nosniff',
	// X-Frame-Options - Prevent clickjacking
	xFrameOptions: 'DENY',
	// X-XSS-Protection (legacy, but doesn't hurt)
	xXssProtection: '1; mode=block',
	// Referrer Policy - Don't leak referrer to external sites
	referrerPolicy: 'strict-origin-when-cross-origin',
	// Permissions Policy - Restrict browser features
	permissionsPolicy: {
		camera: [],
		microphone: [],
		geolocation: [],
		payment: [],
		usb: [],
		'display-capture': [],
		magnetometer: [],
		gyroscope: [],
		accelerometer: [],
	},
})

/**
 * CORS middleware for API routes
 * Allows requests from the configured app URL
 *
 * Security considerations:
 * - Credentials are allowed (cookies, auth headers)
 * - Origin validation ensures only trusted domains
 * - Preflight caching reduces overhead
 */
export const corsMiddleware = cors({
	origin: (origin) => {
		const allowedOrigins = [
			serverEnv.NEXT_PUBLIC_APP_URL,
			'http://localhost:3000',
			'http://localhost:8787',
		]

		// Allow requests with no origin (same-origin, curl, etc.)
		if (!origin) return allowedOrigins[0] ?? 'http://localhost:3000'

		// Check if origin is in allowed list
		return allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] ?? 'http://localhost:3000')
	},
	credentials: true,
	allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization', 'X-Workspace-ID', 'X-API-Key', 'X-CSRF-Token'],
	exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
	maxAge: 86400, // 24 hours
})
