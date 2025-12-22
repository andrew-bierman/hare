/**
 * API Types
 *
 * Shared types for API requests and responses.
 * These match the Zod schemas used in the API routes.
 */

// =============================================================================
// Agent Types
// =============================================================================

export type AgentStatus = 'draft' | 'deployed' | 'archived'

export interface AgentConfig {
	temperature?: number
	maxTokens?: number
	topP?: number
	topK?: number
	stopSequences?: string[]
}

export interface Agent {
	id: string
	workspaceId: string
	name: string
	description: string | null
	model: string
	instructions: string
	config: AgentConfig | null
	status: AgentStatus
	toolIds: string[]
	createdAt: string
	updatedAt: string
}

export interface CreateAgentInput {
	name: string
	description?: string
	model: string
	instructions?: string
	config?: AgentConfig
	toolIds?: string[]
}

export interface UpdateAgentInput {
	name?: string
	description?: string
	model?: string
	instructions?: string
	config?: AgentConfig
	toolIds?: string[]
	status?: AgentStatus
}

// =============================================================================
// Tool Types
// =============================================================================

export type ToolType = 'http' | 'sql' | 'kv' | 'r2' | 'vectorize' | 'custom'

export interface Tool {
	id: string
	workspaceId: string
	name: string
	description: string
	type: ToolType
	isSystem: boolean
	inputSchema: Record<string, unknown>
	config: Record<string, unknown> | null
	createdAt: string
	updatedAt: string
}

export interface CreateToolInput {
	name: string
	description: string
	type: ToolType
	inputSchema: Record<string, unknown>
	config?: Record<string, unknown>
	code?: string
}

// =============================================================================
// Workspace Types
// =============================================================================

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface Workspace {
	id: string
	name: string
	slug: string
	description: string | null
	createdAt: string
	updatedAt: string
}

export interface CreateWorkspaceInput {
	name: string
	slug?: string
	description?: string
}

// =============================================================================
// Usage Types
// =============================================================================

export interface UsageSummary {
	totalCalls: number
	totalTokens: number
	inputTokens: number
	outputTokens: number
	periodStart: string
	periodEnd: string
}

export interface AgentUsage {
	agentId: string
	agentName: string
	totalCalls: number
	totalTokens: number
}

// =============================================================================
// Chat Types
// =============================================================================

export interface ChatMessage {
	id: string
	role: 'user' | 'assistant' | 'system'
	content: string
	createdAt: string
}

export interface ChatRequest {
	message: string
	conversationId?: string
}

export interface ChatStreamEvent {
	type: 'text' | 'tool_call' | 'tool_result' | 'done' | 'error'
	content?: string
	toolName?: string
	toolArgs?: Record<string, unknown>
	toolResult?: unknown
	error?: string
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiError {
	error: string
	code?: string
	details?: Record<string, unknown>
}

export interface ApiSuccess {
	success: true
}
