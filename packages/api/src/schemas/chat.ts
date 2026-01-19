import { z } from '@hono/zod-openapi'
import { API_MESSAGE_ROLES, EXPORT_FORMATS, MESSAGE_ROLES } from '@hare/config'
import { MetadataSchema } from './common'

/**
 * Message role enum (for API - excludes tool role).
 */
export const MessageRoleSchema = z.enum(API_MESSAGE_ROLES).openapi({ example: 'user' })

/**
 * Schema for chat request body.
 */
export const ChatRequestSchema = z
	.object({
		message: z.string().min(1).openapi({ example: 'Hello, how are you?' }),
		sessionId: z.string().nullish().openapi({ example: 'session_abc123' }),
		metadata: MetadataSchema.nullish().openapi({ example: { userId: 'user_123' } }),
	})
	.openapi('ChatRequest')

/**
 * Message schema for API responses.
 */
export const MessageSchema = z
	.object({
		id: z.string().openapi({ example: 'msg_abc123' }),
		conversationId: z.string().openapi({ example: 'conv_xyz789' }),
		role: MessageRoleSchema,
		content: z.string().openapi({ example: 'Hello! How can I help you?' }),
		createdAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
	})
	.openapi('Message')

/**
 * Conversation schema for API responses.
 */
export const ConversationSchema = z
	.object({
		id: z.string().openapi({ example: 'conv_xyz789' }),
		agentId: z.string().openapi({ example: 'agent_abc123' }),
		userId: z.string().nullable().openapi({ example: 'user_abc123' }),
		title: z.string().nullable().openapi({ example: 'Chat about features' }),
		messageCount: z.number().openapi({ example: 5 }),
		createdAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
		updatedAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
	})
	.openapi('Conversation')

/**
 * Export format enum for conversation exports.
 */
export const ExportFormatSchema = z.enum(EXPORT_FORMATS).default('json').openapi({ example: 'json' })

/**
 * Export query parameters schema.
 */
export const ExportQuerySchema = z
	.object({
		format: ExportFormatSchema.optional(),
		includeMetadata: z
			.string()
			.transform((v) => v === 'true')
			.optional()
			.openapi({ example: 'true', description: 'Include message metadata in export' }),
	})
	.openapi('ExportQuery')

/**
 * Exported message schema with optional metadata.
 */
export const ExportedMessageSchema = z
	.object({
		id: z.string(),
		role: z.enum(MESSAGE_ROLES),
		content: z.string(),
		createdAt: z.string().datetime(),
		metadata: z.record(z.string(), z.unknown()).optional(),
	})
	.openapi('ExportedMessage')

/**
 * Full conversation export schema (JSON format).
 */
export const ConversationExportSchema = z
	.object({
		id: z.string(),
		title: z.string().nullable(),
		agentId: z.string(),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
		messageCount: z.number(),
		messages: z.array(ExportedMessageSchema),
		exportedAt: z.string().datetime(),
	})
	.openapi('ConversationExport')

/**
 * Query parameters for conversation search.
 */
export const ConversationSearchQuerySchema = z
	.object({
		query: z.string().min(1).max(500).openapi({
			example: 'hello world',
			description: 'Full-text search query for message content',
		}),
		dateFrom: z
			.string()
			.optional()
			.openapi({ example: '2024-01-01T00:00:00Z', description: 'Filter messages from this date' }),
		dateTo: z
			.string()
			.optional()
			.openapi({ example: '2024-12-31T23:59:59Z', description: 'Filter messages until this date' }),
		limit: z.coerce.number().min(1).max(100).optional().default(20).openapi({
			example: 20,
			description: 'Maximum number of results to return',
		}),
		offset: z.coerce.number().min(0).optional().default(0).openapi({
			example: 0,
			description: 'Number of results to skip for pagination',
		}),
	})
	.openapi('ConversationSearchQuery')

/**
 * Search result item with message and conversation context.
 */
export const SearchResultItemSchema = z
	.object({
		messageId: z.string().openapi({ example: 'msg_abc123' }),
		conversationId: z.string().openapi({ example: 'conv_xyz789' }),
		conversationTitle: z.string().nullable().openapi({ example: 'Chat about features' }),
		role: MessageRoleSchema,
		content: z.string().openapi({ example: 'Hello! How can I help you?' }),
		highlightedContent: z.string().openapi({
			example: '...matching text with <mark>highlighted</mark> query...',
			description: 'Content with matching text highlighted using <mark> tags',
		}),
		createdAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
	})
	.openapi('SearchResultItem')

/**
 * Conversation search response with pagination.
 */
export const ConversationSearchResponseSchema = z
	.object({
		results: z.array(SearchResultItemSchema),
		total: z.number().openapi({ example: 42 }),
		limit: z.number().openapi({ example: 20 }),
		offset: z.number().openapi({ example: 0 }),
	})
	.openapi('ConversationSearchResponse')
