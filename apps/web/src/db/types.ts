/**
 * Database type definitions for tool interactions and message metadata
 * Using Zod schemas for runtime validation with z.infer for type inference
 */

import { z } from 'zod'

// Re-export Database type from client
export type { Database } from './client'

/**
 * Tool call structure for messages
 */
export const ToolCallSchema = z.object({
	id: z.string(),
	name: z.string(),
	input: z.record(z.string(), z.unknown()),
})

export type ToolCall = z.infer<typeof ToolCallSchema>

/**
 * Tool result structure for messages
 */
export const ToolResultSchema = z.object({
	toolCallId: z.string(),
	output: z.unknown(),
	isError: z.boolean().optional(),
})

export type ToolResult = z.infer<typeof ToolResultSchema>

/**
 * Token usage information for AI model calls
 */
export const TokenUsageSchema = z.object({
	inputTokens: z.number().optional(),
	outputTokens: z.number().optional(),
})

export type TokenUsage = z.infer<typeof TokenUsageSchema>

/**
 * Message metadata structure
 */
export const MessageMetadataSchema = z.object({
	toolCalls: z.array(ToolCallSchema).optional(),
	toolResults: z.array(ToolResultSchema).optional(),
	model: z.string().optional(),
	usage: TokenUsageSchema.optional(),
})

export type MessageMetadata = z.infer<typeof MessageMetadataSchema>
