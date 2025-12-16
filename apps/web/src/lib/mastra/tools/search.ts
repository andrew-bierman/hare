import { Tool } from '@mastra/core'

export interface SearchToolConfig {
  apiKey?: string
  maxResults?: number
}

export function createSearchTool(env: CloudflareEnv, config?: SearchToolConfig): Tool {
  return {
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the web for information using Cloudflare AI',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 5,
        },
      },
      required: ['query'],
    },
    execute: async ({ query, maxResults = 5 }) => {
      try {
        // Use Cloudflare AI for web search capabilities
        // This is a placeholder implementation - Cloudflare doesn't have a direct search API
        // In production, you might use Google Custom Search, Bing Search API, or similar

        // For now, we'll use a simple approach with Cloudflare AI to generate search-like responses
        const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
          messages: [
            {
              role: 'system',
              content: 'You are a helpful search assistant. Provide relevant information about the search query based on your knowledge.',
            },
            {
              role: 'user',
              content: `Search query: ${query}. Please provide relevant information.`,
            },
          ],
        })

        return {
          success: true,
          query,
          results: [
            {
              title: `Information about: ${query}`,
              snippet: response.response || 'No information available',
              source: 'AI-generated',
            },
          ],
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Search failed',
        }
      }
    },
  }
}

// Alternative implementation using a real search API (like Brave Search)
export function createBraveSearchTool(apiKey: string, config?: SearchToolConfig): Tool {
  return {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Search the web using Brave Search API',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: config?.maxResults || 5,
        },
      },
      required: ['query'],
    },
    execute: async ({ query, maxResults = 5 }) => {
      try {
        const response = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`,
          {
            headers: {
              'X-Subscription-Token': apiKey,
              'Accept': 'application/json',
            },
          }
        )

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`)
        }

        const data = await response.json()

        return {
          success: true,
          query,
          results: data.web?.results?.map((result: any) => ({
            title: result.title,
            snippet: result.description,
            url: result.url,
            source: 'Brave Search',
          })) || [],
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Search failed',
        }
      }
    },
  }
}
