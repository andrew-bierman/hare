import { z } from 'zod'
import { delegateTo } from './delegate'
import { createTool, failure, success, type ToolContext } from './types'

// ============================================================================
// SSRF Protection
// ============================================================================

/**
 * Blocked hosts for SSRF protection.
 * Prevents requests to internal/private networks and cloud metadata endpoints.
 */
const BLOCKED_HOSTS = [
	'localhost',
	'127.0.0.1',
	'0.0.0.0',
	'::1',
	'169.254.', // Link-local
	'10.', // Private Class A
	'172.16.',
	'172.17.',
	'172.18.',
	'172.19.',
	'172.20.',
	'172.21.',
	'172.22.',
	'172.23.',
	'172.24.',
	'172.25.',
	'172.26.',
	'172.27.',
	'172.28.',
	'172.29.',
	'172.30.',
	'172.31.',
	'192.168.', // Private Class C
]

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
		const hostname = parsed.hostname.toLowerCase()
		for (const blocked of BLOCKED_HOSTS) {
			if (hostname === blocked || hostname.startsWith(blocked)) {
				return { safe: false, reason: 'Internal/private network addresses are not allowed' }
			}
		}

		// Block metadata endpoints (cloud providers)
		if (
			hostname === 'metadata.google.internal' ||
			hostname === '169.254.169.254' ||
			hostname.endsWith('.internal')
		) {
			return { safe: false, reason: 'Cloud metadata endpoints are not allowed' }
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
