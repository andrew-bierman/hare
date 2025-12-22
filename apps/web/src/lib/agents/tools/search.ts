import { z } from 'zod'
import { generateEmbedding } from '../providers/workers-ai'
import { createTool, failure, success, type ToolContext } from './types'

/**
 * Semantic Search Tool - Search using vector embeddings.
 */
export const semanticSearchTool = createTool({
	id: 'semantic_search',
	description:
		'Perform semantic search using vector embeddings. Finds content similar in meaning to the query.',
	inputSchema: z.object({
		query: z.string().describe('The search query text'),
		topK: z.number().optional().default(10).describe('Number of results to return'),
		namespace: z.string().optional().describe('Namespace to search within'),
		filter: z.record(z.string(), z.any()).optional().describe('Metadata filter for results'),
		threshold: z.number().optional().default(0.7).describe('Minimum similarity score (0-1)'),
	}),
	execute: async (params, context) => {
		const vectorize = context.env.VECTORIZE
		const ai = context.env.AI
		if (!vectorize) {
			return failure('Vectorize index not available')
		}
		if (!ai) {
			return failure('AI binding required for semantic search')
		}

		try {
			// Generate embedding for query
			const queryVector = await generateEmbedding(ai, params.query)

			// Search vectorize
			const options: VectorizeQueryOptions = {
				topK: params.topK,
				returnMetadata: 'all',
			}
			if (params.namespace) options.namespace = params.namespace
			if (params.filter) options.filter = params.filter

			const results = await vectorize.query(queryVector, options)

			// Filter by threshold
			const filteredMatches = results.matches.filter((m) => m.score >= params.threshold)

			return success({
				query: params.query,
				results: filteredMatches.map((match) => ({
					id: match.id,
					score: match.score,
					metadata: match.metadata,
				})),
				totalFound: filteredMatches.length,
			})
		} catch (error) {
			return failure(
				`Semantic search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Memory Search Tool - Search conversation history.
 */
export const memorySearchTool = createTool({
	id: 'memory_search',
	description: 'Search through conversation history and stored memories.',
	inputSchema: z.object({
		query: z.string().describe('What to search for in memory'),
		conversationId: z.string().optional().describe('Limit search to a specific conversation'),
		limit: z.number().optional().default(10).describe('Maximum results to return'),
	}),
	execute: async (params, context) => {
		const vectorize = context.env.VECTORIZE
		const ai = context.env.AI
		if (!vectorize || !ai) {
			return failure('Vectorize and AI bindings required for memory search')
		}

		try {
			const queryVector = await generateEmbedding(ai, params.query)

			const filter: VectorizeVectorMetadataFilter = {}
			if (params.conversationId) {
				filter.conversationId = params.conversationId
			}

			const results = await vectorize.query(queryVector, {
				topK: params.limit,
				returnMetadata: 'all',
				namespace: context.workspaceId,
				filter: Object.keys(filter).length > 0 ? filter : undefined,
			})

			return success({
				query: params.query,
				memories: results.matches.map((match) => ({
					id: match.id,
					score: match.score,
					role: match.metadata?.role,
					content: match.metadata?.content,
					conversationId: match.metadata?.conversationId,
					createdAt: match.metadata?.createdAt,
				})),
				count: results.count,
			})
		} catch (error) {
			return failure(
				`Memory search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Get all search tools.
 */
export function getSearchTools(_context: ToolContext) {
	return [semanticSearchTool, memorySearchTool]
}
