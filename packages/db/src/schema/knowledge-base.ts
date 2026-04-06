import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createId } from '../id'
import { agents } from './agents'
import { users } from './auth'
import { workspaces } from './workspaces'

/**
 * Knowledge Base - document storage and RAG pipeline.
 * Documents are uploaded to R2, chunked, embedded via Workers AI,
 * and stored in Vectorize for semantic search.
 */

export const DOCUMENT_STATUSES = ['pending', 'processing', 'ready', 'failed'] as const
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number]

export const DOCUMENT_TYPES = ['pdf', 'txt', 'md', 'csv', 'docx', 'html', 'json', 'url'] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

/**
 * Knowledge base collections group documents together.
 * An agent can be linked to one or more collections.
 */
export const knowledgeBases = sqliteTable(
	'knowledge_bases',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		workspaceId: text('workspaceId')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		createdBy: text('createdBy')
			.notNull()
			.references(() => users.id),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updatedAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [index('kb_workspace_idx').on(table.workspaceId)],
)

/**
 * Documents within a knowledge base.
 * Tracks upload, processing status, and chunk count.
 */
export const documents = sqliteTable(
	'documents',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		knowledgeBaseId: text('knowledgeBaseId')
			.notNull()
			.references(() => knowledgeBases.id, { onDelete: 'cascade' }),
		workspaceId: text('workspaceId')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		type: text('type', { enum: DOCUMENT_TYPES }).notNull().$type<DocumentType>(),
		status: text('status', { enum: DOCUMENT_STATUSES })
			.notNull()
			.default('pending')
			.$type<DocumentStatus>(),
		/** R2 object key for the raw file */
		r2Key: text('r2Key'),
		/** Source URL if type is 'url' */
		sourceUrl: text('sourceUrl'),
		/** File size in bytes */
		sizeBytes: integer('sizeBytes'),
		/** Number of chunks created from this document */
		chunkCount: integer('chunkCount').default(0),
		/** Number of tokens across all chunks */
		tokenCount: integer('tokenCount').default(0),
		/** Processing error message if status is 'failed' */
		error: text('error'),
		/** Processing metadata */
		metadata: text('metadata', { mode: 'json' }).$type<{
			mimeType?: string
			pageCount?: number
			wordCount?: number
			language?: string
			processingTimeMs?: number
		}>(),
		uploadedBy: text('uploadedBy')
			.notNull()
			.references(() => users.id),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updatedAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index('docs_kb_idx').on(table.knowledgeBaseId),
		index('docs_workspace_idx').on(table.workspaceId),
		index('docs_status_idx').on(table.status),
		index('docs_kb_status_idx').on(table.knowledgeBaseId, table.status),
	],
)

/**
 * Document chunks - individual text segments with embeddings.
 * The embedding vectors are stored in Vectorize; this table stores metadata.
 */
export const documentChunks = sqliteTable(
	'document_chunks',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		documentId: text('documentId')
			.notNull()
			.references(() => documents.id, { onDelete: 'cascade' }),
		knowledgeBaseId: text('knowledgeBaseId')
			.notNull()
			.references(() => knowledgeBases.id, { onDelete: 'cascade' }),
		/** Chunk index within the document (0-based) */
		chunkIndex: integer('chunkIndex').notNull(),
		/** The actual text content of this chunk */
		content: text('content').notNull(),
		/** Token count for this chunk */
		tokenCount: integer('tokenCount'),
		/** Vectorize vector ID for similarity search */
		vectorId: text('vectorId'),
		/** Source location metadata */
		metadata: text('metadata', { mode: 'json' }).$type<{
			pageNumber?: number
			section?: string
			heading?: string
		}>(),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index('chunks_document_idx').on(table.documentId),
		index('chunks_kb_idx').on(table.knowledgeBaseId),
		index('chunks_document_index_idx').on(table.documentId, table.chunkIndex),
	],
)

/**
 * Links agents to knowledge bases.
 * An agent can use multiple knowledge bases for RAG.
 */
export const agentKnowledgeBases = sqliteTable(
	'agent_knowledge_bases',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		agentId: text('agentId')
			.notNull()
			.references(() => agents.id, { onDelete: 'cascade' }),
		knowledgeBaseId: text('knowledgeBaseId')
			.notNull()
			.references(() => knowledgeBases.id, { onDelete: 'cascade' }),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index('agent_kb_agent_idx').on(table.agentId),
		index('agent_kb_kb_idx').on(table.knowledgeBaseId),
	],
)
