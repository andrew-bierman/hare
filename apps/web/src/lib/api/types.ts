// =============================================================================
// HONO ENVIRONMENT TYPES (Server-side)
// =============================================================================

/**
 * Auth user information stored in context.
 */
export interface AuthUser {
	id: string
	email: string
	name: string | null
	image: string | null
}

/**
 * Session information stored in context.
 */
export interface AuthSession {
	id: string
	expiresAt: Date
}

/**
 * Workspace information stored in context.
 */
export interface WorkspaceInfo {
	id: string
	name: string
	slug: string
	ownerId: string
}

/**
 * Auth variables set by authMiddleware.
 */
export interface AuthVariables {
	user: AuthUser
	session: AuthSession
}

/**
 * Workspace variables set by workspaceMiddleware.
 * Extends AuthVariables since workspace routes require auth.
 */
export interface WorkspaceVariables extends AuthVariables {
	workspace: WorkspaceInfo
	workspaceRole: WorkspaceRole
}

/**
 * API key information stored in context.
 */
export interface ApiKeyInfo {
	id: string
	workspaceId: string
	name: string
	permissions: {
		scopes?: string[]
		agentIds?: string[]
	} | null
}

/**
 * API key variables set by apiKeyMiddleware.
 */
export interface ApiKeyVariables {
	apiKey: ApiKeyInfo
	workspace: WorkspaceInfo
}

/**
 * Base variables available in all routes (set by global middleware)
 */
export interface BaseVariables {
	/** Request ID for tracing (set by requestId middleware) */
	requestId?: string
	/** Add timing entry (set by timing middleware) */
	addTiming?: (name: string, duration: number, description?: string) => void
}

/**
 * Base Hono environment with Cloudflare bindings.
 * Use this as the base for all route handlers.
 */
export interface HonoEnv {
	Bindings: CloudflareEnv
	Variables: BaseVariables
}

/**
 * Hono environment for auth-protected routes.
 */
export interface AuthEnv extends HonoEnv {
	Variables: AuthVariables & BaseVariables
}

/**
 * Hono environment for workspace-scoped routes.
 */
export interface WorkspaceEnv extends HonoEnv {
	Variables: WorkspaceVariables & BaseVariables
}

/**
 * Hono environment for API key-authenticated routes.
 */
export interface ApiKeyEnv extends HonoEnv {
	Variables: ApiKeyVariables & BaseVariables
}

/**
 * Hono environment for optional auth routes.
 */
export interface OptionalAuthEnv extends HonoEnv {
	Variables: Partial<AuthVariables> & BaseVariables
}

// =============================================================================
// DATABASE ENUM TYPES WITH RUNTIME VALIDATION
// =============================================================================

/**
 * Workspace role type.
 * Matches the database enum.
 */
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'

/**
 * Validate that a value is a valid WorkspaceRole.
 */
export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
	return value === 'owner' || value === 'admin' || value === 'member' || value === 'viewer'
}

/**
 * Assert that a value is a valid WorkspaceRole.
 * Throws if invalid.
 */
export function assertWorkspaceRole(value: unknown): asserts value is WorkspaceRole {
	if (!isWorkspaceRole(value)) {
		throw new Error(`Invalid workspace role: ${value}`)
	}
}

/**
 * Message role type.
 * Matches the database enum.
 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

/**
 * Validate that a value is a valid MessageRole.
 */
export function isMessageRole(value: unknown): value is MessageRole {
	return value === 'user' || value === 'assistant' || value === 'system' || value === 'tool'
}

/**
 * Assert that a value is a valid MessageRole.
 * Throws if invalid.
 */
export function assertMessageRole(value: unknown): asserts value is MessageRole {
	if (!isMessageRole(value)) {
		throw new Error(`Invalid message role: ${value}`)
	}
}

// =============================================================================
// API TYPES (Client-side)
// =============================================================================

/**
 * Agent status type.
 */
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
	description?: string
	type: ToolType
	inputSchema?: Record<string, unknown>
	config?: Record<string, unknown>
	code?: string
}

// =============================================================================
// Workspace Types
// =============================================================================

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
