/**
 * Memory API Routes
 *
 * Endpoints for managing agent vector memory:
 * - GET /api/agents/:id/memories - List memories for agent
 * - POST /api/agents/:id/memories - Add new memory
 * - POST /api/agents/:id/memories/search - Semantic search
 * - DELETE /api/agents/:id/memories/:memoryId - Delete memory
 */

import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { agents } from '@hare/db'
import { getCloudflareEnv, getDb } from '../db'
import { commonResponses, requireWriteAccess } from '../helpers'
import { authMiddleware, workspaceMiddleware } from '../middleware'
import { ErrorSchema, SuccessSchema } from '../schemas'
import {
	deleteAgentMemories,
	deleteMemory,
	listMemories,
	searchMemory,
	storeMemoryWithEmbedding,
	updateMemory,
} from '../services/vector-memory'
import type { WorkspaceEnv } from '@hare/types'

// =============================================================================
// Schemas
// =============================================================================

const MemoryTypeSchema = z
	.enum(['fact', 'context', 'preference', 'conversation', 'custom'])
	.describe('Type of memory')

const MemorySchema = z
	.object({
		id: z.string().describe('Unique memory ID'),
		content: z.string().describe('Memory content text'),
		metadata: z
			.object({
				agentId: z.string(),
				workspaceId: z.string(),
				type: MemoryTypeSchema,
				source: z.string().optional(),
				createdAt: z.string(),
				updatedAt: z.string().optional(),
				tags: z.array(z.string()).optional(),
			})
			.describe('Memory metadata'),
		score: z.number().optional().describe('Similarity score (for search results)'),
	})
	.openapi('Memory')

const CreateMemorySchema = z
	.object({
		content: z.string().min(1).max(10000).describe('Memory content to store'),
		type: MemoryTypeSchema.optional().default('custom'),
		source: z.string().optional().describe('Source of this memory (e.g., conversation ID)'),
		tags: z.array(z.string()).optional().describe('Tags for categorization'),
	})
	.openapi('CreateMemory')

const UpdateMemorySchema = z
	.object({
		content: z.string().min(1).max(10000).describe('Updated memory content'),
		type: MemoryTypeSchema.optional(),
		tags: z.array(z.string()).optional().describe('Updated tags'),
	})
	.openapi('UpdateMemory')

const SearchMemorySchema = z
	.object({
		query: z.string().min(1).max(1000).describe('Search query for semantic matching'),
		topK: z.number().min(1).max(100).optional().default(5).describe('Number of results to return'),
		type: MemoryTypeSchema.optional().describe('Filter by memory type'),
		tags: z.array(z.string()).optional().describe('Filter by tags'),
	})
	.openapi('SearchMemory')

const MemoryListResponseSchema = z
	.object({
		memories: z.array(MemorySchema),
		total: z.number().describe('Total number of memories'),
		limit: z.number().describe('Page size'),
		offset: z.number().describe('Page offset'),
	})
	.openapi('MemoryListResponse')

const SearchResultSchema = z
	.object({
		memories: z.array(MemorySchema),
		query: z.string(),
		topK: z.number(),
	})
	.openapi('SearchResult')

// =============================================================================
// Route Definitions
// =============================================================================

const listMemoriesRoute = createRoute({
	method: 'get',
	path: '/{id}/memories',
	tags: ['Memory'],
	summary: 'List agent memories',
	description: 'Get a paginated list of memories stored for an agent',
	request: {
		params: z.object({
			id: z.string().describe('Agent ID'),
		}),
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
			limit: z.coerce.number().min(1).max(100).optional().default(20).describe('Page size'),
			offset: z.coerce.number().min(0).optional().default(0).describe('Page offset'),
		}),
	},
	responses: {
		200: {
			description: 'List of memories',
			content: {
				'application/json': {
					schema: MemoryListResponseSchema,
				},
			},
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const createMemoryRoute = createRoute({
	method: 'post',
	path: '/{id}/memories',
	tags: ['Memory'],
	summary: 'Store new memory',
	description: 'Store a new memory with automatic embedding generation',
	request: {
		params: z.object({
			id: z.string().describe('Agent ID'),
		}),
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: CreateMemorySchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: 'Memory created successfully',
			content: {
				'application/json': {
					schema: MemorySchema,
				},
			},
		},
		403: {
			description: 'Write access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		500: {
			description: 'Failed to store memory',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const searchMemoriesRoute = createRoute({
	method: 'post',
	path: '/{id}/memories/search',
	tags: ['Memory'],
	summary: 'Search memories',
	description: 'Perform semantic search across agent memories',
	request: {
		params: z.object({
			id: z.string().describe('Agent ID'),
		}),
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: SearchMemorySchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Search results',
			content: {
				'application/json': {
					schema: SearchResultSchema,
				},
			},
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const deleteMemoryRoute = createRoute({
	method: 'delete',
	path: '/{id}/memories/{memoryId}',
	tags: ['Memory'],
	summary: 'Delete memory',
	description: 'Delete a specific memory from the agent',
	request: {
		params: z.object({
			id: z.string().describe('Agent ID'),
			memoryId: z.string().describe('Memory ID'),
		}),
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'Memory deleted successfully',
			content: {
				'application/json': {
					schema: SuccessSchema,
				},
			},
		},
		403: {
			description: 'Write access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Agent or memory not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const updateMemoryRoute = createRoute({
	method: 'patch',
	path: '/{id}/memories/{memoryId}',
	tags: ['Memory'],
	summary: 'Update memory',
	description: 'Update a memory content and re-generate its embedding',
	request: {
		params: z.object({
			id: z.string().describe('Agent ID'),
			memoryId: z.string().describe('Memory ID'),
		}),
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: UpdateMemorySchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Memory updated successfully',
			content: {
				'application/json': {
					schema: MemorySchema,
				},
			},
		},
		403: {
			description: 'Write access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Agent or memory not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		500: {
			description: 'Failed to update memory',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const clearMemoriesRoute = createRoute({
	method: 'delete',
	path: '/{id}/memories',
	tags: ['Memory'],
	summary: 'Clear all memories',
	description: 'Delete all memories for an agent',
	request: {
		params: z.object({
			id: z.string().describe('Agent ID'),
		}),
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'All memories cleared',
			content: {
				'application/json': {
					schema: z.object({
						success: z.boolean(),
						deleted: z.number().describe('Number of memories deleted'),
					}),
				},
			},
		},
		403: {
			description: 'Write access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

// =============================================================================
// Route Handlers
// =============================================================================

const baseApp = new OpenAPIHono<WorkspaceEnv>()

// Apply middleware
baseApp.use('*', authMiddleware)
baseApp.use('*', workspaceMiddleware)

/**
 * Helper to find agent by ID and workspace.
 */
async function findAgentByIdAndWorkspace(
	db: Awaited<ReturnType<typeof getDb>>,
	id: string,
	workspaceId: string,
) {
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, id), eq(agents.workspaceId, workspaceId)))
	return agent || null
}

// List memories
const app = baseApp.openapi(listMemoriesRoute, async (c) => {
	const { id } = c.req.valid('param')
	const { limit, offset } = c.req.valid('query')
	const db = getDb(c)
	const env = getCloudflareEnv(c)
	const workspace = c.get('workspace')

	const agent = await findAgentByIdAndWorkspace(db, id, workspace.id)
	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	const result = await listMemories({
		agentId: id,
		limit,
		offset,
		env,
	})

	return c.json(
		{
			memories: result.memories,
			total: result.total,
			limit,
			offset,
		},
		200,
	)
})
// Create memory
.openapi(createMemoryRoute, async (c) => {
	const { id } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = getDb(c)
	const env = getCloudflareEnv(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireWriteAccess(role)

	const agent = await findAgentByIdAndWorkspace(db, id, workspace.id)
	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	try {
		const result = await storeMemoryWithEmbedding({
			agentId: id,
			workspaceId: workspace.id,
			text: data.content,
			metadata: {
				type: data.type,
				source: data.source,
				tags: data.tags,
			},
			env,
		})

		const now = new Date().toISOString()

		return c.json(
			{
				id: result.id,
				content: data.content,
				metadata: {
					agentId: id,
					workspaceId: workspace.id,
					type: data.type || 'custom',
					source: data.source,
					createdAt: now,
					tags: data.tags,
				},
			},
			201,
		)
	} catch (error) {
		console.error('Failed to store memory:', error)
		return c.json(
			{
				error: `Failed to store memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			500,
		)
	}
})
// Search memories
.openapi(searchMemoriesRoute, async (c) => {
	const { id } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = getDb(c)
	const env = getCloudflareEnv(c)
	const workspace = c.get('workspace')

	const agent = await findAgentByIdAndWorkspace(db, id, workspace.id)
	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	const result = await searchMemory({
		agentId: id,
		query: data.query,
		topK: data.topK,
		filter: {
			type: data.type,
			tags: data.tags,
		},
		env,
	})

	return c.json(result, 200)
})
// Delete memory
.openapi(deleteMemoryRoute, async (c) => {
	const { id, memoryId } = c.req.valid('param')
	const db = getDb(c)
	const env = getCloudflareEnv(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireWriteAccess(role)

	const agent = await findAgentByIdAndWorkspace(db, id, workspace.id)
	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	await deleteMemory({
		memoryId,
		agentId: id,
		env,
	})

	return c.json({ success: true }, 200)
})
// Update memory
.openapi(updateMemoryRoute, async (c) => {
	const { id, memoryId } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = getDb(c)
	const env = getCloudflareEnv(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireWriteAccess(role)

	const agent = await findAgentByIdAndWorkspace(db, id, workspace.id)
	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	try {
		await updateMemory({
			memoryId,
			agentId: id,
			workspaceId: workspace.id,
			text: data.content,
			metadata: {
				type: data.type,
				tags: data.tags,
			},
			env,
		})

		const now = new Date().toISOString()

		return c.json(
			{
				id: memoryId,
				content: data.content,
				metadata: {
					agentId: id,
					workspaceId: workspace.id,
					type: data.type || 'custom',
					createdAt: now, // We don't preserve original createdAt here
					updatedAt: now,
					tags: data.tags,
				},
			},
			200,
		)
	} catch (error) {
		console.error('Failed to update memory:', error)
		return c.json(
			{
				error: `Failed to update memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			500,
		)
	}
})
// Clear all memories
.openapi(clearMemoriesRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = getDb(c)
	const env = getCloudflareEnv(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireWriteAccess(role)

	const agent = await findAgentByIdAndWorkspace(db, id, workspace.id)
	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	const result = await deleteAgentMemories({
		agentId: id,
		env,
	})

	return c.json({ success: true, deleted: result.deleted }, 200)
})

export default app
