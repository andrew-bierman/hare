import { z } from 'zod'
import { delegateTo } from './delegate'
import { createTool, failure, success, type ToolContext } from './types'

// ============================================================================
// SSRF Protection
// ============================================================================

/**
 * Blocked hostnames (exact match or ends with).
 */
const BLOCKED_HOSTNAMES = new Set([
	'localhost',
	'localhost.localdomain',
	'metadata.google.internal',
])

/**
 * Blocked hostname suffixes (for subdomains).
 */
const BLOCKED_HOSTNAME_SUFFIXES = ['.internal', '.local', '.localhost']

/**
 * Parse an IPv4 address into its numeric octets.
 * Returns null if not a valid IPv4.
 */
function parseIPv4(ip: string): number[] | null {
	const parts = ip.split('.')
	if (parts.length !== 4) return null
	const octets: number[] = []
	for (const part of parts) {
		const num = Number.parseInt(part, 10)
		if (Number.isNaN(num) || num < 0 || num > 255 || part !== num.toString()) {
			return null
		}
		octets.push(num)
	}
	return octets
}

/**
 * Check if an IPv4 address is in a private/blocked range.
 */
function isPrivateIPv4(octets: number[]): boolean {
	if (octets.length < 2) return false
	const a = octets[0]!
	const b = octets[1]!

	// 0.0.0.0/8 - Current network
	if (a === 0) return true

	// 10.0.0.0/8 - Private Class A
	if (a === 10) return true

	// 127.0.0.0/8 - Loopback
	if (a === 127) return true

	// 169.254.0.0/16 - Link-local
	if (a === 169 && b === 254) return true

	// 172.16.0.0/12 - Private Class B (172.16.0.0 - 172.31.255.255)
	if (a === 172 && b >= 16 && b <= 31) return true

	// 192.168.0.0/16 - Private Class C
	if (a === 192 && b === 168) return true

	// 224.0.0.0/4 - Multicast
	if (a >= 224 && a <= 239) return true

	// 240.0.0.0/4 - Reserved
	if (a >= 240) return true

	return false
}

/**
 * Check if an IPv6 address is in a private/blocked range.
 * Note: Simplified check - handles common private ranges.
 */
function isPrivateIPv6(hostname: string): boolean {
	const normalized = hostname.toLowerCase()

	// Loopback ::1
	if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true

	// Unspecified ::
	if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true

	// Link-local fe80::/10
	if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true

	// Unique local fc00::/7 (includes fd00::/8)
	if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true

	// IPv4-mapped ::ffff:x.x.x.x
	if (normalized.startsWith('::ffff:')) {
		const ipv4Part = normalized.slice(7)
		const octets = parseIPv4(ipv4Part)
		if (octets && isPrivateIPv4(octets)) return true
	}

	return false
}

/**
 * Check if a hostname is a blocked/private address.
 */
function isBlockedHost(hostname: string): { blocked: boolean; reason?: string } {
	const lower = hostname.toLowerCase()

	// Exact hostname blocklist
	if (BLOCKED_HOSTNAMES.has(lower)) {
		return { blocked: true, reason: 'Blocked hostname' }
	}

	// Suffix blocklist
	for (const suffix of BLOCKED_HOSTNAME_SUFFIXES) {
		if (lower.endsWith(suffix)) {
			return { blocked: true, reason: 'Internal network hostname suffix' }
		}
	}

	// Check if it's an IPv4 address
	const ipv4Octets = parseIPv4(lower)
	if (ipv4Octets) {
		if (isPrivateIPv4(ipv4Octets)) {
			return { blocked: true, reason: 'Private/internal IPv4 address' }
		}
		return { blocked: false }
	}

	// Check if it's an IPv6 address (may be in brackets for URLs)
	const ipv6 = lower.startsWith('[') && lower.endsWith(']') ? lower.slice(1, -1) : lower
	if (ipv6.includes(':')) {
		if (isPrivateIPv6(ipv6)) {
			return { blocked: true, reason: 'Private/internal IPv6 address' }
		}
	}

	return { blocked: false }
}

/**
 * Check if a URL is safe to call (SSRF protection).
 */
function isUrlSafe(url: string): { safe: boolean; reason?: string } {
	try {
		const parsed = new URL(url)

		// Only allow http and https
		if (!['http:', 'https:'].includes(parsed.protocol)) {
			return { safe: false, reason: 'Only HTTP and HTTPS protocols are allowed' }
		}

		// Check blocked hosts
		const hostCheck = isBlockedHost(parsed.hostname)
		if (hostCheck.blocked) {
			return { safe: false, reason: hostCheck.reason }
		}

		// Additional cloud metadata endpoint check
		if (parsed.hostname === '169.254.169.254') {
			return { safe: false, reason: 'Cloud metadata endpoint not allowed' }
		}

		return { safe: true }
	} catch {
		return { safe: false, reason: 'Invalid URL format' }
	}
}

// ============================================================================
// Output Schemas
// ============================================================================

export const HttpResponseOutputSchema = z.object({
	status: z.number().describe('HTTP status code'),
	statusText: z.string().describe('HTTP status text'),
	headers: z.record(z.string(), z.string()).describe('Response headers'),
	data: z.unknown().describe('Response body (parsed JSON or text)'),
	ok: z.boolean().describe('Whether the response was successful (status 200-299)'),
})

// ============================================================================
// Tools
// ============================================================================

/**
 * HTTP Request Tool - Make HTTP requests to external APIs.
 */
export const httpRequestTool = createTool({
	id: 'http_request',
	description:
		'Make an HTTP request to an external API. Supports GET, POST, PUT, PATCH, DELETE methods.',
	inputSchema: z.object({
		url: z.string().url().describe('The URL to send the request to'),
		method: z
			.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
			.optional()
			.default('GET')
			.describe('HTTP method'),
		headers: z.record(z.string(), z.string()).optional().describe('Additional headers to include'),
		body: z.string().optional().describe('Request body (for POST, PUT, PATCH)'),
		timeout: z.number().optional().default(30000).describe('Request timeout in milliseconds'),
	}),
	outputSchema: HttpResponseOutputSchema,
	execute: async (params, _context) => {
		// SSRF protection: validate URL before making request
		const urlSafety = isUrlSafe(params.url)
		if (!urlSafety.safe) {
			return failure(`URL blocked: ${urlSafety.reason}`)
		}

		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), params.timeout)

			const requestInit: RequestInit = {
				method: params.method,
				headers: {
					'User-Agent': 'Hare-Agent/1.0',
					...params.headers,
				},
				signal: controller.signal,
			}

			if (params.body && ['POST', 'PUT', 'PATCH'].includes(params.method || 'GET')) {
				requestInit.body = params.body
				// Auto-set content-type if not provided
				if (!params.headers?.['Content-Type'] && !params.headers?.['content-type']) {
					;(requestInit.headers as Record<string, string>)['Content-Type'] = 'application/json'
				}
			}

			const response = await fetch(params.url, requestInit)
			clearTimeout(timeoutId)

			const contentType = response.headers.get('content-type') || ''
			let data: unknown

			if (contentType.includes('application/json')) {
				data = await response.json()
			} else {
				data = await response.text()
			}

			return success({
				status: response.status,
				statusText: response.statusText,
				headers: Object.fromEntries(response.headers.entries()),
				data,
				ok: response.ok,
			})
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				return failure(`Request timed out after ${params.timeout}ms`)
			}
			return failure(
				`HTTP request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * HTTP GET convenience tool.
 */
export const httpGetTool = createTool({
	id: 'http_get',
	description: 'Make a simple HTTP GET request.',
	inputSchema: z.object({
		url: z.string().url().describe('The URL to fetch'),
		headers: z.record(z.string(), z.string()).optional().describe('Additional headers'),
	}),
	outputSchema: HttpResponseOutputSchema,
	execute: async (params, context) => {
		return delegateTo({
			tool: httpRequestTool,
			params: { ...params, method: 'GET', timeout: 30000 },
			context,
		})
	},
})

/**
 * HTTP POST convenience tool.
 */
export const httpPostTool = createTool({
	id: 'http_post',
	description: 'Make an HTTP POST request with a JSON body.',
	inputSchema: z.object({
		url: z.string().url().describe('The URL to post to'),
		body: z.unknown().describe('The JSON body to send'),
		headers: z.record(z.string(), z.string()).optional().describe('Additional headers'),
	}),
	outputSchema: HttpResponseOutputSchema,
	execute: async (params, context) => {
		const body = typeof params.body === 'string' ? params.body : JSON.stringify(params.body)
		return delegateTo({
			tool: httpRequestTool,
			params: {
				url: params.url,
				method: 'POST',
				body,
				headers: params.headers,
				timeout: 30000,
			},
			context,
		})
	},
})

/**
 * Get all HTTP tools.
 */
export function getHTTPTools(_context: ToolContext) {
	return [httpRequestTool, httpGetTool, httpPostTool]
}
