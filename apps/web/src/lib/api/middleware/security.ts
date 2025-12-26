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
 */
export const securityHeadersMiddleware: MiddlewareHandler = secureHeaders({
	// Content Security Policy
	contentSecurityPolicy: {
		defaultSrc: ["'self'"],
		scriptSrc: [
			"'self'",
			"'unsafe-inline'",
			...(serverEnv.NODE_ENV === 'development' ? ["'unsafe-eval'"] : []),
		],
		styleSrc: ["'self'", "'unsafe-inline'"], // Required for Tailwind
		imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
		fontSrc: ["'self'", 'data:'],
		connectSrc: ["'self'", 'https://*.cloudflare.com'],
		frameSrc: ["'none'"],
		objectSrc: ["'none'"],
		upgradeInsecureRequests: [],
	},
	// Strict Transport Security
	strictTransportSecurity: 'max-age=31536000; includeSubDomains',
	// X-Content-Type-Options
	xContentTypeOptions: 'nosniff',
	// X-Frame-Options
	xFrameOptions: 'DENY',
	// X-XSS-Protection (legacy, but doesn't hurt)
	xXssProtection: '1; mode=block',
	// Referrer Policy
	referrerPolicy: 'strict-origin-when-cross-origin',
	// Permissions Policy
	permissionsPolicy: {
		camera: [],
		microphone: [],
		geolocation: [],
		payment: [],
	},
})

/**
 * CORS middleware for API routes
 * Allows requests from the configured app URL
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
	allowHeaders: ['Content-Type', 'Authorization', 'X-Workspace-ID'],
	exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
	maxAge: 86400, // 24 hours
})
