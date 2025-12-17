import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { VectorizeToolConfig, ToolContext } from './types'
import { generateEmbedding } from '../providers/workers-ai'

const vectorizeInputSchema = z.object({
	operation: z.enum(['search', 'insert', 'delete']).describe('The operation to perform'),
	query: z.string().optional().describe('The text to search for (for search operation)'),
	id: z.string().optional().describe('The ID of the vector (for insert/delete operations)'),
	text: z.string().optional().describe('The text to embed and store (for insert operation)'),
	metadata: z.record(z.string(), z.any()).optional().describe('Additional metadata to store with the vector'),
	topK: z.number().optional().describe('Number of results to return (for search operation)'),
	filter: z.record(z.string(), z.any()).optional().describe('Metadata filter for search results'),
})

/**
 * Create a Vectorize tool for agents.
 * Provides semantic search capabilities using Cloudflare Vectorize.
 */
export function createVectorizeTool(config: VectorizeToolConfig, ctx: ToolContext) {
	const { namespace = 'default', topK = 10 } = config.config

	// Namespace vectors by workspace for isolation
	const vectorNamespace = `${ctx.workspaceId}:${namespace}`

	return createTool({
		id: config.id,
		description: config.description || 'Semantic search and vector storage for finding similar content',
		inputSchema: vectorizeInputSchema,
		execute: async ({ context }) => {
			const { operation, query, id, text, metadata = {}, topK: searchTopK, filter } = context
			const vectorize = ctx.env.VECTORIZE
			const ai = ctx.env.AI

			if (!vectorize) {
				return { success: false, error: 'Vectorize index not available' }
			}

			if (!ai) {
				return { success: false, error: 'AI binding not available for embeddings' }
			}

			try {
				switch (operation) {
					case 'search': {
						if (!query) {
							return { success: false, error: 'Query is required for search operation' }
						}

						// Generate embedding for the query
						const embedding = await generateEmbedding(ai, query)

						// Search for similar vectors
						const results = await vectorize.query(embedding, {
							topK: searchTopK || topK,
							namespace: vectorNamespace,
							filter: filter as VectorizeVectorMetadataFilter | undefined,
							returnMetadata: 'all',
							returnValues: false,
						})

						return {
							success: true,
							matches: results.matches.map((match) => ({
								id: match.id,
								score: match.score,
								metadata: match.metadata,
							})),
							count: results.count,
						}
					}

					case 'insert': {
						if (!id) {
							return { success: false, error: 'ID is required for insert operation' }
						}
						if (!text) {
							return { success: false, error: 'Text is required for insert operation' }
						}

						// Generate embedding for the text
						const embedding = await generateEmbedding(ai, text)

						// Insert the vector
						const vector: VectorizeVector = {
							id: `${vectorNamespace}:${id}`,
							values: embedding,
							namespace: vectorNamespace,
							metadata: {
								...metadata,
								text: text.substring(0, 1000), // Store truncated text for reference
								workspaceId: ctx.workspaceId,
								insertedAt: new Date().toISOString(),
							},
						}

						await vectorize.insert([vector])

						return {
							success: true,
							id,
							inserted: true,
						}
					}

					case 'delete': {
						if (!id) {
							return { success: false, error: 'ID is required for delete operation' }
						}

						const fullId = `${vectorNamespace}:${id}`
						await vectorize.deleteByIds([fullId])

						return {
							success: true,
							id,
							deleted: true,
						}
					}

					default:
						return { success: false, error: `Unknown operation: ${operation}` }
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
