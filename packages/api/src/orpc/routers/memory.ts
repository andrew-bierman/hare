/**
 * oRPC Memory Router
 *
 * Handles agent vector memory operations with full type safety.
 */

import { agents } from '@hare/db/schema'
import { and, eq } from 'drizzle-orm'
import {
	ClearMemoriesResponseSchema,
	CreateMemorySchema,
	IdParamSchema,
	MemoryIdParamSchema,
	MemoryListQuerySchema,
	MemoryListResponseSchema,
	MemorySchema,
	SearchMemorySchema,
	SearchResultSchema,
	SuccessSchema,
	UpdateMemorySchema,
} from '../../schemas'
import {
	deleteAgentMemories,
	deleteMemory,
	listMemories,
	searchMemory,
	storeMemoryWithEmbedding,
	updateMemory,
} from '../../services/vector-memory'
import { notFound, requireWrite, serverError, type WorkspaceContext } from '../base'

// =============================================================================
// Helpers
// =============================================================================

async function findAgent(id: string, workspaceId: string, db: WorkspaceContext['db']) {
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, id), eq(agents.workspaceId, workspaceId)))
	return agent || null
}

// =============================================================================
// Procedures
// =============================================================================

/**
 * List memories for an agent with pagination
 */
export const list = requireWrite
	.route({ method: 'GET', path: '/agents/{id}/memories' })
	.input(IdParamSchema.merge(MemoryListQuerySchema))
	.output(MemoryListResponseSchema)
	.handler(async ({ input, context }) => {
		const { id, limit, offset } = input
		const { db, workspaceId, env } = context

		const agent = await findAgent(id, workspaceId, db)
		if (!agent) notFound('Agent not found')

		const result = await listMemories({
			agentId: id,
			limit,
			offset,
			env,
		})

		return {
			memories: result.memories.map((m) => ({
				id: m.id,
				content: m.content,
				metadata: {
					agentId: m.metadata.agentId,
					workspaceId: m.metadata.workspaceId,
					type: m.metadata.type,
					source: m.metadata.source,
					createdAt: m.metadata.createdAt,
					updatedAt: m.metadata.updatedAt,
					tags: m.metadata.tags,
				},
				score: m.score,
			})),
			total: result.total,
			limit,
			offset,
		}
	})

/**
 * Create a new memory with automatic embedding generation
 */
export const create = requireWrite
	.route({ method: 'POST', path: '/agents/{id}/memories', successStatus: 201 })
	.input(IdParamSchema.merge(CreateMemorySchema))
	.output(MemorySchema)
	.handler(async ({ input, context }) => {
		const { id, content, type, source, tags } = input
		const { db, workspaceId, env } = context

		const agent = await findAgent(id, workspaceId, db)
		if (!agent) notFound('Agent not found')

		try {
			const result = await storeMemoryWithEmbedding({
				agentId: id,
				workspaceId,
				text: content,
				metadata: {
					type,
					source,
					tags,
				},
				env,
			})

			const now = new Date().toISOString()

			return {
				id: result.id,
				content,
				metadata: {
					agentId: id,
					workspaceId,
					type: type || 'custom',
					source,
					createdAt: now,
					tags,
				},
			}
		} catch (error) {
			console.error('Failed to store memory:', error)
			serverError(
				`Failed to store memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	})

/**
 * Semantic search across agent memories
 */
export const search = requireWrite
	.route({ method: 'POST', path: '/agents/{id}/memories/search' })
	.input(IdParamSchema.merge(SearchMemorySchema))
	.output(SearchResultSchema)
	.handler(async ({ input, context }) => {
		const { id, query, topK, type, tags } = input
		const { db, workspaceId, env } = context

		const agent = await findAgent(id, workspaceId, db)
		if (!agent) notFound('Agent not found')

		const result = await searchMemory({
			agentId: id,
			query,
			topK,
			filter: {
				type,
				tags,
			},
			env,
		})

		return {
			memories: result.memories.map((m) => ({
				id: m.id,
				content: m.content,
				metadata: {
					agentId: m.metadata.agentId,
					workspaceId: m.metadata.workspaceId,
					type: m.metadata.type,
					source: m.metadata.source,
					createdAt: m.metadata.createdAt,
					updatedAt: m.metadata.updatedAt,
					tags: m.metadata.tags,
				},
				score: m.score,
			})),
			query: result.query,
			topK: result.topK,
		}
	})

/**
 * Delete a specific memory
 */
export const remove = requireWrite
	.route({ method: 'DELETE', path: '/agents/{id}/memories/{memoryId}' })
	.input(MemoryIdParamSchema)
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { id, memoryId } = input
		const { db, workspaceId, env } = context

		const agent = await findAgent(id, workspaceId, db)
		if (!agent) notFound('Agent not found')

		await deleteMemory({
			memoryId,
			agentId: id,
			env,
		})

		return { success: true }
	})

/**
 * Update a memory's content and re-generate its embedding
 */
export const update = requireWrite
	.route({ method: 'PATCH', path: '/agents/{id}/memories/{memoryId}' })
	.input(MemoryIdParamSchema.merge(UpdateMemorySchema))
	.output(MemorySchema)
	.handler(async ({ input, context }) => {
		const { id, memoryId, content, type, tags } = input
		const { db, workspaceId, env } = context

		const agent = await findAgent(id, workspaceId, db)
		if (!agent) notFound('Agent not found')

		try {
			await updateMemory({
				memoryId,
				agentId: id,
				workspaceId,
				text: content,
				metadata: {
					type,
					tags,
				},
				env,
			})

			const now = new Date().toISOString()

			return {
				id: memoryId,
				content,
				metadata: {
					agentId: id,
					workspaceId,
					type: type || 'custom',
					createdAt: now, // We don't preserve original createdAt here
					updatedAt: now,
					tags,
				},
			}
		} catch (error) {
			console.error('Failed to update memory:', error)
			serverError(
				`Failed to update memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	})

/**
 * Clear all memories for an agent
 */
export const clear = requireWrite
	.route({ method: 'DELETE', path: '/agents/{id}/memories' })
	.input(IdParamSchema)
	.output(ClearMemoriesResponseSchema)
	.handler(async ({ input, context }) => {
		const { id } = input
		const { db, workspaceId, env } = context

		const agent = await findAgent(id, workspaceId, db)
		if (!agent) notFound('Agent not found')

		const result = await deleteAgentMemories({
			agentId: id,
			env,
		})

		return { success: true, deleted: result.deleted }
	})

// =============================================================================
// Router Export
// =============================================================================

export const memoryRouter = {
	list,
	create,
	search,
	delete: remove,
	update,
	clear,
}
