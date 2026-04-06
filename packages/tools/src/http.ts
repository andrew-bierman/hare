import { getErrorMessage, isAbortError } from '@hare/checks'
import { z } from 'zod'
import { ContentTypes, Timeouts, UserAgents } from './constants'
import { delegateTo } from './delegate'
import { isRedirectSafe, isUrlSafe, MAX_REDIRECT_HOPS } from './security/ssrf'
import { createTool, failure, success, type ToolContext } from './types'

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
		timeout: z
			.number()
			.optional()
			.default(Timeouts.HTTP_DEFAULT)
			.describe('Request timeout in milliseconds'),
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
					'User-Agent': UserAgents.DEFAULT,
					...params.headers,
				},
				signal: controller.signal,
				// SSRF: don't auto-follow redirects — validate each hop
				redirect: 'manual',
			}

			if (params.body && ['POST', 'PUT', 'PATCH'].includes(params.method || 'GET')) {
				requestInit.body = params.body
				// Auto-set content-type if not provided
				if (!params.headers?.['Content-Type'] && !params.headers?.['content-type']) {
					;(requestInit.headers as Record<string, string>)['Content-Type'] = ContentTypes.JSON
				}
			}

			// Follow redirects manually, validating each hop for SSRF
			let currentUrl = params.url
			let response = await fetch(currentUrl, requestInit)
			let hops = 0

			while (
				hops < MAX_REDIRECT_HOPS &&
				response.status >= 300 &&
				response.status < 400 &&
				response.headers.get('location')
			) {
				const location = response.headers.get('location')!
				const redirectCheck = isRedirectSafe({
					locationHeader: location,
					originalUrl: currentUrl,
				})
				if (!redirectCheck.safe) {
					clearTimeout(timeoutId)
					return failure(`Redirect blocked: ${redirectCheck.reason}`)
				}

				currentUrl = new URL(location, currentUrl).toString()
				response = await fetch(currentUrl, {
					...requestInit,
					// GET for redirect (standard browser behavior)
					method: 'GET',
					body: undefined,
				})
				hops++
			}

			clearTimeout(timeoutId)

			const contentType = response.headers.get('content-type') || ''
			let data: unknown

			if (contentType.includes(ContentTypes.JSON)) {
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
			if (isAbortError(error)) {
				return failure(`Request timed out after ${params.timeout}ms`)
			}
			return failure(`HTTP request failed: ${getErrorMessage(error)}`)
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
			params: { ...params, method: 'GET', timeout: Timeouts.HTTP_DEFAULT },
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
				timeout: Timeouts.HTTP_DEFAULT,
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
