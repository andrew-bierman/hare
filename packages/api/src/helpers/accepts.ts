import type { Context } from 'hono'
import { accepts } from 'hono/accepts'

/**
 * Content negotiation helpers using Hono's accepts helper.
 *
 * These utilities help handle Accept-* headers for proper content negotiation.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Supported response formats for the API.
 */
export type ResponseFormat = 'json' | 'text' | 'html'

export interface AcceptsContentTypeOptions {
	/** Hono context */
	c: Context
	/** Content type to check */
	contentType: string
}

/**
 * Get the preferred response format based on Accept header.
 * Defaults to 'json' if no preference or unsupported format.
 *
 * Usage:
 * ```typescript
 * const format = getPreferredFormat(c)
 * if (format === 'html') {
 *   return c.html('<h1>Hello</h1>')
 * }
 * return c.json({ message: 'Hello' })
 * ```
 */
export function getPreferredFormat(c: Context): ResponseFormat {
	return accepts(c, {
		header: 'Accept',
		supports: ['json', 'text', 'html'],
		default: 'json',
	}) as ResponseFormat
}

/**
 * Supported languages for the API.
 */
export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh'

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'es', 'fr', 'de', 'ja', 'zh']

/**
 * Get the preferred language based on Accept-Language header.
 * Defaults to 'en' if no preference or unsupported language.
 *
 * Usage:
 * ```typescript
 * const lang = getPreferredLanguage(c)
 * const message = translations[lang].welcome
 * ```
 */
export function getPreferredLanguage(c: Context): SupportedLanguage {
	return accepts(c, {
		header: 'Accept-Language',
		supports: SUPPORTED_LANGUAGES,
		default: 'en',
	}) as SupportedLanguage
}

/**
 * Check if client accepts a specific content type.
 *
 * Usage:
 * ```typescript
 * if (acceptsContentType({ c, contentType: 'text/event-stream' })) {
 *   return streamSSE(c, ...)
 * }
 * ```
 */
export function acceptsContentType(options: AcceptsContentTypeOptions): boolean {
	const { c, contentType } = options
	const accept = c.req.header('Accept') || '*/*'
	if (accept === '*/*') return true

	const types = accept.split(',').map((t) => t.split(';')[0]?.trim().toLowerCase())
	return types.some((t) => t === contentType || t === '*/*')
}

/**
 * Check if client accepts JSON responses.
 */
export function acceptsJson(c: Context): boolean {
	return acceptsContentType({ c, contentType: 'application/json' })
}

/**
 * Check if client accepts Server-Sent Events.
 */
export function acceptsSSE(c: Context): boolean {
	return acceptsContentType({ c, contentType: 'text/event-stream' })
}

/**
 * Get the preferred encoding based on Accept-Encoding header.
 * Useful for determining compression preferences.
 *
 * Note: Cloudflare Workers handles compression automatically,
 * but this can be useful for custom compression logic.
 */
export function getPreferredEncoding(c: Context): 'gzip' | 'br' | 'deflate' | 'identity' {
	return accepts(c, {
		header: 'Accept-Encoding',
		supports: ['gzip', 'br', 'deflate', 'identity'],
		default: 'identity',
	}) as 'gzip' | 'br' | 'deflate' | 'identity'
}
