/**
 * Request validation middleware
 * Implements content-length limits and request validation
 */

import type { Context, MiddlewareHandler } from 'hono'
import type { HonoEnv } from '../api/types'

/**
 * Request size limits by content type
 */
const SIZE_LIMITS = {
	json: 1024 * 1024, // 1MB for JSON
	text: 512 * 1024, // 512KB for text
	form: 10 * 1024 * 1024, // 10MB for form data (file uploads)
	default: 1024 * 1024, // 1MB default
}

/**
 * Validate request body size
 * Prevents DoS attacks via large request bodies
 */
export function requestSizeLimit(maxSize?: number): MiddlewareHandler<HonoEnv> {
	return async (c: Context<HonoEnv>, next) => {
		const contentLength = c.req.header('content-length')

		if (contentLength) {
			const size = Number.parseInt(contentLength, 10)
			const contentType = c.req.header('content-type') || ''

			// Determine size limit based on content type
			let limit = maxSize || SIZE_LIMITS.default
			if (!maxSize) {
				if (contentType.includes('application/json')) {
					limit = SIZE_LIMITS.json
				} else if (contentType.includes('text/')) {
					limit = SIZE_LIMITS.text
				} else if (contentType.includes('multipart/form-data')) {
					limit = SIZE_LIMITS.form
				}
			}

			if (size > limit) {
				return c.json(
					{
						error: 'Request entity too large',
						message: `Request body exceeds maximum size of ${limit} bytes`,
					},
					413,
				)
			}
		}

		await next()
	}
}

/**
 * Validate JSON request body
 * Ensures valid JSON and prevents parsing attacks
 */
export function validateJsonBody(): MiddlewareHandler<HonoEnv> {
	return async (c: Context<HonoEnv>, next) => {
		const contentType = c.req.header('content-type') || ''

		if (contentType.includes('application/json')) {
			try {
				// Try to parse the JSON
				const body = await c.req.text()
				JSON.parse(body)
			} catch (error) {
				return c.json(
					{
						error: 'Invalid JSON',
						message: 'Request body must be valid JSON',
					},
					400,
				)
			}
		}

		await next()
	}
}

/**
 * Sanitize request headers
 * Remove potentially dangerous headers
 */
export function sanitizeHeaders(): MiddlewareHandler<HonoEnv> {
	return async (c: Context<HonoEnv>, next) => {
		// List of headers that should not be forwarded
		const dangerousHeaders = [
			'x-forwarded-host',
			'x-forwarded-server',
			'x-original-url',
			'x-rewrite-url',
		]

		// Check for dangerous headers
		for (const header of dangerousHeaders) {
			if (c.req.header(header)) {
				return c.json(
					{
						error: 'Invalid request',
						message: 'Request contains prohibited headers',
					},
					400,
				)
			}
		}

		await next()
	}
}

/**
 * Validate required headers
 */
export function requireHeaders(headers: string[]): MiddlewareHandler<HonoEnv> {
	return async (c: Context<HonoEnv>, next) => {
		const missing: string[] = []

		for (const header of headers) {
			if (!c.req.header(header)) {
				missing.push(header)
			}
		}

		if (missing.length > 0) {
			return c.json(
				{
					error: 'Missing required headers',
					message: `The following headers are required: ${missing.join(', ')}`,
				},
				400,
			)
		}

		await next()
	}
}

/**
 * Content-Type validation
 * Ensures requests have the expected content type
 */
export function requireContentType(allowedTypes: string[]): MiddlewareHandler<HonoEnv> {
	return async (c: Context<HonoEnv>, next) => {
		const contentType = c.req.header('content-type') || ''

		const matches = allowedTypes.some((type) => contentType.includes(type))

		if (!matches) {
			return c.json(
				{
					error: 'Unsupported Media Type',
					message: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
				},
				415,
			)
		}

		await next()
	}
}
