import { z } from 'zod'
import { createTool, failure, success, type ToolContext } from './types'

/**
 * AI Search Tool - Search using Cloudflare AutoRAG/AI Search.
 * Retrieves relevant results from indexed data sources.
 * Results are automatically scoped to the current workspace.
 */
export const aiSearchTool = createTool({
	id: 'ai_search',
	description:
		'Search through indexed documents and data using AI-powered semantic search. Returns relevant results from your workspace knowledge base.',
	inputSchema: z.object({
		query: z.string().describe('The search query'),
		maxResults: z.number().optional().default(10).describe('Maximum number of results (1-50)'),
		rewriteQuery: z
			.boolean()
			.optional()
			.default(true)
			.describe('Optimize query for better retrieval'),
		scoreThreshold: z.number().optional().default(0.5).describe('Minimum relevance score (0-1)'),
	}),
	execute: async (params, context) => {
		const ai = context.env.AI
		if (!ai) {
			return failure('AI binding not available')
		}

		// Check if autorag method exists
		if (!('autorag' in ai)) {
			return failure(
				'AI Search (AutoRAG) not configured. Set up AI Search in Cloudflare dashboard first.',
			)
		}

		try {
			// Get the AutoRAG instance - uses the configured instance name
			// The instance name should match what's set up in Cloudflare dashboard
			const autorag = (ai as Ai & { autorag: (name: string) => AutoRAG }).autorag('hare-search')

			const results = await autorag.search({
				query: params.query,
				max_num_results: params.maxResults,
				rewrite_query: params.rewriteQuery,
				ranking_options: {
					score_threshold: params.scoreThreshold,
				},
				// Filter by workspace for multi-tenant isolation
				// Documents must be indexed with workspaceId in their metadata
				filters: {
					key: 'workspaceId',
					type: 'eq',
					value: context.workspaceId,
				},
			})

			return success({
				query: params.query,
				results: results.data.map((result) => ({
					content: result.content.map((c) => c.text).join('\n'),
					filename: result.filename,
					score: result.score,
				})),
				count: results.data.length,
			})
		} catch (error) {
			return failure(
				`AI Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * AI Search with Answer Tool - Search and generate an answer using AutoRAG.
 * Combines retrieval with AI-generated response.
 * Results are automatically scoped to the current workspace.
 */
export const aiSearchAnswerTool = createTool({
	id: 'ai_search_answer',
	description:
		'Search through indexed documents and generate an AI answer based on the retrieved context. Best for question-answering. Only searches your workspace data.',
	inputSchema: z.object({
		query: z.string().describe('The question or search query'),
		maxResults: z.number().optional().default(10).describe('Maximum context results (1-50)'),
		systemPrompt: z.string().optional().describe('Custom system prompt for the AI response'),
	}),
	execute: async (params, context) => {
		const ai = context.env.AI
		if (!ai) {
			return failure('AI binding not available')
		}

		if (!('autorag' in ai)) {
			return failure(
				'AI Search (AutoRAG) not configured. Set up AI Search in Cloudflare dashboard first.',
			)
		}

		try {
			const autorag = (ai as Ai & { autorag: (name: string) => AutoRAG }).autorag('hare-search')

			const response = await autorag.aiSearch({
				query: params.query,
				max_num_results: params.maxResults,
				rewrite_query: true,
				// Filter by workspace for multi-tenant isolation
				filters: {
					key: 'workspaceId',
					type: 'eq',
					value: context.workspaceId,
				},
				...(params.systemPrompt && { system_prompt: params.systemPrompt }),
			})

			return success({
				query: params.query,
				answer: response.response,
				sources: response.data.map((result) => ({
					content: result.content.map((c) => c.text).join('\n'),
					filename: result.filename,
					score: result.score,
				})),
				sourceCount: response.data.length,
			})
		} catch (error) {
			return failure(
				`AI Search Answer failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Get all search tools.
 */
export function getSearchTools(_context: ToolContext) {
	return [aiSearchTool, aiSearchAnswerTool]
}
