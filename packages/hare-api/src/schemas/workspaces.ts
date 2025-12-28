import { z } from '@hono/zod-openapi'

/**
 * Workspace role enum.
 */
export const WorkspaceRoleSchema = z
	.enum(['owner', 'admin', 'member', 'viewer'])
	.openapi({ example: 'owner' })

/**
 * Member role enum (excludes owner - used for invitations and role updates).
 */
export const MemberRoleSchema = z.enum(['admin', 'member', 'viewer']).openapi({ example: 'member' })

/**
 * Invitation status enum.
 */
export const InvitationStatusSchema = z
	.enum(['pending', 'accepted', 'expired', 'revoked'])
	.openapi({ example: 'pending' })

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

/**
 * Workspace member schema for API responses.
 */
export const WorkspaceMemberSchema = z
	.object({
		id: z.string().openapi({ example: 'mem_abc123' }),
		userId: z.string().openapi({ example: 'usr_xyz789' }),
		name: z.string().openapi({ example: 'John Doe' }),
		email: z.string().email().openapi({ example: 'john@example.com' }),
		image: z.string().nullable().openapi({ example: 'https://example.com/avatar.jpg' }),
		role: WorkspaceRoleSchema,
		joinedAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
	})
	.openapi('WorkspaceMember')

/**
 * Workspace invitation schema for API responses.
 */
export const WorkspaceInvitationSchema = z
	.object({
		id: z.string().openapi({ example: 'inv_abc123' }),
		email: z.string().email().openapi({ example: 'invited@example.com' }),
		role: MemberRoleSchema,
		status: InvitationStatusSchema,
		invitedBy: z
			.object({
				id: z.string(),
				name: z.string(),
				email: z.string().email(),
			})
			.openapi({ example: { id: 'usr_xyz789', name: 'John Doe', email: 'john@example.com' } }),
		expiresAt: z.string().datetime().openapi({ example: '2024-12-08T00:00:00Z' }),
		createdAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
	})
	.openapi('WorkspaceInvitation')

/**
 * Schema for sending an invitation.
 */
export const SendInvitationSchema = z
	.object({
		email: z.string().email().openapi({ example: 'invited@example.com' }),
		role: MemberRoleSchema.optional().default('member'),
	})
	.openapi('SendInvitation')

/**
 * Schema for updating a member's role.
 */
export const UpdateMemberRoleSchema = z
	.object({
		role: MemberRoleSchema,
	})
	.openapi('UpdateMemberRole')

/**
 * Workspace ID and User ID params schema.
 */
export const WorkspaceMemberParamsSchema = z
	.object({
		id: z.string().openapi({ example: 'ws_xyz789', description: 'Workspace ID' }),
		userId: z.string().openapi({ example: 'usr_abc123', description: 'User ID' }),
	})
	.openapi('WorkspaceMemberParams')
