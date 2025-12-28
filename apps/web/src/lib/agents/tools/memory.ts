/**
 * Memory Tools
 *
 * Tools for agent long-term memory using Cloudflare Vectorize.
 * Enables agents to store and recall information semantically.
 */

import { searchMemory, storeMemoryWithEmbedding } from '@hare/api/services'
import { z } from 'zod'
import { MEMORY_CONTENT_MAX_LENGTH, MEMORY_DEFAULT_TOP_K } from './constants'
import { createTool, failure, success, type ToolContext } from './types'

/**
 * Memory type options for categorization.
 */
const MemoryTypeSchema = z
	.enum(['fact', 'context', 'preference', 'conversation', 'custom'])
	.describe('Type of memory to store')

/**
 * Recall Memory Tool
 *
 * Search the agent's long-term memory using semantic similarity.
 * Returns the most relevant memories based on the query.
 */
export const recallMemoryTool = createTool({
	id: 'recall_memory',
	description:
		'Search your long-term memory for relevant information. Use this to recall facts, context, user preferences, or past conversations that may be helpful.',
	inputSchema: z.object({
		query: z
			.string()
			.min(1)
			.max(1000)
			.describe('What to search for in memory (natural language query)'),
		topK: z
			.number()
			.min(1)
			.max(20)
			.optional()
			.default(MEMORY_DEFAULT_TOP_K)
			.describe('Number of memories to retrieve'),
		type: MemoryTypeSchema.optional().describe('Filter by memory type'),
		tags: z.array(z.string()).optional().describe('Filter by specific tags'),
	}),
	execute: async (params, context) => {
		try {
			const { query, topK, type, tags } = params

			// Get agentId from context - this should be set by the agent runtime
			// For now, we use workspaceId as a fallback identifier
			const agentId = (context as ToolContext & { agentId?: string }).agentId || context.workspaceId

			const result = await searchMemory({
				agentId,
				query,
				topK,
				filter: {
					type,
					tags,
				},
				env: context.env,
			})

			if (result.memories.length === 0) {
				return success({
					found: false,
					message: 'No relevant memories found for this query.',
					query,
					memories: [],
				})
			}

			// Format memories for the agent
			const formattedMemories = result.memories.map((memory) => ({
				id: memory.id,
				content: memory.content,
				type: memory.metadata.type,
				relevance: memory.score ? Math.round(memory.score * 100) : undefined,
				createdAt: memory.metadata.createdAt,
				tags: memory.metadata.tags,
			}))

			return success({
				found: true,
				count: formattedMemories.length,
				query,
				memories: formattedMemories,
			})
		} catch (error) {
			return failure(
				`Failed to recall memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Store Memory Tool
 *
 * Save important information to long-term memory for later recall.
 * The content is embedded and stored in Vectorize for semantic search.
 */
export const storeMemoryTool = createTool({
	id: 'store_memory',
	description:
		'Store important information in long-term memory. Use this to remember facts, user preferences, context, or key points from conversations that should be recalled later.',
	inputSchema: z.object({
		content: z
			.string()
			.min(1)
			.max(MEMORY_CONTENT_MAX_LENGTH)
			.describe('The information to remember. Be specific and include relevant context.'),
		type: MemoryTypeSchema.optional()
			.default('custom')
			.describe('Category of memory (fact, context, preference, conversation, custom)'),
		tags: z.array(z.string()).max(10).optional().describe('Tags for categorization and filtering'),
		source: z.string().optional().describe('Source of this information (e.g., conversation ID)'),
	}),
	execute: async (params, context) => {
		try {
			const { content, type, tags, source } = params

			// Get agentId from context
			const agentId = (context as ToolContext & { agentId?: string }).agentId || context.workspaceId

			const result = await storeMemoryWithEmbedding({
				agentId,
				workspaceId: context.workspaceId,
				text: content,
				metadata: {
					type,
					tags,
					source,
				},
				env: context.env,
			})

			return success({
				stored: true,
				memoryId: result.id,
				type,
				contentLength: content.length,
				message: 'Memory stored successfully. It will be available for future recall.',
			})
		} catch (error) {
			return failure(
				`Failed to store memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Get all memory tools.
 */
export function getMemoryTools(_context: ToolContext) {
	return [recallMemoryTool, storeMemoryTool]
}
