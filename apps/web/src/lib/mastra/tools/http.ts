import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export interface HttpToolConfig {
	url: string
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
	headers?: Record<string, string>
	timeout?: number
}

const httpInputSchema = z.object({
	url: z.string().describe('The URL to make the request to'),
	method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional().default('GET').describe('The HTTP method to use'),
	body: z.any().optional().describe('The request body (for POST, PUT, PATCH)'),
	headers: z.record(z.string(), z.string()).optional().describe('Additional headers to include'),
})

export function createHttpTool(config: HttpToolConfig) {
	return createTool({
		id: 'http-request',
		description: 'Make HTTP requests to external APIs',
		inputSchema: httpInputSchema,
		execute: async ({ context }) => {
			const { url, method = 'GET', body, headers } = context

			try {
				const requestHeaders: Record<string, string> = {
					'Content-Type': 'application/json',
					...config.headers,
					...headers,
				}

				const requestInit: RequestInit = {
					method,
					headers: requestHeaders,
				}

				if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
					requestInit.body = JSON.stringify(body)
				}

				const controller = new AbortController()
				const timeout = config.timeout || 30000
				const timeoutId = setTimeout(() => controller.abort(), timeout)

				try {
					const response = await fetch(url, {
						...requestInit,
						signal: controller.signal,
					})

					clearTimeout(timeoutId)

					const data = await response.text()
					let parsedData
					try {
						parsedData = JSON.parse(data)
					} catch {
						parsedData = data
					}

					return {
						success: true,
						status: response.status,
						statusText: response.statusText,
						headers: Object.fromEntries(response.headers.entries()),
						data: parsedData,
					}
				} catch (error) {
					clearTimeout(timeoutId)
					throw error
				}
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error occurred',
				}
			}
		},
	})
}
