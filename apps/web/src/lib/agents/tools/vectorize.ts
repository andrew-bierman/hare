import { z } from 'zod'
import { createTool, success, failure, type ToolContext } from './types'
import { generateEmbedding } from '../providers/workers-ai'

/**
 * Vectorize Insert Tool - Insert vectors into a Vectorize index.
 */
export const vectorizeInsertTool = createTool({
	id: 'vectorize_insert',
	description: 'Insert a vector with metadata into the Vectorize index. Can generate embeddings from text automatically.',
	inputSchema: z.object({
		id: z.string().describe('Unique identifier for the vector'),
		text: z.string().optional().describe('Text to generate embedding from (alternative to providing vector directly)'),
		vector: z.array(z.number()).optional().describe('The vector values (if not generating from text)'),
		metadata: z.record(z.string(), z.any()).optional().describe('Additional metadata to store with the vector'),
		namespace: z.string().optional().describe('Optional namespace for organizing vectors'),
	}),
	execute: async (params, context) => {
		const vectorize = context.env.VECTORIZE
		const ai = context.env.AI
		if (!vectorize) {
			return failure('Vectorize index not available')
		}

		try {
			let values: number[]

			if (params.text) {
				if (!ai) {
					return failure('AI binding required for text embedding')
				}
				values = await generateEmbedding({ ai, text: params.text })
			} else if (params.vector) {
				values = params.vector
			} else {
				return failure('Either text or vector must be provided')
			}

			const vectorEntry: VectorizeVector = {
				id: params.id,
				values,
				metadata: params.metadata,
			}

			if (params.namespace) {
				vectorEntry.namespace = params.namespace
			}

			await vectorize.insert([vectorEntry])
			return success({
				id: params.id,
				inserted: true,
				dimensions: values.length,
			})
		} catch (error) {
			return failure(`Failed to insert vector: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Vectorize Query Tool - Search for similar vectors.
 */
export const vectorizeQueryTool = createTool({
	id: 'vectorize_query',
	description: 'Search for vectors similar to a query. Can search by text or vector.',
	inputSchema: z.object({
		text: z.string().optional().describe('Text to search for (will be converted to embedding)'),
		vector: z.array(z.number()).optional().describe('Query vector (if not searching by text)'),
		topK: z.number().optional().default(10).describe('Number of results to return'),
		namespace: z.string().optional().describe('Namespace to search within'),
		filter: z.record(z.string(), z.any()).optional().describe('Metadata filter for search results'),
		returnMetadata: z.enum(['none', 'indexed', 'all']).optional().default('all').describe('What metadata to return'),
		returnValues: z.boolean().optional().default(false).describe('Whether to return vector values'),
	}),
	execute: async (params, context) => {
		const vectorize = context.env.VECTORIZE
		const ai = context.env.AI
		if (!vectorize) {
			return failure('Vectorize index not available')
		}

		try {
			let queryVector: number[]

			if (params.text) {
				if (!ai) {
					return failure('AI binding required for text search')
				}
				queryVector = await generateEmbedding({ ai, text: params.text })
			} else if (params.vector) {
				queryVector = params.vector
			} else {
				return failure('Either text or vector must be provided')
			}

			const options: VectorizeQueryOptions = {
				topK: params.topK,
				returnMetadata: params.returnMetadata,
				returnValues: params.returnValues,
			}

			if (params.namespace) {
				options.namespace = params.namespace
			}
			if (params.filter) {
				options.filter = params.filter
			}

			const results = await vectorize.query(queryVector, options)
			return success({
				matches: results.matches.map((match) => ({
					id: match.id,
					score: match.score,
					metadata: match.metadata,
					values: match.values,
				})),
				count: results.count,
			})
		} catch (error) {
			return failure(`Vector query failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Vectorize Delete Tool - Delete vectors by ID.
 */
export const vectorizeDeleteTool = createTool({
	id: 'vectorize_delete',
	description: 'Delete vectors from the Vectorize index by their IDs.',
	inputSchema: z.object({
		ids: z.array(z.string()).describe('Array of vector IDs to delete'),
		namespace: z.string().optional().describe('Namespace containing the vectors'),
	}),
	execute: async (params, context) => {
		const vectorize = context.env.VECTORIZE
		if (!vectorize) {
			return failure('Vectorize index not available')
		}

		try {
			await vectorize.deleteByIds(params.ids)
			return success({
				deleted: true,
				ids: params.ids,
			})
		} catch (error) {
			return failure(`Failed to delete vectors: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Vectorize Get Tool - Retrieve vectors by ID.
 */
export const vectorizeGetTool = createTool({
	id: 'vectorize_get',
	description: 'Retrieve specific vectors by their IDs.',
	inputSchema: z.object({
		ids: z.array(z.string()).describe('Array of vector IDs to retrieve'),
		namespace: z.string().optional().describe('Namespace containing the vectors'),
	}),
	execute: async (params, context) => {
		const vectorize = context.env.VECTORIZE
		if (!vectorize) {
			return failure('Vectorize index not available')
		}

		try {
			const results = await vectorize.getByIds(params.ids)
			return success({
				vectors: results.map((v) => ({
					id: v.id,
					values: v.values,
					metadata: v.metadata,
				})),
				count: results.length,
			})
		} catch (error) {
			return failure(`Failed to get vectors: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Get all Vectorize tools.
 */
export function getVectorizeTools(_context: ToolContext) {
	return [vectorizeInsertTool, vectorizeQueryTool, vectorizeDeleteTool, vectorizeGetTool]
}
