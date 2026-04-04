/**
 * Document Tools
 *
 * Tools for document conversion and processing using Cloudflare Workers AI.
 * Enables agents to convert PDFs, images, and other documents to markdown.
 */

import { z } from 'zod'
import { createTool, failure, success, type ToolContext } from './types'

// ============================================================================
// Output Schemas
// ============================================================================

const ConvertDocumentOutputSchema = z.object({
	markdown: z.string().describe('Converted markdown content'),
	tokens: z.number().describe('Tokens used for conversion'),
	name: z.string().describe('Original document name'),
})

// ============================================================================
// Tools
// ============================================================================

/**
 * Convert Document Tool
 *
 * Convert a document (PDF, image, etc.) stored in R2 to markdown text
 * using Cloudflare Workers AI's toMarkdown() API.
 */
export const convertDocumentTool = createTool({
	id: 'convert_document',
	description:
		'Convert a document (PDF, image) stored in R2 to markdown text. Useful for extracting content from uploaded files.',
	inputSchema: z.object({
		r2Key: z.string().min(1).describe('R2 object key of the document to convert'),
	}),
	outputSchema: ConvertDocumentOutputSchema,
	execute: async (params, context) => {
		if (!context.env.AI) return failure('AI binding not available')
		if (!context.env.R2) return failure('R2 bucket not available')
		try {
			const obj = await context.env.R2.get(params.r2Key)
			if (!obj) return failure('Document not found in R2')

			// Check file size — toMarkdown loads entire file into memory
			if (obj.size > 25 * 1024 * 1024) {
				return failure('Document exceeds 25MB limit for conversion')
			}

			const blob = new Blob([await obj.arrayBuffer()])
			const result = await context.env.AI.toMarkdown([{ name: params.r2Key, blob }])

			const item = result[0]
			if (!item) return failure('Document conversion returned no results')
			if (item.format === 'error') return failure(`Conversion error: ${item.error}`)

			return success({
				markdown: item.data,
				tokens: item.tokens ?? 0,
				name: item.name,
			})
		} catch (error) {
			return failure(
				`Failed to convert document: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

// ============================================================================
// Tool Getter
// ============================================================================

export function getDocumentTools(_context: ToolContext) {
	return [convertDocumentTool]
}
