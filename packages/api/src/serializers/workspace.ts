import type { InferSelectModel } from 'drizzle-orm'
import type { workspaces } from '@hare/db'
import type { WorkspaceRole } from '@hare/types'

type WorkspaceRow = InferSelectModel<typeof workspaces>

/**
 * API response shape for a workspace.
 */
export interface SerializedWorkspace {
	id: string
	name: string
	description: string | null
	role: WorkspaceRole
	createdAt: string
	updatedAt: string
}

/**
 * Serialize a database workspace row to API response format.
 */
export function serializeWorkspace(
	workspace: WorkspaceRow,
	role: WorkspaceRole,
): SerializedWorkspace {
	return {
		id: workspace.id,
		name: workspace.name,
		description: workspace.description,
		role,
		createdAt: workspace.createdAt.toISOString(),
		updatedAt: workspace.updatedAt.toISOString(),
	}
}
