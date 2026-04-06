/**
 * oRPC Knowledge Base Router
 *
 * Handles knowledge base CRUD, document management, and RAG search.
 */

import { agentKnowledgeBases, documents, knowledgeBases } from '@hare/db/schema'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
	CreateKnowledgeBaseSchema,
	DocumentSchema,
	IdParamSchema,
	KnowledgeBaseSchema,
	SuccessSchema,
} from '../../schemas'
import { notFound, requireWrite, serverError } from '../base'

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
// Procedures
// =============================================================================

/**
 * List all knowledge bases in workspace
 */
export const list = requireWrite
	.route({ method: 'GET', path: '/knowledge-bases' })
	.output(z.object({ knowledgeBases: z.array(KnowledgeBaseSchema) }))
	.handler(async ({ context }) => {
		const { db, workspaceId } = context

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
	})

/**
 * Create a knowledge base
 */
export const create = requireWrite
	.route({ method: 'POST', path: '/knowledge-bases', successStatus: 201 })
	.input(CreateKnowledgeBaseSchema)
	.output(KnowledgeBaseSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId, user } = context

		const [kb] = await db
			.insert(knowledgeBases)
			.values({
				workspaceId,
				name: input.name,
				description: input.description,
				createdBy: user.id,
			})
			.returning()

		if (!kb) serverError('Failed to create knowledge base')

		return serializeKnowledgeBase(kb)
	})

/**
 * Get a knowledge base by ID
 */
export const get = requireWrite
	.route({ method: 'GET', path: '/knowledge-bases/{id}' })
	.input(IdParamSchema)
	.output(KnowledgeBaseSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const [kb] = await db
			.select()
			.from(knowledgeBases)
			.where(and(eq(knowledgeBases.id, input.id), eq(knowledgeBases.workspaceId, workspaceId)))

		if (!kb) notFound('Knowledge base not found')

		const [docStats] = await db
			.select({
				count: count(),
				chunks: sql<number>`COALESCE(SUM(${documents.chunkCount}), 0)`,
			})
			.from(documents)
			.where(eq(documents.knowledgeBaseId, kb.id))

		return serializeKnowledgeBase(kb, docStats?.count ?? 0, docStats?.chunks ?? 0)
	})

/**
 * Delete a knowledge base
 */
export const remove = requireWrite
	.route({ method: 'DELETE', path: '/knowledge-bases/{id}' })
	.input(IdParamSchema)
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const result = await db
			.delete(knowledgeBases)
			.where(and(eq(knowledgeBases.id, input.id), eq(knowledgeBases.workspaceId, workspaceId)))
			.returning()

		if (result.length === 0) notFound('Knowledge base not found')

		return { success: true }
	})

/**
 * List documents in a knowledge base
 */
export const listDocuments = requireWrite
	.route({ method: 'GET', path: '/knowledge-bases/{id}/documents' })
	.input(IdParamSchema)
	.output(z.object({ documents: z.array(DocumentSchema) }))
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		// Verify KB belongs to workspace
		const [kb] = await db
			.select()
			.from(knowledgeBases)
			.where(and(eq(knowledgeBases.id, input.id), eq(knowledgeBases.workspaceId, workspaceId)))
		if (!kb) notFound('Knowledge base not found')

		const results = await db
			.select()
			.from(documents)
			.where(eq(documents.knowledgeBaseId, input.id))
			.orderBy(desc(documents.createdAt))

		return { documents: results.map(serializeDocument) }
	})

/**
 * Add a URL document to a knowledge base
 */
export const addUrl = requireWrite
	.route({ method: 'POST', path: '/knowledge-bases/{id}/documents/url', successStatus: 201 })
	.input(
		IdParamSchema.extend({
			url: z.string().url(),
			name: z.string().max(255).optional(),
		}),
	)
	.output(DocumentSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId, user } = context

		// Verify KB belongs to workspace
		const [kb] = await db
			.select()
			.from(knowledgeBases)
			.where(and(eq(knowledgeBases.id, input.id), eq(knowledgeBases.workspaceId, workspaceId)))
		if (!kb) notFound('Knowledge base not found')

		const [doc] = await db
			.insert(documents)
			.values({
				knowledgeBaseId: input.id,
				workspaceId,
				name: input.name || input.url,
				type: 'url',
				status: 'pending',
				sourceUrl: input.url,
				uploadedBy: user.id,
			})
			.returning()

		if (!doc) serverError('Failed to add document')

		// TODO: Trigger async processing pipeline
		// 1. Fetch URL content
		// 2. Extract text
		// 3. Chunk text
		// 4. Generate embeddings via Workers AI
		// 5. Store in Vectorize
		// 6. Update document status to 'ready'

		return serializeDocument(doc)
	})

/**
 * Delete a document
 */
export const removeDocument = requireWrite
	.route({ method: 'DELETE', path: '/knowledge-bases/{id}/documents/{documentId}' })
	.input(
		IdParamSchema.extend({
			documentId: z.string(),
		}),
	)
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const result = await db
			.delete(documents)
			.where(
				and(
					eq(documents.id, input.documentId),
					eq(documents.knowledgeBaseId, input.id),
					eq(documents.workspaceId, workspaceId),
				),
			)
			.returning()

		if (result.length === 0) notFound('Document not found')

		// TODO: Remove vectors from Vectorize

		return { success: true }
	})

/**
 * Link a knowledge base to an agent
 */
export const linkToAgent = requireWrite
	.route({ method: 'POST', path: '/knowledge-bases/{id}/agents' })
	.input(
		IdParamSchema.extend({
			agentId: z.string(),
		}),
	)
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		// Verify both KB and agent belong to workspace
		const [kb] = await db
			.select()
			.from(knowledgeBases)
			.where(and(eq(knowledgeBases.id, input.id), eq(knowledgeBases.workspaceId, workspaceId)))
		if (!kb) notFound('Knowledge base not found')

		const { agents } = await import('@hare/db/schema')
		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, input.agentId), eq(agents.workspaceId, workspaceId)))
		if (!agent) notFound('Agent not found')

		// Prevent duplicates
		const [existing] = await db
			.select()
			.from(agentKnowledgeBases)
			.where(
				and(
					eq(agentKnowledgeBases.agentId, input.agentId),
					eq(agentKnowledgeBases.knowledgeBaseId, input.id),
				),
			)
		if (existing) return { success: true }

		await db.insert(agentKnowledgeBases).values({
			agentId: input.agentId,
			knowledgeBaseId: input.id,
		})

		return { success: true }
	})

/**
 * Unlink a knowledge base from an agent
 */
export const unlinkFromAgent = requireWrite
	.route({ method: 'DELETE', path: '/knowledge-bases/{id}/agents/{agentId}' })
	.input(
		IdParamSchema.extend({
			agentId: z.string(),
		}),
	)
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		// Verify KB belongs to workspace
		const [kb] = await db
			.select()
			.from(knowledgeBases)
			.where(and(eq(knowledgeBases.id, input.id), eq(knowledgeBases.workspaceId, workspaceId)))
		if (!kb) notFound('Knowledge base not found')

		await db
			.delete(agentKnowledgeBases)
			.where(
				and(
					eq(agentKnowledgeBases.knowledgeBaseId, input.id),
					eq(agentKnowledgeBases.agentId, input.agentId),
				),
			)

		return { success: true }
	})

// =============================================================================
// Router Export
// =============================================================================

export const knowledgeBaseRouter = {
	list,
	create,
	get,
	delete: remove,
	listDocuments,
	addUrl,
	removeDocument,
	linkToAgent,
	unlinkFromAgent,
}
