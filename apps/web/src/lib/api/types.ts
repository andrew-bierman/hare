import { z } from 'zod'

// =============================================================================
// HONO ENVIRONMENT TYPES (Server-side)
// Using Zod schemas for runtime validation with z.infer for type inference
// =============================================================================

/**
 * Auth user information stored in context.
 */
export const AuthUserSchema = z.object({
	id: z.string(),
	email: z.string().email(),
	name: z.string().nullable(),
	image: z.string().nullable(),
})

export type AuthUser = z.infer<typeof AuthUserSchema>

/**
 * Session information stored in context.
 */
export const AuthSessionSchema = z.object({
	id: z.string(),
	expiresAt: z.date(),
})

export type AuthSession = z.infer<typeof AuthSessionSchema>

/**
 * Workspace information stored in context.
 */
export const WorkspaceInfoSchema = z.object({
	id: z.string(),
	name: z.string(),
	slug: z.string(),
	ownerId: z.string(),
})

export type WorkspaceInfo = z.infer<typeof WorkspaceInfoSchema>

/**
 * Auth variables set by authMiddleware.
 */
export const AuthVariablesSchema = z.object({
	user: AuthUserSchema,
	session: AuthSessionSchema,
})

export type AuthVariables = z.infer<typeof AuthVariablesSchema>

/**
 * API key permissions schema.
 */
export const ApiKeyPermissionsSchema = z
	.object({
		scopes: z.array(z.string()).optional(),
		agentIds: z.array(z.string()).optional(),
	})
	.nullable()

/**
 * API key information stored in context.
 */
export const ApiKeyInfoSchema = z.object({
	id: z.string(),
	workspaceId: z.string(),
	name: z.string(),
	permissions: ApiKeyPermissionsSchema,
})

export type ApiKeyInfo = z.infer<typeof ApiKeyInfoSchema>

/**
 * API key variables set by apiKeyMiddleware.
 */
export const ApiKeyVariablesSchema = z.object({
	apiKey: ApiKeyInfoSchema,
	workspace: WorkspaceInfoSchema,
})

export type ApiKeyVariables = z.infer<typeof ApiKeyVariablesSchema>

/**
 * Workspace variables set by workspaceMiddleware.
 * Extends AuthVariables since workspace routes require auth.
 */
export interface WorkspaceVariables extends AuthVariables {
	workspace: WorkspaceInfo
	workspaceRole: WorkspaceRole
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
// Using Zod schemas for validation - no need for manual validator functions
// =============================================================================

/**
 * Workspace role schema.
 * Matches the database enum.
 */
export const WorkspaceRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer'])

export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>

/**
 * Validate that a value is a valid WorkspaceRole.
 */
export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
	return WorkspaceRoleSchema.safeParse(value).success
}

/**
 * Assert that a value is a valid WorkspaceRole.
 * Throws if invalid.
 */
export function assertWorkspaceRole(value: unknown): asserts value is WorkspaceRole {
	const result = WorkspaceRoleSchema.safeParse(value)
	if (!result.success) {
		throw new Error('Invalid workspace role')
	}
}

/**
 * Message role schema.
 * Matches the database enum.
 */
export const MessageRoleSchema = z.enum(['user', 'assistant', 'system', 'tool'])

export type MessageRole = z.infer<typeof MessageRoleSchema>

/**
 * Validate that a value is a valid MessageRole.
 */
export function isMessageRole(value: unknown): value is MessageRole {
	return MessageRoleSchema.safeParse(value).success
}

/**
 * Assert that a value is a valid MessageRole.
 * Throws if invalid.
 */
export function assertMessageRole(value: unknown): asserts value is MessageRole {
	const result = MessageRoleSchema.safeParse(value)
	if (!result.success) {
		throw new Error('Invalid message role')
	}
}

// =============================================================================
// API TYPES (Client-side)
// Using Zod schemas for runtime validation with z.infer for type inference
// =============================================================================

/**
 * Agent status schema.
 */
export const AgentStatusSchema = z.enum(['draft', 'deployed', 'archived'])

export type AgentStatus = z.infer<typeof AgentStatusSchema>

/**
 * Agent configuration schema.
 */
export const AgentConfigSchema = z.object({
	temperature: z.number().min(0).max(2).optional(),
	maxTokens: z.number().min(1).max(100000).optional(),
	topP: z.number().min(0).max(1).optional(),
	topK: z.number().min(0).optional(),
	stopSequences: z.array(z.string()).optional(),
})

export type AgentConfig = z.infer<typeof AgentConfigSchema>

/**
 * Agent schema.
 */
export const AgentSchema = z.object({
	id: z.string(),
	workspaceId: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	model: z.string(),
	instructions: z.string(),
	config: AgentConfigSchema.nullable(),
	status: AgentStatusSchema,
	toolIds: z.array(z.string()),
	createdAt: z.string(),
	updatedAt: z.string(),
})

export type Agent = z.infer<typeof AgentSchema>

/**
 * Create agent input schema.
 */
export const CreateAgentInputSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().optional(),
	model: z.string(),
	instructions: z.string().optional(),
	config: AgentConfigSchema.optional(),
	toolIds: z.array(z.string()).optional(),
})

export type CreateAgentInput = z.infer<typeof CreateAgentInputSchema>

/**
 * Update agent input schema.
 */
export const UpdateAgentInputSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().optional(),
	model: z.string().optional(),
	instructions: z.string().optional(),
	config: AgentConfigSchema.optional(),
	toolIds: z.array(z.string()).optional(),
	status: AgentStatusSchema.optional(),
})

export type UpdateAgentInput = z.infer<typeof UpdateAgentInputSchema>

// =============================================================================
// Tool Types
// =============================================================================

/**
 * Tool type schema (client-side subset).
 */
export const ToolTypeSchema = z.enum(['http', 'sql', 'kv', 'r2', 'custom'])

export type ToolType = z.infer<typeof ToolTypeSchema>

/**
 * Tool schema.
 */
export const ToolSchema = z.object({
	id: z.string(),
	workspaceId: z.string(),
	name: z.string(),
	description: z.string(),
	type: ToolTypeSchema,
	isSystem: z.boolean(),
	inputSchema: z.record(z.string(), z.unknown()),
	config: z.record(z.string(), z.unknown()).nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
})

export type Tool = z.infer<typeof ToolSchema>

/**
 * Create tool input schema.
 */
export const CreateToolInputSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().optional(),
	type: ToolTypeSchema,
	inputSchema: z.record(z.string(), z.unknown()).optional(),
	config: z.record(z.string(), z.unknown()).optional(),
	code: z.string().optional(),
})

export type CreateToolInput = z.infer<typeof CreateToolInputSchema>

// =============================================================================
// Workspace Types
// =============================================================================

/**
 * Workspace schema.
 */
export const WorkspaceSchema = z.object({
	id: z.string(),
	name: z.string(),
	slug: z.string(),
	description: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
})

export type Workspace = z.infer<typeof WorkspaceSchema>

/**
 * Create workspace input schema.
 */
export const CreateWorkspaceInputSchema = z.object({
	name: z.string().min(1).max(100),
	slug: z.string().optional(),
	description: z.string().optional(),
})

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInputSchema>

// =============================================================================
// Usage Types
// =============================================================================

/**
 * Usage summary schema.
 */
export const UsageSummarySchema = z.object({
	totalCalls: z.number(),
	totalTokens: z.number(),
	inputTokens: z.number(),
	outputTokens: z.number(),
	periodStart: z.string(),
	periodEnd: z.string(),
})

export type UsageSummary = z.infer<typeof UsageSummarySchema>

/**
 * Agent usage schema.
 */
export const AgentUsageSchema = z.object({
	agentId: z.string(),
	agentName: z.string(),
	totalCalls: z.number(),
	totalTokens: z.number(),
})

export type AgentUsage = z.infer<typeof AgentUsageSchema>

// =============================================================================
// Chat Types
// =============================================================================

/**
 * Chat message role schema (subset for chat).
 */
export const ChatMessageRoleSchema = z.enum(['user', 'assistant', 'system'])

/**
 * Chat message schema.
 */
export const ChatMessageSchema = z.object({
	id: z.string(),
	role: ChatMessageRoleSchema,
	content: z.string(),
	createdAt: z.string(),
})

export type ChatMessage = z.infer<typeof ChatMessageSchema>

/**
 * Chat request schema.
 */
export const ChatRequestSchema = z.object({
	message: z.string().min(1),
	conversationId: z.string().optional(),
})

export type ChatRequest = z.infer<typeof ChatRequestSchema>

/**
 * Chat stream event type schema.
 */
export const ChatStreamEventTypeSchema = z.enum(['text', 'tool_call', 'tool_result', 'done', 'error'])

/**
 * Chat stream event schema.
 * Discriminated union for type-safe stream event handling.
 */
export const ChatStreamEventSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('text'),
		content: z.string(),
	}),
	z.object({
		type: z.literal('tool_call'),
		toolName: z.string(),
		toolArgs: z.record(z.string(), z.unknown()),
	}),
	z.object({
		type: z.literal('tool_result'),
		toolResult: z.unknown(),
	}),
	z.object({
		type: z.literal('done'),
	}),
	z.object({
		type: z.literal('error'),
		error: z.string(),
	}),
])

export type ChatStreamEvent = z.infer<typeof ChatStreamEventSchema>

// =============================================================================
// API Response Types
// =============================================================================

/**
 * API error schema.
 */
export const ApiErrorSchema = z.object({
	error: z.string(),
	code: z.string().optional(),
	details: z.record(z.string(), z.unknown()).optional(),
})

export type ApiError = z.infer<typeof ApiErrorSchema>

/**
 * API success schema.
 */
export const ApiSuccessSchema = z.object({
	success: z.literal(true),
})

export type ApiSuccess = z.infer<typeof ApiSuccessSchema>
