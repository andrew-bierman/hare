/**
 * Knowledge Base Routes
 *
 * Knowledge base CRUD, document management, and agent linking.
 */

import { agentKnowledgeBases, agents, documents, knowledgeBases } from '@hare/db/schema'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { z } from 'zod'
import {
	CreateKnowledgeBaseSchema,
	type DocumentSchema,
	type KnowledgeBaseSchema,
} from '../../schemas'
import { writePlugin } from '../context'

// =============================================================================
// Helpers
// =============================================================================

function serializeKnowledgeBase(
	kb: typeof knowledgeBases.$inferSelect,
	documentCount?: number,
	totalChunks?: number,
): z.infer<typeof KnowledgeBaseSchema> {
	return {
		id: kb.id,
		workspaceId: kb.workspaceId,
		name: kb.name,
		description: kb.description,
		documentCount: documentCount ?? 0,
		totalChunks: totalChunks ?? 0,
		createdAt: kb.createdAt.toISOString(),
		updatedAt: kb.updatedAt.toISOString(),
	}
}

function serializeDocument(doc: typeof documents.$inferSelect): z.infer<typeof DocumentSchema> {
	return {
		id: doc.id,
		knowledgeBaseId: doc.knowledgeBaseId,
		name: doc.name,
		type: doc.type as z.infer<typeof DocumentSchema>['type'],
		status: doc.status as z.infer<typeof DocumentSchema>['status'],
		sizeBytes: doc.sizeBytes,
		chunkCount: doc.chunkCount,
		tokenCount: doc.tokenCount,
		error: doc.error,
		metadata: doc.metadata as z.infer<typeof DocumentSchema>['metadata'],
		createdAt: doc.createdAt.toISOString(),
		updatedAt: doc.updatedAt.toISOString(),
	}
}

// =============================================================================
// Routes
// =============================================================================

export const knowledgeBaseRoutes = new Elysia({
	prefix: '/knowledge-base',
	name: 'knowledge-base-routes',
})
	.use(writePlugin)

	// List all knowledge bases in workspace
	.get(
		'/',
		async ({ db, workspaceId }) => {
			const results = await db
				.select()
				.from(knowledgeBases)
				.where(eq(knowledgeBases.workspaceId, workspaceId))
				.orderBy(desc(knowledgeBases.createdAt))

			// Batch get doc counts
			const kbIds = results.map((kb) => kb.id)
			const docCounts =
				kbIds.length > 0
					? await db
							.select({
								knowledgeBaseId: documents.knowledgeBaseId,
								count: count(),
								chunks: sql<number>`COALESCE(SUM(${documents.chunkCount}), 0)`,
							})
							.from(documents)
							.where(
								sql`${documents.knowledgeBaseId} IN (${sql.join(
									kbIds.map((id) => sql`${id}`),
									sql`, `,
								)})`,
							)
							.groupBy(documents.knowledgeBaseId)
					: []

			const countMap = new Map(docCounts.map((d) => [d.knowledgeBaseId, d]))

			return {
				knowledgeBases: results.map((kb) => {
					const counts = countMap.get(kb.id)
					return serializeKnowledgeBase(kb, counts?.count ?? 0, counts?.chunks ?? 0)
				}),
			}
		},
		{ writeAccess: true },
	)

	// Create a knowledge base
	.post(
		'/',
		async ({ db, workspaceId, user, body }) => {
			const [kb] = await db
				.insert(knowledgeBases)
				.values({
					workspaceId,
					name: body.name,
					description: body.description,
					createdBy: user.id,
				})
				.returning()

			if (!kb) throw new Error('Failed to create knowledge base')

			return serializeKnowledgeBase(kb)
		},
		{ writeAccess: true, body: CreateKnowledgeBaseSchema },
	)

	// Get a knowledge base by ID
	.get(
		'/:id',
		async ({ db, workspaceId, params }) => {
			const [kb] = await db
				.select()
				.from(knowledgeBases)
				.where(and(eq(knowledgeBases.id, params.id), eq(knowledgeBases.workspaceId, workspaceId)))

			if (!kb) return status(404, { error: 'Knowledge base not found' })

			const [docStats] = await db
				.select({
					count: count(),
					chunks: sql<number>`COALESCE(SUM(${documents.chunkCount}), 0)`,
				})
				.from(documents)
				.where(eq(documents.knowledgeBaseId, kb.id))

			return serializeKnowledgeBase(kb, docStats?.count ?? 0, docStats?.chunks ?? 0)
		},
		{ writeAccess: true },
	)

	// Delete a knowledge base
	.delete(
		'/:id',
		async ({ db, workspaceId, params }) => {
			const result = await db
				.delete(knowledgeBases)
				.where(and(eq(knowledgeBases.id, params.id), eq(knowledgeBases.workspaceId, workspaceId)))
				.returning()

			if (result.length === 0) return status(404, { error: 'Knowledge base not found' })

			return { success: true }
		},
		{ writeAccess: true },
	)

	// List documents in a knowledge base
	.get(
		'/:id/documents',
		async ({ db, workspaceId, params }) => {
			// Verify KB belongs to workspace
			const [kb] = await db
				.select()
				.from(knowledgeBases)
				.where(and(eq(knowledgeBases.id, params.id), eq(knowledgeBases.workspaceId, workspaceId)))
			if (!kb) return status(404, { error: 'Knowledge base not found' })

			const results = await db
				.select()
				.from(documents)
				.where(eq(documents.knowledgeBaseId, params.id))
				.orderBy(desc(documents.createdAt))

			return { documents: results.map(serializeDocument) }
		},
		{ writeAccess: true },
	)

	// Add a URL document to a knowledge base
	.post(
		'/:id/documents/url',
		async ({ db, workspaceId, user, params, body }) => {
			// Verify KB belongs to workspace
			const [kb] = await db
				.select()
				.from(knowledgeBases)
				.where(and(eq(knowledgeBases.id, params.id), eq(knowledgeBases.workspaceId, workspaceId)))
			if (!kb) return status(404, { error: 'Knowledge base not found' })

			const [doc] = await db
				.insert(documents)
				.values({
					knowledgeBaseId: params.id,
					workspaceId,
					name: body.name || body.url,
					type: 'url',
					status: 'pending',
					sourceUrl: body.url,
					uploadedBy: user.id,
				})
				.returning()

			if (!doc) throw new Error('Failed to add document')

			// TODO: Trigger async processing pipeline
			// 1. Fetch URL content
			// 2. Extract text
			// 3. Chunk text
			// 4. Generate embeddings via Workers AI
			// 5. Store in Vectorize
			// 6. Update document status to 'ready'

			return serializeDocument(doc)
		},
		{
			writeAccess: true,
			body: z.object({
				url: z.string().url(),
				name: z.string().max(255).optional(),
			}),
		},
	)

	// Delete a document
	.delete(
		'/:id/documents/:documentId',
		async ({ db, workspaceId, params }) => {
			const result = await db
				.delete(documents)
				.where(
					and(
						eq(documents.id, params.documentId),
						eq(documents.knowledgeBaseId, params.id),
						eq(documents.workspaceId, workspaceId),
					),
				)
				.returning()

			if (result.length === 0) return status(404, { error: 'Document not found' })

			// TODO: Remove vectors from Vectorize

			return { success: true }
		},
		{ writeAccess: true },
	)

	// Link a knowledge base to an agent
	.post(
		'/:id/agents',
		async ({ db, workspaceId, params, body }) => {
			// Verify both KB and agent belong to workspace
			const [kb] = await db
				.select()
				.from(knowledgeBases)
				.where(and(eq(knowledgeBases.id, params.id), eq(knowledgeBases.workspaceId, workspaceId)))
			if (!kb) return status(404, { error: 'Knowledge base not found' })

			const [agent] = await db
				.select()
				.from(agents)
				.where(and(eq(agents.id, body.agentId), eq(agents.workspaceId, workspaceId)))
			if (!agent) return status(404, { error: 'Agent not found' })

			// Prevent duplicates
			const [existing] = await db
				.select()
				.from(agentKnowledgeBases)
				.where(
					and(
						eq(agentKnowledgeBases.agentId, body.agentId),
						eq(agentKnowledgeBases.knowledgeBaseId, params.id),
					),
				)
			if (existing) return { success: true }

			await db.insert(agentKnowledgeBases).values({
				agentId: body.agentId,
				knowledgeBaseId: params.id,
			})

			return { success: true }
		},
		{
			writeAccess: true,
			body: z.object({ agentId: z.string() }),
		},
	)

	// Unlink a knowledge base from an agent
	.delete(
		'/:id/agents/:agentId',
		async ({ db, workspaceId, params }) => {
			// Verify KB belongs to workspace
			const [kb] = await db
				.select()
				.from(knowledgeBases)
				.where(and(eq(knowledgeBases.id, params.id), eq(knowledgeBases.workspaceId, workspaceId)))
			if (!kb) return status(404, { error: 'Knowledge base not found' })

			await db
				.delete(agentKnowledgeBases)
				.where(
					and(
						eq(agentKnowledgeBases.knowledgeBaseId, params.id),
						eq(agentKnowledgeBases.agentId, params.agentId),
					),
				)

			return { success: true }
		},
		{ writeAccess: true },
	)
