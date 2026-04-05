import { createId } from '../id'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { agents } from './agents'
import { workspaces } from './workspaces'

/**
 * Document indexing statuses.
 */
export const DOCUMENT_INDEXING_STATUSES = [
	'pending',
	'processing',
	'indexed',
	'failed',
] as const

export type DocumentIndexingStatus = (typeof DOCUMENT_INDEXING_STATUSES)[number]

/**
 * Documents table — tracks files uploaded for RAG/AI Search indexing.
 *
 * Documents are stored in R2 and tracked here for status management,
 * workspace scoping, and agent association.
 */
export const documents = sqliteTable(
	'documents',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		workspaceId: text('workspaceId')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		agentId: text('agentId').references(() => agents.id, { onDelete: 'set null' }),
		name: text('name').notNull(),
		r2Key: text('r2Key').notNull(),
		mimeType: text('mimeType').notNull(),
		sizeBytes: integer('sizeBytes').notNull(),
		indexingStatus: text('indexingStatus', { enum: DOCUMENT_INDEXING_STATUSES })
			.notNull()
			.default('pending')
			.$type<DocumentIndexingStatus>(),
		indexingError: text('indexingError'),
		chunkCount: integer('chunkCount'),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updatedAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index('documents_workspace_idx').on(table.workspaceId),
		index('documents_agent_idx').on(table.agentId),
		index('documents_workspace_status_idx').on(table.workspaceId, table.indexingStatus),
		uniqueIndex('documents_r2key_idx').on(table.r2Key),
	],
)
