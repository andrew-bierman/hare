/**
 * Memory Tools
 *
 * Tools for agent long-term memory using Cloudflare Vectorize.
 * Enables agents to store and recall information semantically.
 *
 * Note: These tools require both AI and VECTORIZE bindings to be configured.
 */

import { z } from 'zod'
import { createTool, failure, success, type HareEnv, type ToolContext, type ToolResult } from './types'

/**
 * Memory type options for categorization.
 */
const MemoryTypeSchema = z
	.enum(['fact', 'context', 'preference', 'conversation', 'custom'])
	.describe('Type of memory to store')

type MemoryType = z.infer<typeof MemoryTypeSchema>

/**
 * Helper to check required bindings for memory tools.
 */
function requireMemoryBindings(
	context: ToolContext<HareEnv>,
): context is ToolContext<HareEnv & { AI: Ai; VECTORIZE: VectorizeIndex }> {
	return context.env.AI !== undefined && context.env.VECTORIZE !== undefined
}

/**
 * Generate an embedding for text using Workers AI.
 */
async function generateEmbedding(ai: Ai, text: string): Promise<number[]> {
	const response = await ai.run('@cf/baai/bge-base-en-v1.5', { text: [text] })
	const data = response as { data: number[][] }
	if (!data.data?.[0]) {
		throw new Error('Failed to generate embedding')
	}
	return data.data[0]
}

/**
 * Memory metadata stored with each vector.
 */
interface MemoryMetadata {
	content: string
	type: MemoryType
	agentId: string
	workspaceId: string
	createdAt: string
	tags?: string[]
	source?: string
}

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
			.default(5)
			.describe('Number of memories to retrieve'),
		type: MemoryTypeSchema.optional().describe('Filter by memory type'),
		tags: z.array(z.string()).optional().describe('Filter by specific tags'),
	}),
	execute: async (params, context): Promise<ToolResult<unknown>> => {
		try {
			if (!requireMemoryBindings(context)) {
				return failure(
					'Memory tools require AI and VECTORIZE bindings. Please configure these in your wrangler.toml.',
				)
			}

			const { query, topK, type, tags } = params
			const agentId = context.workspaceId

			// Generate embedding for the query
			const queryVector = await generateEmbedding(context.env.AI, query)

			// Build filter for Vectorize query
			const filter: VectorizeVectorMetadataFilter = { agentId }
			if (type) filter.type = type
			// Note: Vectorize filter doesn't support array values, so we filter tags client-side

			// Query Vectorize
			const results = await context.env.VECTORIZE.query(queryVector, {
				topK: (topK ?? 5) * (tags && tags.length > 0 ? 3 : 1), // Fetch more if we need to filter by tags
				filter,
				returnMetadata: 'all',
			})

			if (!results.matches || results.matches.length === 0) {
				return success({
					found: false,
					message: 'No relevant memories found for this query.',
					query,
					memories: [] as Array<{
						id: string
						content: string
						type: MemoryType
						relevance: number | undefined
						createdAt: string
						tags: string[] | undefined
					}>,
				})
			}

			// Format memories for the agent
			const formattedMemories = results.matches.map((match) => {
				const metadata = match.metadata as MemoryMetadata | undefined
				return {
					id: match.id,
					content: metadata?.content || '',
					type: (metadata?.type || 'custom') as MemoryType,
					relevance: match.score ? Math.round(match.score * 100) : undefined,
					createdAt: metadata?.createdAt || new Date().toISOString(),
					tags: metadata?.tags,
				}
			})

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
			.max(5000)
			.describe('The information to remember. Be specific and include relevant context.'),
		type: MemoryTypeSchema.optional()
			.default('custom')
			.describe('Category of memory (fact, context, preference, conversation, custom)'),
		tags: z.array(z.string()).max(10).optional().describe('Tags for categorization and filtering'),
		source: z.string().optional().describe('Source of this information (e.g., conversation ID)'),
	}),
	execute: async (params, context) => {
		try {
			if (!requireMemoryBindings(context)) {
				return failure(
					'Memory tools require AI and VECTORIZE bindings. Please configure these in your wrangler.toml.',
				)
			}

			const { content, type, tags, source } = params
			const agentId = context.workspaceId
			const memoryId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

			// Generate embedding for the content
			const embedding = await generateEmbedding(context.env.AI, content)

			// Prepare metadata
			const metadata: MemoryMetadata = {
				content,
				type: type ?? 'custom',
				agentId,
				workspaceId: context.workspaceId,
				createdAt: new Date().toISOString(),
				tags,
				source,
			}

			// Insert into Vectorize
			// Cast metadata to the expected type - Vectorize accepts any JSON-serializable metadata
			await context.env.VECTORIZE.insert([
				{
					id: memoryId,
					values: embedding,
					metadata: metadata as unknown as Record<string, VectorizeVectorMetadata>,
				},
			])

			return success({
				stored: true,
				memoryId,
				type: type ?? 'custom',
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
export function getMemoryTools(_context: ToolContext<HareEnv>) {
	return [recallMemoryTool, storeMemoryTool]
}
