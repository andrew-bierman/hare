/**
 * Vector Memory Service
 *
 * Provides semantic search capabilities for agent memory using:
 * - Workers AI for generating embeddings
 * - Cloudflare Vectorize for vector storage and search
 */

import type { CloudflareEnv } from '@hare/types'
import { z } from 'zod'

// =============================================================================
// Types
// =============================================================================

/**
 * Embedding model to use for generating vectors.
 * BGE models from BAAI are available on Workers AI.
 */
export const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5' as const satisfies keyof AiModels

/**
 * Embedding dimension for bge-base-en-v1.5 model.
 */
export const EMBEDDING_DIMENSIONS = 768

/**
 * Maximum number of results for Vectorize queries.
 * This is the maximum allowed by Cloudflare Vectorize.
 */
export const MAX_VECTORIZE_TOP_K = 1000

/**
 * Default pagination limit for memory listing.
 */
export const DEFAULT_MEMORY_PAGE_SIZE = 20

/**
 * Memory metadata schema.
 */
export const MemoryMetadataSchema = z.object({
	agentId: z.string(),
	workspaceId: z.string(),
	type: z.enum(['fact', 'context', 'preference', 'conversation', 'custom']).default('custom'),
	source: z.string().optional(),
	createdAt: z.string(),
	updatedAt: z.string().optional(),
	tags: z.array(z.string()).optional(),
})

export type MemoryMetadata = z.infer<typeof MemoryMetadataSchema>

/**
 * Memory entry with content and metadata.
 */
export interface Memory {
	id: string
	content: string
	metadata: MemoryMetadata
	score?: number
}

/**
 * Result of embedding generation.
 */
export interface EmbeddingResult {
	embedding: number[]
	dimensions: number
	model: string
}

/**
 * Result of memory search.
 */
export interface SearchResult {
	memories: Memory[]
	query: string
	topK: number
}

/**
 * Result of memory storage.
 */
export interface StoreResult {
	id: string
	stored: boolean
}

// =============================================================================
// Embedding Generation
// =============================================================================

/**
 * Generate an embedding for the given text using Workers AI.
 */
export async function embedMessage(options: {
	text: string
	env: CloudflareEnv
}): Promise<EmbeddingResult> {
	const { text, env } = options

	const response = (await env.AI.run(EMBEDDING_MODEL, {
		text: [text],
	})) as { data: number[][] }

	// Workers AI returns { data: number[][] }
	const embedding = response.data[0]
	if (!embedding) {
		throw new Error('Failed to generate embedding: empty response')
	}

	return {
		embedding,
		dimensions: embedding.length,
		model: EMBEDDING_MODEL,
	}
}

/**
 * Generate embeddings for multiple texts in batch.
 */
export async function embedBatch(options: {
	texts: string[]
	env: CloudflareEnv
}): Promise<EmbeddingResult[]> {
	const { texts, env } = options

	if (texts.length === 0) {
		return []
	}

	const response = (await env.AI.run(EMBEDDING_MODEL, {
		text: texts,
	})) as { data: number[][] }

	return response.data.map((embedding: number[]) => ({
		embedding,
		dimensions: embedding.length,
		model: EMBEDDING_MODEL,
	}))
}

// =============================================================================
// Memory Storage
// =============================================================================

/**
 * Store a memory in Vectorize with its embedding.
 */
export async function storeMemory(options: {
	agentId: string
	workspaceId: string
	text: string
	embedding: number[]
	metadata?: Partial<MemoryMetadata>
	env: CloudflareEnv
}): Promise<StoreResult> {
	const { agentId, workspaceId, text, embedding, metadata = {}, env } = options

	// Generate unique ID for this memory
	const id = crypto.randomUUID()
	const now = new Date().toISOString()

	// Build complete metadata
	const fullMetadata: MemoryMetadata = {
		agentId,
		workspaceId,
		type: metadata.type || 'custom',
		source: metadata.source,
		createdAt: now,
		updatedAt: now,
		tags: metadata.tags,
	}

	// Store in Vectorize
	// Vectorize expects vectors in the format: { id, values, metadata }
	await env.VECTORIZE.upsert([
		{
			id,
			values: embedding,
			metadata: {
				...fullMetadata,
				content: text,
			},
		},
	])

	return {
		id,
		stored: true,
	}
}

/**
 * Store a memory with automatic embedding generation.
 */
export async function storeMemoryWithEmbedding(options: {
	agentId: string
	workspaceId: string
	text: string
	metadata?: Partial<MemoryMetadata>
	env: CloudflareEnv
}): Promise<StoreResult> {
	const { agentId, workspaceId, text, metadata, env } = options

	// Generate embedding
	const { embedding } = await embedMessage({ text, env })

	// Store with embedding
	return storeMemory({
		agentId,
		workspaceId,
		text,
		embedding,
		metadata,
		env,
	})
}

// =============================================================================
// Memory Search
// =============================================================================

/**
 * Search memories using semantic similarity.
 */
export async function searchMemory(options: {
	agentId: string
	query: string
	topK?: number
	filter?: {
		type?: MemoryMetadata['type']
		tags?: string[]
	}
	env: CloudflareEnv
}): Promise<SearchResult> {
	const { agentId, query, topK = 5, filter, env } = options

	// Generate embedding for query
	const { embedding } = await embedMessage({ text: query, env })

	// Build filter for Vectorize query
	// Vectorize uses metadata filtering with the format: { [key]: value } or { [key]: { $eq: value } }
	const metadataFilter: VectorizeVectorMetadataFilter = {
		agentId: { $eq: agentId },
	}

	if (filter?.type) {
		metadataFilter.type = { $eq: filter.type }
	}

	// Search Vectorize
	const results = await env.VECTORIZE.query(embedding, {
		topK,
		filter: metadataFilter,
		returnMetadata: 'all',
	})

	// Map results to Memory format
	const memories: Memory[] = results.matches.map((match) => {
		const metadata = match.metadata as Record<string, unknown>
		return {
			id: match.id,
			content: (metadata.content as string) || '',
			metadata: {
				agentId: (metadata.agentId as string) || agentId,
				workspaceId: (metadata.workspaceId as string) || '',
				type: (metadata.type as MemoryMetadata['type']) || 'custom',
				source: metadata.source as string | undefined,
				createdAt: (metadata.createdAt as string) || '',
				updatedAt: metadata.updatedAt as string | undefined,
				tags: metadata.tags as string[] | undefined,
			},
			score: match.score,
		}
	})

	// Filter by tags if specified (Vectorize may not support array filtering)
	const filteredMemories = filter?.tags
		? memories.filter((m) => m.metadata.tags?.some((t) => filter.tags?.includes(t)))
		: memories

	return {
		memories: filteredMemories,
		query,
		topK,
	}
}

// =============================================================================
// Memory Management
// =============================================================================

/**
 * Delete a memory from Vectorize.
 */
export async function deleteMemory(options: {
	memoryId: string
	agentId: string
	env: CloudflareEnv
}): Promise<{ deleted: boolean }> {
	const { memoryId, env } = options

	// Vectorize delete by IDs
	await env.VECTORIZE.deleteByIds([memoryId])

	return { deleted: true }
}

/**
 * Delete all memories for an agent.
 */
export async function deleteAgentMemories(options: {
	agentId: string
	env: CloudflareEnv
}): Promise<{ deleted: number }> {
	const { agentId, env } = options

	// Unfortunately Vectorize doesn't support bulk delete by metadata filter
	// We need to query first, then delete by IDs
	// Use a dummy query to get all vectors with this agentId
	const dummyEmbedding = new Array(EMBEDDING_DIMENSIONS).fill(0)

	const results = await env.VECTORIZE.query(dummyEmbedding, {
		topK: MAX_VECTORIZE_TOP_K,
		filter: { agentId: { $eq: agentId } },
		returnMetadata: 'none',
	})

	if (results.matches.length === 0) {
		return { deleted: 0 }
	}

	const ids = results.matches.map((m) => m.id)
	await env.VECTORIZE.deleteByIds(ids)

	return { deleted: ids.length }
}

/**
 * List memories for an agent (paginated).
 */
export async function listMemories(options: {
	agentId: string
	limit?: number
	offset?: number
	env: CloudflareEnv
}): Promise<{ memories: Memory[]; total: number }> {
	const { agentId, limit = DEFAULT_MEMORY_PAGE_SIZE, offset = 0, env } = options

	// Use a dummy embedding to query by metadata filter
	const dummyEmbedding = new Array(EMBEDDING_DIMENSIONS).fill(0)

	// Query more than needed to handle offset
	const results = await env.VECTORIZE.query(dummyEmbedding, {
		topK: Math.min(limit + offset, MAX_VECTORIZE_TOP_K),
		filter: { agentId: { $eq: agentId } },
		returnMetadata: 'all',
	})

	// Map and slice for pagination
	const allMemories: Memory[] = results.matches.map((match) => {
		const metadata = match.metadata as Record<string, unknown>
		return {
			id: match.id,
			content: (metadata.content as string) || '',
			metadata: {
				agentId: (metadata.agentId as string) || agentId,
				workspaceId: (metadata.workspaceId as string) || '',
				type: (metadata.type as MemoryMetadata['type']) || 'custom',
				source: metadata.source as string | undefined,
				createdAt: (metadata.createdAt as string) || '',
				updatedAt: metadata.updatedAt as string | undefined,
				tags: metadata.tags as string[] | undefined,
			},
			score: match.score,
		}
	})

	// Sort by createdAt descending (newest first)
	allMemories.sort(
		(a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime(),
	)

	// Apply pagination
	const paginatedMemories = allMemories.slice(offset, offset + limit)

	return {
		memories: paginatedMemories,
		total: results.matches.length,
	}
}

/**
 * Update a memory's content and re-embed.
 */
export async function updateMemory(options: {
	memoryId: string
	agentId: string
	workspaceId: string
	text: string
	metadata?: Partial<MemoryMetadata>
	env: CloudflareEnv
}): Promise<StoreResult> {
	const { memoryId, agentId, workspaceId, text, metadata = {}, env } = options

	// Generate new embedding
	const { embedding } = await embedMessage({ text, env })

	const now = new Date().toISOString()

	// Build complete metadata
	const fullMetadata: MemoryMetadata = {
		agentId,
		workspaceId,
		type: metadata.type || 'custom',
		source: metadata.source,
		createdAt: metadata.createdAt || now,
		updatedAt: now,
		tags: metadata.tags,
	}

	// Upsert will update if ID exists
	await env.VECTORIZE.upsert([
		{
			id: memoryId,
			values: embedding,
			metadata: {
				...fullMetadata,
				content: text,
			},
		},
	])

	return {
		id: memoryId,
		stored: true,
	}
}
