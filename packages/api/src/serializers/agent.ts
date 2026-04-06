import type { agents } from '@hare/db'
import type { InferSelectModel } from 'drizzle-orm'

type AgentRow = InferSelectModel<typeof agents>

// =============================================================================
// Types
// =============================================================================

/**
 * API response shape for an agent.
 */
export interface SerializedAgent {
	id: string
	workspaceId: string
	name: string
	description: string | null
	model: string
	instructions: string
	config?: {
		temperature?: number
		maxTokens?: number
		topP?: number
		topK?: number
		stopSequences?: string[]
	}
	status: 'draft' | 'deployed' | 'archived'
	systemToolsEnabled: boolean
	conversationStarters?: string[] | null
	guardrailsEnabled: boolean
	toolIds: string[]
	createdAt: string
	updatedAt: string
}

export interface SerializeAgentOptions {
	/** Agent database row */
	agent: AgentRow
	/** Tool IDs associated with the agent */
	toolIds?: string[]
}

export interface SerializeAgentsOptions {
	/** Agent database rows */
	agents: AgentRow[]
	/** Map of agent IDs to their tool IDs */
	toolIdsByAgent: Map<string, string[]>
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Serialize a database agent row to API response format.
 */
export function serializeAgent(options: SerializeAgentOptions): SerializedAgent {
	const { agent, toolIds = [] } = options
	return {
		id: agent.id,
		workspaceId: agent.workspaceId,
		name: agent.name,
		description: agent.description,
		model: agent.model,
		instructions: agent.instructions || '',
		config: agent.config || undefined,
		status: agent.status,
		systemToolsEnabled: agent.systemToolsEnabled,
		conversationStarters: agent.conversationStarters ?? null,
		guardrailsEnabled: agent.guardrailsEnabled,
		toolIds,
		createdAt: agent.createdAt.toISOString(),
		updatedAt: agent.updatedAt.toISOString(),
	}
}

/**
 * Serialize multiple agents with their tool IDs.
 */
export function serializeAgents(options: SerializeAgentsOptions): SerializedAgent[] {
	const { agents, toolIdsByAgent } = options
	return agents.map((agent) =>
		serializeAgent({ agent, toolIds: toolIdsByAgent.get(agent.id) || [] }),
	)
}
