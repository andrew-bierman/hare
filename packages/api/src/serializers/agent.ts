import type { InferSelectModel } from 'drizzle-orm'
import type { agents } from '@hare/db'

type AgentRow = InferSelectModel<typeof agents>

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
	toolIds: string[]
	createdAt: string
	updatedAt: string
}

/**
 * Serialize a database agent row to API response format.
 */
export function serializeAgent(agent: AgentRow, toolIds: string[] = []): SerializedAgent {
	return {
		id: agent.id,
		workspaceId: agent.workspaceId,
		name: agent.name,
		description: agent.description,
		model: agent.model,
		instructions: agent.instructions || '',
		config: agent.config || undefined,
		status: agent.status,
		toolIds,
		createdAt: agent.createdAt.toISOString(),
		updatedAt: agent.updatedAt.toISOString(),
	}
}

/**
 * Serialize multiple agents with their tool IDs.
 */
export function serializeAgents(
	agents: AgentRow[],
	toolIdsByAgent: Map<string, string[]>,
): SerializedAgent[] {
	return agents.map((agent) => serializeAgent(agent, toolIdsByAgent.get(agent.id) || []))
}
