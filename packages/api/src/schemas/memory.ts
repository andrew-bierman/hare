/**
 * Memory API Schemas
 *
 * Zod schemas for agent vector memory request/response validation.
 */

import { z } from 'zod'

// Memory type enum
export const MemoryTypeSchema = z
	.enum(['fact', 'context', 'preference', 'conversation', 'custom'])
	.describe('Type of memory')
	

// Memory metadata schema
export const MemoryMetadataSchema = z
	.object({
		agentId: z.string().min(1).describe('Agent ID'),
		workspaceId: z.string().min(1).describe('Workspace ID'),
		type: MemoryTypeSchema,
		source: z.string().optional().describe('Source of this memory (e.g., conversation ID)'),
		createdAt: z.string().datetime().describe('Creation timestamp'),
		updatedAt: z.string().datetime().optional().describe('Last update timestamp'),
		tags: z.array(z.string().min(1).max(50)).optional().describe('Tags for categorization'),
	})
	

// Memory entry with content and metadata
export const MemorySchema = z
	.object({
		id: z.string().min(1).describe('Unique memory ID'),
		content: z.string().min(1).describe('Memory content text'),
		metadata: MemoryMetadataSchema.describe('Memory metadata'),
		score: z.number().min(0).max(1).optional().describe('Similarity score (for search results)'),
	})
	

// Create memory input
export const CreateMemorySchema = z
	.object({
		content: z
			.string()
			.min(1, 'Content is required')
			.max(10000, 'Content must be at most 10000 characters')
			.describe('Memory content to store'),
		type: MemoryTypeSchema.optional().default('custom').describe('Type of memory'),
		source: z
			.string()
			.max(500)
			.optional()
			.describe('Source of this memory (e.g., conversation ID)'),
		tags: z
			.array(z.string().min(1).max(50))
			.max(20, 'Maximum 20 tags allowed')
			.optional()
			.describe('Tags for categorization'),
	})
	

// Update memory input
export const UpdateMemorySchema = z
	.object({
		content: z
			.string()
			.min(1, 'Content is required')
			.max(10000, 'Content must be at most 10000 characters')
			.describe('Updated memory content'),
		type: MemoryTypeSchema.optional().describe('Updated memory type'),
		tags: z
			.array(z.string().min(1).max(50))
			.max(20, 'Maximum 20 tags allowed')
			.optional()
			.describe('Updated tags'),
	})
	

// Search memory input
export const SearchMemorySchema = z
	.object({
		query: z
			.string()
			.min(1, 'Query is required')
			.max(1000, 'Query must be at most 1000 characters')
			.describe('Search query for semantic matching'),
		topK: z
			.number()
			.int()
			.min(1, 'Must return at least 1 result')
			.max(100, 'Maximum 100 results allowed')
			.optional()
			.default(5)
			.describe('Number of results to return'),
		type: MemoryTypeSchema.optional().describe('Filter by memory type'),
		tags: z
			.array(z.string().min(1).max(50))
			.max(20, 'Maximum 20 tags allowed')
			.optional()
			.describe('Filter by tags'),
	})
	

// Memory list response
export const MemoryListResponseSchema = z
	.object({
		memories: z.array(MemorySchema).describe('List of memories'),
		total: z.number().int().min(0).describe('Total number of memories'),
		limit: z.number().int().min(1).max(100).describe('Page size'),
		offset: z.number().int().min(0).describe('Page offset'),
	})
	

// Search result response
export const SearchResultSchema = z
	.object({
		memories: z.array(MemorySchema).describe('Search results'),
		query: z.string().min(1).describe('Original search query'),
		topK: z.number().int().min(1).describe('Number of results requested'),
	})
	

// Clear memories response
export const ClearMemoriesResponseSchema = z
	.object({
		success: z.boolean().describe('Whether the operation succeeded'),
		deleted: z.number().int().min(0).describe('Number of memories deleted'),
	})
	

// Memory ID param schema
export const MemoryIdParamSchema = z
	.object({
		id: z.string().min(1).describe('Agent ID'),
		memoryId: z.string().min(1).describe('Memory ID'),
	})
	

// Memory list query schema
export const MemoryListQuerySchema = z
	.object({
		limit: z.coerce
			.number()
			.int()
			.min(1, 'Must return at least 1 result')
			.max(100, 'Maximum 100 results per page')
			.optional()
			.default(20)
			.describe('Page size'),
		offset: z.coerce.number().int().min(0).optional().default(0).describe('Page offset'),
	})
	
