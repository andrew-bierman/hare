/**
 * Input sanitization utilities for security
 * Protects against XSS, SQL injection, and other common attacks
 */

import { config } from '@hare/config'

// =============================================================================
// Types
// =============================================================================

export interface RateLimitKeyOptions {
	/** User ID */
	userId: string
	/** API endpoint */
	endpoint: string
}

export interface IsSafeStringOptions {
	/** Input string to check */
	input: string
	/** Optional allowed pattern (default: alphanumeric + underscore + hyphen) */
	allowedPattern?: RegExp
}

export interface TruncateStringOptions {
	/** Input string to truncate */
	input: string
	/** Maximum length */
	maxLength: number
}

// =============================================================================
// Constants
// =============================================================================

/**
 * HTML entity encoding map
 */
const HTML_ENTITIES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#x27;',
	'/': '&#x2F;',
}

/**
 * Sanitize HTML by encoding special characters
 * Prevents XSS attacks by escaping HTML entities
 */
export function sanitizeHtml(input: string): string {
	return input.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Sanitize user input for display
 * Removes control characters and normalizes whitespace
 */
export function sanitizeUserInput(input: string): string {
	// Remove control characters except newlines and tabs
	// biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional for sanitization
	let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

	// Normalize whitespace
	sanitized = sanitized.replace(/\s+/g, ' ').trim()

	return sanitized
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string {
	const sanitized = email.toLowerCase().trim()

	// Basic email validation
	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
	if (!emailRegex.test(sanitized)) {
		throw new Error('Invalid email format')
	}

	return sanitized
}

/**
 * Sanitize URL by validating protocol and encoding
 * Only allows http, https, and mailto protocols
 */
export function sanitizeUrl(url: string): string {
	const trimmed = url.trim()

	// Allow relative URLs
	if (trimmed.startsWith('/')) {
		return encodeURI(trimmed)
	}

	let parsed: URL
	try {
		parsed = new URL(trimmed)
	} catch {
		throw new Error('Invalid URL format')
	}

	// Only allow safe protocols
	const allowedProtocols = ['http:', 'https:', 'mailto:']
	if (!allowedProtocols.includes(parsed.protocol)) {
		throw new Error('Invalid URL protocol')
	}

	return parsed.toString()
}

/**
 * Sanitize filename by removing path traversal characters
 * Prevents directory traversal attacks
 */
export function sanitizeFilename(filename: string): string {
	let sanitized = filename

	// Remove path traversal attempts - use while loop to handle nested sequences
	// This handles cases like '.../.../' that would become '../' after single pass
	while (sanitized.includes('..')) {
		sanitized = sanitized.replace(/\.\./g, '')
	}

	// Remove path separators
	sanitized = sanitized.replace(/[/\\]/g, '')

	// Remove null bytes and other dangerous characters
	// biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional for sanitization
	sanitized = sanitized.replace(/[\0\x00]/g, '')

	// Remove any remaining path-like patterns
	sanitized = sanitized.replace(/\.\//g, '')
	sanitized = sanitized.replace(/\.\\/g, '')

	// Remove leading dots (security: prevent hidden files or path traversal remnants)
	sanitized = sanitized.replace(/^\.+/, '')

	// Trim and limit length
	sanitized = sanitized.trim().substring(0, config.validation.filenameMaxLength)

	if (!sanitized) {
		throw new Error('Invalid filename')
	}

	return sanitized
}

/**
 * Sanitize JSON input by parsing and stringifying
 * Removes any functions or undefined values
 */
export function sanitizeJson<T = unknown>(input: string): T {
	try {
		const parsed = JSON.parse(input)

		// Remove functions and undefined values
		const sanitized = JSON.parse(JSON.stringify(parsed))

		return sanitized as T
	} catch {
		throw new Error('Invalid JSON format')
	}
}

/**
 * Rate limit key generation
 * Creates a consistent key for rate limiting based on user and endpoint
 */
export function getRateLimitKey(options: RateLimitKeyOptions): string {
	const { userId, endpoint } = options
	// Sanitize inputs
	const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '')
	const sanitizedEndpoint = endpoint.replace(/[^a-zA-Z0-9/_-]/g, '')

	return `rate:${sanitizedUserId}:${sanitizedEndpoint}`
}

/**
 * Validate agent instructions for potential security issues
 * Checks for common injection patterns
 */
export function validateAgentInstructions(instructions: string): {
	valid: boolean
	issues: string[]
} {
	const issues: string[] = []

	// Check for extremely long instructions
	if (instructions.length > config.validation.agentInstructionsMaxLength) {
		issues.push('Instructions exceed maximum length')
	}

	// Check for suspicious patterns (basic checks)
	const suspiciousPatterns = [
		/system\s*\(/gi, // System calls
		/eval\s*\(/gi, // Eval calls
		/exec\s*\(/gi, // Exec calls
		/<script/gi, // Script tags
		/javascript:/gi, // JavaScript protocol
	]

	for (const pattern of suspiciousPatterns) {
		if (pattern.test(instructions)) {
			issues.push(`Suspicious pattern detected: ${pattern.source}`)
		}
	}

	return {
		valid: issues.length === 0,
		issues,
	}
}

/**
 * Sanitize metadata object
 * Removes any potentially dangerous properties
 */
export function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
	const sanitized: Record<string, unknown> = {}

	for (const [key, value] of Object.entries(metadata)) {
		// Skip dangerous keys
		if (key.startsWith('__') || key === 'constructor' || key === 'prototype') {
			continue
		}

		// Recursively sanitize nested objects
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			sanitized[key] = sanitizeMetadata(value as Record<string, unknown>)
		} else if (typeof value === 'string') {
			sanitized[key] = sanitizeUserInput(value)
		} else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
			sanitized[key] = value
		} else if (Array.isArray(value)) {
			sanitized[key] = value.map((item) => {
				if (typeof item === 'string') return sanitizeUserInput(item)
				if (typeof item === 'object' && item !== null)
					return sanitizeMetadata(item as Record<string, unknown>)
				return item
			})
		}
		// Skip functions and other types
	}

	return sanitized
}

/**
 * Check if a string contains only safe characters
 * Useful for validating identifiers, slugs, etc.
 */
export function isSafeString(options: IsSafeStringOptions): boolean {
	const { input, allowedPattern } = options
	const pattern = allowedPattern || /^[a-zA-Z0-9_-]+$/
	return pattern.test(input)
}

/**
 * Truncate string to a maximum length with ellipsis
 */
export function truncateString(options: TruncateStringOptions): string {
	const { input, maxLength } = options
	if (input.length <= maxLength) return input
	return `${input.substring(0, maxLength - 3)}...`
}
