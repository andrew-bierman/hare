/**
 * API Dependencies - Interfaces for host app to provide implementations
 *
 * This module defines the contracts that the API package expects from the host application.
 * The host app (e.g., web-app) must provide concrete implementations via `configureApi()`.
 */

import type { Context } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import type { DrizzleD1Database } from 'drizzle-orm/d1'

// =============================================================================
// Database Types
// =============================================================================

/**
 * Abstract database type - host app provides the concrete implementation
 */
export type Database = DrizzleD1Database<Record<string, unknown>>

/**
 * Database schema tables interface.
 * Host app must provide table definitions matching this interface.
 */
export interface DatabaseSchema {
	users: unknown
	workspaces: unknown
	workspaceMembers: unknown
	workspaceInvitations: unknown
	agents: unknown
	agentTools: unknown
	tools: unknown
	apiKeys: unknown
	conversations: unknown
	messages: unknown
	usage: unknown
	deployments: unknown
	scheduledTasks: unknown
	scheduleExecutions: unknown
	webhooks: unknown
	webhookDeliveries: unknown
}

// =============================================================================
// Auth Types
// =============================================================================

/**
 * Auth instance interface - Better Auth compatible
 */
export interface AuthInstance {
	api: {
		getSession: (options: { headers: Headers }) => Promise<{
			user: {
				id: string
				email: string
				name: string | null
				image: string | null
			}
			session: {
				id: string
				expiresAt: Date
			}
		} | null>
	}
}

/**
 * Auth factory function type
 */
export type CreateAuthFn = (db: D1Database) => AuthInstance

// =============================================================================
// Config Types
// =============================================================================

export interface AIModel {
	id: string
	name: string
	provider: string
	contextWindow?: number
	maxOutput?: number
}

export interface AgentLimits {
	maxAgentsPerWorkspace: number
	maxToolsPerAgent: number
}

export interface ServerEnv {
	NODE_ENV: 'development' | 'production' | 'test'
	APP_URL: string
	FEATURE_AI_CHAT: boolean
	FEATURE_AI_CHAT_BETA_MODE: boolean
	FEATURE_AI_CHAT_ALLOWED_EMAILS: string[]
}

export interface BetaAccess {
	enabled: boolean
	allowedEmails: string[]
}

export interface Features {
	aiChat: boolean
}

// =============================================================================
// Agent Types
// =============================================================================

export interface AgentConfig {
	id: string
	workspaceId: string
	name: string
	description: string | null
	instructions: string | null
	model: string
	status: 'draft' | 'deployed' | 'archived'
	config: {
		temperature?: number
		maxTokens?: number
		topP?: number
		topK?: number
		stopSequences?: string[]
	} | null
}

export interface EdgeAgent {
	chat: (options: {
		messages: Array<{ role: string; content: string }>
		onChunk?: (chunk: string) => void
	}) => Promise<{ content: string }>
}

// =============================================================================
// Dependencies Container
// =============================================================================

/**
 * All dependencies the API needs from the host application.
 */
export interface ApiDependencies {
	// Database
	schema: DatabaseSchema
	createDb: (d1: D1Database) => Database

	// Auth
	createAuth: CreateAuthFn
	oauthProviders: Array<{ id: string; name: string }>

	// Config
	serverEnv: ServerEnv
	aiModels: AIModel[]
	agentLimits: AgentLimits
	betaAccess: BetaAccess
	features: Features
	getModelById: (id: string) => AIModel | undefined
	getModelName: (id: string) => string

	// Agents
	createAgentFromConfig: (options: {
		agentConfig: AgentConfig
		db: Database
		env: CloudflareEnv
		userId: string
		includeSystemTools?: boolean
	}) => Promise<EdgeAgent>
	isWebSocketRequest: (request: Request) => boolean
	routeToMcpAgent: (options: {
		request: Request
		env: CloudflareEnv
		ctx: ExecutionContext
		workspaceId: string
	}) => Promise<Response>
	routeHttpToAgent: (options: {
		request: Request
		env: CloudflareEnv
		ctx: ExecutionContext
		agentId: string
	}) => Promise<Response>
	routeWebSocketToAgent: (options: {
		request: Request
		env: CloudflareEnv
		ctx: ExecutionContext
		agentId: string
	}) => Promise<Response>

	// Memory
	createMemoryStore: (options: { vectorize: VectorizeIndex; namespace: string }) => unknown
	toAgentMessages: (messages: unknown[]) => unknown[]

	// Utils
	generateUniqueSlug: (name: string, existingCheck: (slug: string) => Promise<boolean>) => Promise<string>
}

// =============================================================================
// Global Dependencies Store
// =============================================================================

let _dependencies: ApiDependencies | null = null

/**
 * Configure the API with host-provided dependencies.
 * Must be called before the API is used.
 */
export function configureApi(deps: ApiDependencies): void {
	_dependencies = deps
}

/**
 * Get the configured dependencies.
 * Throws if dependencies haven't been configured.
 */
export function getDependencies(): ApiDependencies {
	if (!_dependencies) {
		throw new Error(
			'API dependencies not configured. Call configureApi() before using the API.',
		)
	}
	return _dependencies
}

/**
 * Check if dependencies are configured.
 */
export function isConfigured(): boolean {
	return _dependencies !== null
}
