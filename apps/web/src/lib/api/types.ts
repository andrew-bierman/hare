import type { z } from '@hono/zod-openapi'
import type {
	AgentSchema,
	WorkspaceSchema,
	ToolSchema,
	UsageResponseSchema,
	AgentUsageResponseSchema,
	DeploymentSchema,
} from './schemas'

/**
 * API Response Types
 *
 * These types match the Zod schemas used in API responses.
 * They provide type safety for the RPC client without relying on Hono's
 * complex type inference which struggles with OpenAPIHono middleware.
 */

// Agent types
export type Agent = z.infer<typeof AgentSchema>
export type Deployment = z.infer<typeof DeploymentSchema>

export interface AgentsResponse {
	agents: Agent[]
}

// Workspace types
export type Workspace = z.infer<typeof WorkspaceSchema>

export interface WorkspacesResponse {
	workspaces: Workspace[]
}

// Tool types
export type Tool = z.infer<typeof ToolSchema>

export interface ToolsResponse {
	tools: Tool[]
}

// Usage types
export type UsageResponse = z.infer<typeof UsageResponseSchema>
export type AgentUsageResponse = z.infer<typeof AgentUsageResponseSchema>

// Common types
export interface SuccessResponse {
	success: boolean
}

export interface ErrorResponse {
	error: string
	code?: string
}

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
