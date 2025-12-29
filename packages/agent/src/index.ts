/**
 * @hare/agent - AI agents for Cloudflare Workers
 *
 * This is the main entry point that can be safely imported in any environment.
 * For Workers-only exports (HareAgent, HareMcpAgent), use '@hare/agent/workers'.
 *
 * @example
 * ```ts
 * // Universal imports (safe anywhere)
 * import { EdgeAgent, createEdgeAgent } from '@hare/agent'
 *
 * // Workers-only imports
 * import { HareAgent, HareMcpAgent } from '@hare/agent/workers'
 * ```
 */

// Types (safe to import anywhere) - re-exported from @hare/types
export type {
	HareAgentState,
	McpAgentState,
	ClientMessage,
	ServerMessage,
	ChatPayload,
	ToolExecutePayload,
	SchedulePayload,
	ScheduledTask,
} from '@hare/types'

export { DEFAULT_HARE_AGENT_STATE, DEFAULT_MCP_AGENT_STATE } from '@hare/types'

// Edge Agent (universal - no cloudflare:workers dependency)
export { EdgeAgent, createEdgeAgent } from './edge-agent'
export type { AgentTool, AgentOptions, AgentStreamResponse } from './edge-agent'

// Router utilities (universal)
export {
	routeToHareAgent,
	routeToMcpAgent,
	routeWebSocketToAgent,
	routeHttpToAgent,
	isWebSocketRequest,
	getAgentIdFromRequest,
	createAgentHeaders,
} from './router'
export type {
	HareAgentEnv,
	AgentRouteConfig,
	RouteToHareAgentInput,
	RouteToMcpAgentInput,
	RouteWebSocketToAgentInput,
	RouteHttpToAgentInput,
} from './router'

// Workers AI Provider (universal)
export {
	createWorkersAIModel,
	getWorkersAIModelId,
	getAvailableModels,
	generateEmbedding,
	generateEmbeddings,
	WORKERS_AI_MODELS,
	EMBEDDING_MODELS,
} from './providers/workers-ai'
export type {
	WorkersAIModelId,
	EmbeddingModelId,
	CreateWorkersAIModelInput,
	GenerateEmbeddingInput,
	GenerateEmbeddingsInput,
} from './providers/workers-ai'

// =============================================================================
// Agent Config & Memory
// =============================================================================

import { and, desc, eq } from 'drizzle-orm'
import { type Database, conversations, messages } from '@hare/db'
import { EdgeAgent } from './edge-agent'
import type { ModelMessage } from 'ai'

/**
 * Agent configuration from database.
 */
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

/**
 * Create an EdgeAgent from a database config.
 */
export async function createAgentFromConfig(options: {
	agentConfig: AgentConfig
	db: Database
	env: { AI?: Ai }
	userId: string
	includeSystemTools?: boolean
}): Promise<EdgeAgent> {
	const { agentConfig, env } = options

	if (!env.AI) {
		throw new Error('AI binding not available')
	}

	return new EdgeAgent({
		name: agentConfig.name,
		instructions: agentConfig.instructions || 'You are a helpful assistant.',
		model: agentConfig.model,
		ai: env.AI,
	})
}

/**
 * Database message row type
 */
interface MessageRow {
	id: string
	conversationId: string
	role: string
	content: string
	createdAt: Date
	metadata?: Record<string, unknown> | null
}

/**
 * Memory store for conversation persistence.
 * Uses Drizzle DB for storage.
 */
export function createMemoryStore(db: Database, workspaceId: string) {
	return {
		/**
		 * Get or create a conversation for an agent/user pair.
		 */
		async getOrCreateConversation(options: {
			agentId: string
			userId: string
			title: string
		}): Promise<string> {
			const { agentId, userId, title } = options

			// Check for existing conversation
			const existing = await db
				.select()
				.from(conversations)
				.where(
					and(
						eq(conversations.agentId, agentId),
						eq(conversations.userId, userId),
					),
				)
				.limit(1)

			if (existing.length > 0) {
				return existing[0].id
			}

			// Create new conversation
			const [newConv] = await db
				.insert(conversations)
				.values({
					workspaceId,
					agentId,
					userId,
					title,
				})
				.returning()

			return newConv.id
		},

		/**
		 * Get messages for a conversation.
		 */
		async getMessages(options: {
			conversationId: string
			limit?: number
		}): Promise<MessageRow[]> {
			const { conversationId, limit = 50 } = options

			const results = await db
				.select()
				.from(messages)
				.where(eq(messages.conversationId, conversationId))
				.orderBy(desc(messages.createdAt))
				.limit(limit)

			// Return in chronological order
			return results.reverse().map((msg) => ({
				id: msg.id,
				conversationId: msg.conversationId,
				role: msg.role,
				content: msg.content,
				createdAt: msg.createdAt,
				metadata: msg.metadata as Record<string, unknown> | null,
			}))
		},

		/**
		 * Save a message to the conversation.
		 */
		async saveMessage(options: {
			conversationId: string
			role: string
			content: string
			metadata?: Record<string, unknown>
		}): Promise<void> {
			const { conversationId, role, content, metadata } = options

			await db.insert(messages).values({
				conversationId,
				role: role as 'user' | 'assistant' | 'system' | 'tool',
				content,
				metadata,
			})
		},
	}
}

/**
 * Convert database messages to AI SDK ModelMessage format.
 */
export function toAgentMessages(
	msgs: Array<{ role: string; content: string }>,
): ModelMessage[] {
	return msgs
		.filter((msg) => ['user', 'assistant', 'system'].includes(msg.role))
		.map((msg) => ({
			role: msg.role as 'user' | 'assistant' | 'system',
			content: msg.content,
		}))
}
