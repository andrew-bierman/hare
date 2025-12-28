import { z } from 'zod'
import { ContentTypes, Timeouts, UserAgents } from './constants'
import { createTool, failure, success, type ToolContext } from './types'

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
	execute: async (params, _context) => {
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
			}

			if (params.body && ['POST', 'PUT', 'PATCH'].includes(params.method || 'GET')) {
				requestInit.body = params.body
				// Auto-set content-type if not provided
				if (!params.headers?.['Content-Type'] && !params.headers?.['content-type']) {
					;(requestInit.headers as Record<string, string>)['Content-Type'] = ContentTypes.JSON
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
	execute: async (params, context) => {
		return httpRequestTool.execute(
			{ ...params, method: 'GET', timeout: Timeouts.HTTP_DEFAULT },
			context,
		)
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
	execute: async (params, context) => {
		const body = typeof params.body === 'string' ? params.body : JSON.stringify(params.body)
		return httpRequestTool.execute(
			{
				url: params.url,
				method: 'POST',
				body,
				headers: params.headers,
				timeout: Timeouts.HTTP_DEFAULT,
			},
			context,
		)
	},
})

/**
 * Get all HTTP tools.
 */
export function getHTTPTools(_context: ToolContext) {
	return [httpRequestTool, httpGetTool, httpPostTool]
}
