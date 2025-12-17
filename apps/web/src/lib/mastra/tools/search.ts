import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export interface SearchToolConfig {
	apiKey?: string
	maxResults?: number
}

const searchInputSchema = z.object({
	query: z.string().describe('The search query'),
	maxResults: z.number().optional().default(5).describe('Maximum number of results to return'),
})

/**
 * Create a search tool using Cloudflare AI.
 * This is a placeholder implementation that uses AI to generate search-like responses.
 */
export function createSearchTool(env: CloudflareEnv) {
	return createTool({
		id: 'web-search',
		description: 'Search the web for information using Cloudflare AI',
		inputSchema: searchInputSchema,
		execute: async ({ context }) => {
			const { query, maxResults = 5 } = context

			try {
				// Use Cloudflare AI for web search capabilities
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

				// Handle the response which could be a string or an object with response property
				const responseText = typeof response === 'string' ? response : (response as { response?: string }).response || 'No information available'

				return {
					success: true,
					query,
					results: [
						{
							title: `Information about: ${query}`,
							snippet: responseText,
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
	})
}

const braveSearchInputSchema = z.object({
	query: z.string().describe('The search query'),
	maxResults: z.number().optional().default(5).describe('Maximum number of results to return'),
})

interface BraveSearchResult {
	title: string
	description: string
	url: string
}

interface BraveSearchResponse {
	web?: {
		results?: BraveSearchResult[]
	}
}

/**
 * Create a Brave Search tool for real web search.
 */
export function createBraveSearchTool(apiKey: string, config?: SearchToolConfig) {
	return createTool({
		id: 'brave-search',
		description: 'Search the web using Brave Search API',
		inputSchema: braveSearchInputSchema,
		execute: async ({ context }) => {
			const { query, maxResults = config?.maxResults || 5 } = context

			try {
				const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`, {
					headers: {
						'X-Subscription-Token': apiKey,
						Accept: 'application/json',
					},
				})

				if (!response.ok) {
					throw new Error(`Search failed: ${response.statusText}`)
				}

				const data = (await response.json()) as BraveSearchResponse

				return {
					success: true,
					query,
					results:
						data.web?.results?.map((result) => ({
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
	})
}
