import { serverEnv } from '@hare/config'
import type { MiddlewareHandler } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'

/**
 * Security headers middleware
 * Adds security-related HTTP headers to all responses
 *
 * Note: unsafe-eval is allowed in development mode for better debugging.
 */
export const securityHeadersMiddleware: MiddlewareHandler = secureHeaders({
	// Content Security Policy
	contentSecurityPolicy: {
		defaultSrc: ["'self'"],
		scriptSrc: [
			"'self'",
			"'unsafe-inline'",
			'https://cdn.jsdelivr.net', // Required for Scalar API docs
			...(serverEnv.NODE_ENV === 'development' ? ["'unsafe-eval'"] : []),
		],
		styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'], // Required for Tailwind + Scalar
		imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
		fontSrc: ["'self'", 'data:', 'https://fonts.scalar.com'], // Scalar API docs fonts
		connectSrc: ["'self'", 'https://*.cloudflare.com', 'https://api.scalar.com'], // Scalar API docs
		frameSrc: ["'none'"],
		objectSrc: ["'none'"],
		baseUri: ["'self'"], // Prevent base tag hijacking
		formAction: ["'self'"], // Restrict form submissions
		frameAncestors: ["'none'"], // Prevent clickjacking (CSP version of X-Frame-Options)
		upgradeInsecureRequests: [],
	},
	// Strict Transport Security with preload
	strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
	// X-Content-Type-Options
	xContentTypeOptions: 'nosniff',
	// X-Frame-Options
	xFrameOptions: 'DENY',
	// X-XSS-Protection (legacy, but doesn't hurt)
	xXssProtection: '1; mode=block',
	// Referrer Policy
	referrerPolicy: 'strict-origin-when-cross-origin',
	// Permissions Policy - expanded restrictions
	permissionsPolicy: {
		camera: [],
		microphone: [],
		geolocation: [],
		payment: [],
		usb: [],
		bluetooth: [],
		magnetometer: [],
		gyroscope: [],
		accelerometer: [],
	},
})

/**
 * CORS middleware for API routes
 * Allows requests from the configured app URL
 */
export const corsMiddleware = cors({
	origin: (origin) => {
		const allowedOrigins = [serverEnv.APP_URL, 'http://localhost:3000', 'http://localhost:8787']

		// Allow requests with no origin (same-origin, curl, etc.)
		if (!origin) return allowedOrigins[0] ?? 'http://localhost:3000'

		// Check if origin is in allowed list
		return allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] ?? 'http://localhost:3000')
	},
	credentials: true,
	allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization', 'X-Workspace-ID', 'X-CSRF-Token', 'X-API-Key'],
	exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
	maxAge: 86400, // 24 hours
})
