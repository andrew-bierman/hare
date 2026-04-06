import { INVITATION_STATUSES, MEMBER_ROLES, WORKSPACE_ROLES } from '@hare/config'
import { z } from 'zod'

/**
 * Workspace role enum.
 */
export const WorkspaceRoleSchema = z.enum(WORKSPACE_ROLES)

/**
 * Member role enum (excludes owner - used for invitations and role updates).
 */
export const MemberRoleSchema = z.enum(MEMBER_ROLES)

/**
 * Invitation status enum.
 */
export const InvitationStatusSchema = z.enum(INVITATION_STATUSES)

/**
 * Full workspace schema for API responses.
 */
export const WorkspaceSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	role: WorkspaceRoleSchema,
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

/**
 * Schema for creating a new workspace.
 */
export const CreateWorkspaceSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().nullish(),
})

/**
 * Schema for updating a workspace.
 */
export const UpdateWorkspaceSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().nullish(),
})

/**
 * Workspace member schema for API responses.
 */
export const WorkspaceMemberSchema = z.object({
	id: z.string(),
	userId: z.string(),
	name: z.string(),
	email: z.string().email(),
	image: z.string().nullable(),
	role: WorkspaceRoleSchema,
	joinedAt: z.string().datetime(),
})

/**
 * Workspace invitation schema for API responses.
 */
export const WorkspaceInvitationSchema = z.object({
	id: z.string(),
	email: z.string().email(),
	role: MemberRoleSchema,
	status: InvitationStatusSchema,
	invitedBy: z.object({
		id: z.string(),
		name: z.string(),
		email: z.string().email(),
	}),
	expiresAt: z.string().datetime(),
	createdAt: z.string().datetime(),
})

/**
 * Schema for sending an invitation.
 */
export const SendInvitationSchema = z.object({
	email: z.string().email(),
	role: MemberRoleSchema.optional().default('member'),
})

/**
 * Schema for updating a member's role.
 */
export const UpdateMemberRoleSchema = z.object({
	role: MemberRoleSchema,
})

/**
 * Workspace ID and User ID params schema.
 */
export const WorkspaceMemberParamsSchema = z.object({
	id: z.string(),
	userId: z.string(),
})
