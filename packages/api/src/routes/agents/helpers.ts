/**
 * Agent route helper functions
 */

import type { Database } from '@hare/db'
import { agents, agentTools } from '@hare/db/schema'
import { and, eq } from 'drizzle-orm'

/**
 * Input for getting agent tool IDs.
 */
interface GetAgentToolIdsInput {
	agentId: string
	db: Database
}

/**
 * Get tool IDs attached to an agent.
 */
export async function getAgentToolIds(input: GetAgentToolIdsInput): Promise<string[]> {
	const { agentId, db } = input
	const rows = await db
		.select({ toolId: agentTools.toolId })
		.from(agentTools)
		.where(eq(agentTools.agentId, agentId))
	return rows.map((r) => r.toolId)
}

/**
 * Input for finding an agent by ID and workspace.
 */
interface FindAgentByIdAndWorkspaceInput {
	db: Database
	id: string
	workspaceId: string
}

/**
 * Find an agent by ID and workspace, or return null.
 */
export async function findAgentByIdAndWorkspace(input: FindAgentByIdAndWorkspaceInput) {
	const { db, id, workspaceId } = input
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, id), eq(agents.workspaceId, workspaceId)))
	return agent || null
}
