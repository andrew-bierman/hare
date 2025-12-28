/**
 * Request validation middleware
 * Provides protection against common request-based attacks
 */

import type { Context, MiddlewareHandler } from 'hono'
import type { HonoEnv } from '../api/types'

/**
 * Default size limits for different content types
 */
const SIZE_LIMITS = {
	json: 1 * 1024 * 1024, // 1MB for JSON
	text: 512 * 1024, // 512KB for text
	form: 10 * 1024 * 1024, // 10MB for form data (file uploads)
	default: 1 * 1024 * 1024, // 1MB default
}

/**
 * Dangerous headers that should be blocked or sanitized
 */
const DANGEROUS_HEADERS = [
	'x-forwarded-host', // Can be used for host header injection
	'x-original-url', // Can be used for URL rewriting attacks
	'x-rewrite-url', // Can be used for URL rewriting attacks
]

export interface RequestSizeLimitOptions {
	maxJsonSize?: number
	maxTextSize?: number
	maxFormSize?: number
	maxDefaultSize?: number
}

/**
 * Middleware to limit request body size
 * Prevents DoS attacks via large payloads
 */
export function requestSizeLimit(
	options: RequestSizeLimitOptions = {},
): MiddlewareHandler<HonoEnv> {
	const limits = {
		json: options.maxJsonSize ?? SIZE_LIMITS.json,
		text: options.maxTextSize ?? SIZE_LIMITS.text,
		form: options.maxFormSize ?? SIZE_LIMITS.form,
		default: options.maxDefaultSize ?? SIZE_LIMITS.default,
	}

	return async (c: Context<HonoEnv>, next: () => Promise<void>) => {
		const contentLength = c.req.header('content-length')
		const contentType = c.req.header('content-type') ?? ''

		if (contentLength) {
			const size = parseInt(contentLength, 10)

			let maxSize = limits.default
			if (contentType.includes('application/json')) {
				maxSize = limits.json
			} else if (contentType.includes('text/')) {
				maxSize = limits.text
			} else if (
				contentType.includes('multipart/form-data') ||
				contentType.includes('application/x-www-form-urlencoded')
			) {
				maxSize = limits.form
			}

			if (size > maxSize) {
				return c.json(
					{
						error: 'Payload too large',
						message: `Request body exceeds maximum size of ${Math.round(maxSize / 1024)}KB`,
					},
					413,
				)
			}
		}

		await next()
	}
}

/**
 * Middleware to require specific content types
 * Prevents content-type confusion attacks
 */
export function requireContentType(allowedTypes: string[]): MiddlewareHandler<HonoEnv> {
	return async (c: Context<HonoEnv>, next: () => Promise<void>) => {
		// Only check for methods that typically have a body
		if (['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
			const contentType = c.req.header('content-type')

			if (!contentType) {
				return c.json(
					{
						error: 'Missing Content-Type',
						message: 'Content-Type header is required for this request',
					},
					415,
				)
			}

			const isAllowed = allowedTypes.some((type) =>
				contentType.toLowerCase().includes(type.toLowerCase()),
			)

			if (!isAllowed) {
				return c.json(
					{
						error: 'Unsupported Media Type',
						message: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
					},
					415,
				)
			}
		}

		await next()
	}
}

/**
 * Middleware to block dangerous headers
 * Prevents header injection attacks
 */
export function blockDangerousHeaders(): MiddlewareHandler<HonoEnv> {
	return async (c: Context<HonoEnv>, next: () => Promise<void>) => {
		for (const header of DANGEROUS_HEADERS) {
			if (c.req.header(header)) {
				// Log the attempt for security monitoring
				console.warn(`Blocked dangerous header: ${header}`, {
					ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for'),
					path: c.req.path,
				})

				return c.json(
					{
						error: 'Bad Request',
						message: 'Request contains blocked headers',
					},
					400,
				)
			}
		}

		await next()
	}
}

/**
 * Middleware to validate JSON body
 * Catches malformed JSON before route handlers
 */
export function validateJsonBody(): MiddlewareHandler<HonoEnv> {
	return async (c: Context<HonoEnv>, next: () => Promise<void>) => {
		const contentType = c.req.header('content-type')

		if (
			contentType?.includes('application/json') &&
			['POST', 'PUT', 'PATCH'].includes(c.req.method)
		) {
			try {
				// Attempt to parse body - this validates JSON structure
				await c.req.json()
			} catch {
				return c.json(
					{
						error: 'Invalid JSON',
						message: 'Request body contains invalid JSON',
					},
					400,
				)
			}
		}

		await next()
	}
}

/**
 * Combined request validation middleware
 * Applies multiple security checks
 */
export function requestValidation(
	options: RequestSizeLimitOptions = {},
): MiddlewareHandler<HonoEnv> {
	const sizeLimit = requestSizeLimit(options)
	const dangerousHeaders = blockDangerousHeaders()

	return async (c: Context<HonoEnv>, next: () => Promise<void>) => {
		// Check size limits
		const sizeLimitResult = await new Promise<Response | undefined>((resolve) => {
			sizeLimit(c, () => Promise.resolve()).then(() => resolve(undefined))
		})
		if (sizeLimitResult) return sizeLimitResult

		// Check dangerous headers
		const headersResult = await new Promise<Response | undefined>((resolve) => {
			dangerousHeaders(c, () => Promise.resolve()).then(() => resolve(undefined))
		})
		if (headersResult) return headersResult

		await next()
	}
}
