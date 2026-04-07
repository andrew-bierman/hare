/**
 * Memory Routes
 *
 * Agent vector memory operations: list, create, search, update, delete, clear.
 */

import { getErrorMessage } from '@hare/checks'
import type { Database } from '@hare/db'
import { agents } from '@hare/db/schema'
import { and, eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { CreateMemorySchema, SearchMemorySchema, UpdateMemorySchema } from '../../schemas'
import {
	deleteAgentMemories,
	deleteMemory,
	listMemories,
	searchMemory,
	storeMemoryWithEmbedding,
	updateMemory,
} from '../../services/vector-memory'
import { writePlugin } from '../context'

// =============================================================================
// Helpers
// =============================================================================

async function findAgent(options: { id: string; workspaceId: string; db: Database }) {
	const { id, workspaceId, db } = options
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, id), eq(agents.workspaceId, workspaceId)))
	return agent || null
}

// =============================================================================
// Routes
// =============================================================================

export const memoryRoutes = new Elysia({ prefix: '/memory', name: 'memory-routes' })
	.use(writePlugin)

	// List memories for an agent
	.get(
		'/:id',
		async ({ db, workspaceId, cfEnv, params, query }) => {
			const agent = await findAgent({ id: params.id, workspaceId, db })
			if (!agent) return status(404, { error: 'Agent not found' })

			const limit = Number(query?.limit) || 20
			const offset = Number(query?.offset) || 0

			const result = await listMemories({
				agentId: params.id,
				limit,
				offset,
				env: cfEnv,
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
		},
		{ writeAccess: true },
	)

	// Create a new memory
	.post(
		'/:id',
		async ({ db, workspaceId, cfEnv, params, body }) => {
			const agent = await findAgent({ id: params.id, workspaceId, db })
			if (!agent) return status(404, { error: 'Agent not found' })

			try {
				const result = await storeMemoryWithEmbedding({
					agentId: params.id,
					workspaceId,
					text: body.content,
					metadata: {
						type: body.type,
						source: body.source,
						tags: body.tags,
					},
					env: cfEnv,
				})

				const now = new Date().toISOString()

				return {
					id: result.id,
					content: body.content,
					metadata: {
						agentId: params.id,
						workspaceId,
						type: body.type || 'custom',
						source: body.source,
						createdAt: now,
						tags: body.tags,
					},
				}
			} catch (err) {
				// biome-ignore lint/suspicious/noConsole: error reporting
				console.error('Failed to store memory:', err)
				throw new Error(`Failed to store memory: ${getErrorMessage(err)}`)
			}
		},
		{ writeAccess: true, body: CreateMemorySchema },
	)

	// Semantic search across agent memories
	.post(
		'/:id/search',
		async ({ db, workspaceId, cfEnv, params, body }) => {
			const agent = await findAgent({ id: params.id, workspaceId, db })
			if (!agent) return status(404, { error: 'Agent not found' })

			const result = await searchMemory({
				agentId: params.id,
				query: body.query,
				topK: body.topK,
				filter: {
					type: body.type,
					tags: body.tags,
				},
				env: cfEnv,
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
		},
		{ writeAccess: true, body: SearchMemorySchema },
	)

	// Update a memory
	.patch(
		'/:id/:memoryId',
		async ({ db, workspaceId, cfEnv, params, body }) => {
			const agent = await findAgent({ id: params.id, workspaceId, db })
			if (!agent) return status(404, { error: 'Agent not found' })

			try {
				await updateMemory({
					memoryId: params.memoryId,
					agentId: params.id,
					workspaceId,
					text: body.content,
					metadata: {
						type: body.type,
						tags: body.tags,
					},
					env: cfEnv,
				})

				const now = new Date().toISOString()

				return {
					id: params.memoryId,
					content: body.content,
					metadata: {
						agentId: params.id,
						workspaceId,
						type: body.type || 'custom',
						createdAt: now,
						updatedAt: now,
						tags: body.tags,
					},
				}
			} catch (err) {
				// biome-ignore lint/suspicious/noConsole: error reporting
				console.error('Failed to update memory:', err)
				throw new Error(`Failed to update memory: ${getErrorMessage(err)}`)
			}
		},
		{ writeAccess: true, body: UpdateMemorySchema },
	)

	// Delete a specific memory
	.delete(
		'/:id/:memoryId',
		async ({ db, workspaceId, cfEnv, params }) => {
			const agent = await findAgent({ id: params.id, workspaceId, db })
			if (!agent) return status(404, { error: 'Agent not found' })

			await deleteMemory({
				memoryId: params.memoryId,
				agentId: params.id,
				env: cfEnv,
			})

			return { success: true }
		},
		{ writeAccess: true },
	)

	// Clear all memories for an agent
	.delete(
		'/:id',
		async ({ db, workspaceId, cfEnv, params }) => {
			const agent = await findAgent({ id: params.id, workspaceId, db })
			if (!agent) return status(404, { error: 'Agent not found' })

			const result = await deleteAgentMemories({
				agentId: params.id,
				env: cfEnv,
			})

			return { success: true, deleted: result.deleted }
		},
		{ writeAccess: true },
	)
