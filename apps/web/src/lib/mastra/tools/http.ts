import { Tool } from '@mastra/core'

export interface HttpToolConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  timeout?: number
}

export function createHttpTool(config: HttpToolConfig): Tool {
  return {
    id: 'http-request',
    name: 'HTTP Request',
    description: 'Make HTTP requests to external APIs',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to make the request to',
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          description: 'The HTTP method to use',
          default: 'GET',
        },
        body: {
          type: 'object',
          description: 'The request body (for POST, PUT, PATCH)',
        },
        headers: {
          type: 'object',
          description: 'Additional headers to include',
        },
      },
      required: ['url'],
    },
    execute: async ({ url, method = 'GET', body, headers }) => {
      try {
        const requestHeaders = {
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
  }
}
