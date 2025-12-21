// =============================================================================
// HONO ENVIRONMENT TYPES
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
 * Base Hono environment with Cloudflare bindings.
 * Use this as the base for all route handlers.
 */
export interface HonoEnv {
	Bindings: CloudflareEnv
}

/**
 * Hono environment for auth-protected routes.
 */
export interface AuthEnv extends HonoEnv {
	Variables: AuthVariables
}

/**
 * Hono environment for workspace-scoped routes.
 */
export interface WorkspaceEnv extends HonoEnv {
	Variables: WorkspaceVariables
}

/**
 * Hono environment for API key-authenticated routes.
 */
export interface ApiKeyEnv extends HonoEnv {
	Variables: ApiKeyVariables
}

/**
 * Hono environment for optional auth routes.
 */
export interface OptionalAuthEnv extends HonoEnv {
	Variables: Partial<AuthVariables>
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

/**
 * Agent status type.
 */
export type AgentStatus = 'draft' | 'deployed' | 'archived'

/**
 * Tool type.
 */
export type ToolType = 'http' | 'sql' | 'kv' | 'r2' | 'vectorize' | 'custom'
