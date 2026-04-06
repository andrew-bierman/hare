import { z } from '@hono/zod-openapi'

/**
 * Knowledge base schemas for document upload, management, and RAG search.
 */

export const DocumentTypeSchema = z
	.enum(['pdf', 'txt', 'md', 'csv', 'docx', 'html', 'json', 'url'])
	.openapi({ example: 'pdf' })

export const DocumentStatusSchema = z
	.enum(['pending', 'processing', 'ready', 'failed'])
	.openapi({ example: 'ready' })

export const KnowledgeBaseSchema = z
	.object({
		id: z.string().openapi({ example: 'kb_abc123' }),
		workspaceId: z.string(),
		name: z.string(),
		description: z.string().nullable(),
		documentCount: z.number().int().optional(),
		totalChunks: z.number().int().optional(),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
	})
	.openapi('KnowledgeBase')

export const CreateKnowledgeBaseSchema = z
	.object({
		name: z
			.string()
			.min(1, 'Name is required')
			.max(100, 'Name must be at most 100 characters')
			.trim()
			.openapi({ example: 'Product Documentation' }),
		description: z
			.string()
			.max(500, 'Description must be at most 500 characters')
			.optional()
			.openapi({ example: 'All product docs and FAQs' }),
	})
	.openapi('CreateKnowledgeBase')

export const DocumentSchema = z
	.object({
		id: z.string().openapi({ example: 'doc_abc123' }),
		knowledgeBaseId: z.string(),
		name: z.string(),
		type: DocumentTypeSchema,
		status: DocumentStatusSchema,
		sizeBytes: z.number().int().nullable(),
		chunkCount: z.number().int().nullable(),
		tokenCount: z.number().int().nullable(),
		error: z.string().nullable(),
		metadata: z
			.object({
				mimeType: z.string().optional(),
				pageCount: z.number().int().optional(),
				wordCount: z.number().int().optional(),
				language: z.string().optional(),
				processingTimeMs: z.number().optional(),
			})
			.nullable(),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
	})
	.openapi('Document')

export const AddDocumentUrlSchema = z
	.object({
		knowledgeBaseId: z.string().openapi({ example: 'kb_abc123' }),
		url: z.string().url('Must be a valid URL').openapi({ example: 'https://docs.example.com/faq' }),
		name: z
			.string()
			.max(255, 'Name must be at most 255 characters')
			.optional()
			.openapi({ description: 'Display name (defaults to URL)' }),
	})
	.openapi('AddDocumentUrl')

export const KnowledgeSearchSchema = z
	.object({
		knowledgeBaseId: z.string().openapi({ example: 'kb_abc123' }),
		query: z
			.string()
			.min(1, 'Query is required')
			.max(1000)
			.openapi({ example: 'How do I reset my password?' }),
		limit: z.number().int().min(1).max(20).optional().default(5),
	})
	.openapi('KnowledgeSearch')

export const KnowledgeSearchResultSchema = z
	.object({
		chunkId: z.string(),
		documentId: z.string(),
		documentName: z.string(),
		content: z.string(),
		score: z.number(),
		metadata: z
			.object({
				pageNumber: z.number().int().optional(),
				section: z.string().optional(),
				heading: z.string().optional(),
			})
			.nullable(),
	})
	.openapi('KnowledgeSearchResult')
