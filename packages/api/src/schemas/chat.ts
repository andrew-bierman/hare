import { API_MESSAGE_ROLES, EXPORT_FORMATS, MESSAGE_ROLES } from '@hare/config'
import { z } from 'zod'
import { MetadataSchema } from './common'

/**
 * Message role enum (for API - excludes tool role).
 */
export const MessageRoleSchema = z.enum(API_MESSAGE_ROLES)

/**
 * Schema for chat request body.
 */
export const ChatRequestSchema = z
	.object({
		message: z.string().min(1),
		sessionId: z.string().nullish(),
		metadata: MetadataSchema.nullish(),
	})
	

/**
 * Message schema for API responses.
 */
export const MessageSchema = z
	.object({
		id: z.string(),
		conversationId: z.string(),
		role: MessageRoleSchema,
		content: z.string(),
		createdAt: z.string().datetime(),
	})
	

/**
 * Conversation schema for API responses.
 */
export const ConversationSchema = z
	.object({
		id: z.string(),
		agentId: z.string(),
		userId: z.string().nullable(),
		title: z.string().nullable(),
		messageCount: z.number(),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
	})
	

/**
 * Export format enum for conversation exports.
 * Supports: json (full metadata + tool calls), csv (timestamp, role, content), txt (human-readable)
 */
export const ExportFormatSchema = z
	.enum(EXPORT_FORMATS)
	.default('json')
	

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
			,
	})
	

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
	

/**
 * Query parameters for conversation search.
 */
export const ConversationSearchQuerySchema = z
	.object({
		query: z.string().min(1).max(500),
		dateFrom: z
			.string()
			.optional()
			,
		dateTo: z
			.string()
			.optional()
			,
		limit: z.coerce.number().min(1).max(100).optional().default(20),
		offset: z.coerce.number().min(0).optional().default(0),
	})
	

/**
 * Search result item with message and conversation context.
 */
export const SearchResultItemSchema = z
	.object({
		messageId: z.string(),
		conversationId: z.string(),
		conversationTitle: z.string().nullable(),
		role: MessageRoleSchema,
		content: z.string(),
		highlightedContent: z.string(),
		createdAt: z.string().datetime(),
	})
	

/**
 * Conversation search response with pagination.
 */
export const ConversationSearchResponseSchema = z
	.object({
		results: z.array(SearchResultItemSchema),
		total: z.number(),
		limit: z.number(),
		offset: z.number(),
	})
	
