/**
 * Database type definitions for tool interactions and message metadata
 */

/**
 * Tool call structure for messages
 */
export interface ToolCall {
	id: string
	name: string
	input: Record<string, unknown>
}

/**
 * Tool result structure for messages
 */
export interface ToolResult {
	toolCallId: string
	output: unknown
	isError?: boolean
}

/**
 * Token usage information for AI model calls
 */
export interface TokenUsage {
	inputTokens?: number
	outputTokens?: number
}

/**
 * Message metadata structure
 */
export interface MessageMetadata {
	toolCalls?: ToolCall[]
	toolResults?: ToolResult[]
	model?: string
	usage?: TokenUsage
}
