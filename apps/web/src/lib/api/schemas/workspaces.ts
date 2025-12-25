import { z } from '@hono/zod-openapi'

/**
 * Workspace role enum.
 */
export const WorkspaceRoleSchema = z
	.enum(['owner', 'admin', 'member', 'viewer'])
	.openapi({ example: 'owner' })

/**
 * Full workspace schema for API responses.
 */
export const WorkspaceSchema = z
	.object({
		id: z.string().openapi({ example: 'ws_xyz789' }),
		name: z.string().openapi({ example: 'My Workspace' }),
		description: z.string().nullable().openapi({ example: 'Default workspace' }),
		role: WorkspaceRoleSchema,
		createdAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
		updatedAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
	})
	.openapi('Workspace')

/**
 * Schema for creating a new workspace.
 */
export const CreateWorkspaceSchema = z
	.object({
		name: z.string().min(1).max(100).openapi({ example: 'My Workspace' }),
		description: z.string().optional().openapi({ example: 'A workspace for my agents' }),
	})
	.openapi('CreateWorkspace')

/**
 * Schema for updating a workspace.
 */
export const UpdateWorkspaceSchema = z
	.object({
		name: z.string().min(1).max(100).optional().openapi({ example: 'Updated Workspace' }),
		description: z.string().optional().openapi({ example: 'Updated description' }),
	})
	.openapi('UpdateWorkspace')
