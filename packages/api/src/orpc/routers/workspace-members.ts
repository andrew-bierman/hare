/**
 * oRPC Workspace Members Router
 *
 * Handles workspace member and invitation management with full type safety.
 */

import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { users, workspaceInvitations, workspaceMembers, workspaces } from '@hare/db/schema'
import { config, WORKSPACE_ROLES, MEMBER_ROLES, INVITATION_STATUSES } from '@hare/config'
import { requireWrite, requireAdmin, notFound, badRequest, serverError, type WorkspaceContext } from '../base'
import { SuccessSchema, IdParamSchema } from '../../schemas'

// =============================================================================
// Type-Safe Schemas
// =============================================================================

/** Workspace role enum */
const WorkspaceRoleSchema = z.enum(WORKSPACE_ROLES)

/** Invitation role enum (excludes owner) */
const InvitationRoleSchema = z.enum(MEMBER_ROLES)

/** Invitation status enum */
const InvitationStatusSchema = z.enum(INVITATION_STATUSES)

const WorkspaceMemberSchema = z.object({
	id: z.string(),
	userId: z.string(),
	name: z.string().nullable(),
	email: z.string(),
	image: z.string().nullable(),
	role: WorkspaceRoleSchema,
	joinedAt: z.string(),
})

const WorkspaceInvitationSchema = z.object({
	id: z.string(),
	email: z.string(),
	role: InvitationRoleSchema,
	status: InvitationStatusSchema,
	invitedBy: z.object({
		id: z.string(),
		name: z.string().nullable(),
		email: z.string(),
	}),
	expiresAt: z.string(),
	createdAt: z.string(),
})

const SendInvitationInputSchema = z.object({
	email: z.string().email(),
	role: InvitationRoleSchema.optional().default('member'),
})

const UpdateMemberRoleInputSchema = z.object({
	role: InvitationRoleSchema,
})

const MemberParamsSchema = z.object({
	id: z.string(), // workspace ID
	userId: z.string(),
})

const InviteParamsSchema = z.object({
	id: z.string(), // workspace ID
	inviteId: z.string(),
})

// =============================================================================
// Helpers
// =============================================================================

async function getUserWorkspaceRole(
	userId: string,
	workspaceId: string,
	db: WorkspaceContext['db'],
): Promise<z.infer<typeof WorkspaceRoleSchema> | null> {
	const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId))

	if (!workspace) return null
	if (workspace.ownerId === userId) return 'owner'

	const [membership] = await db
		.select()
		.from(workspaceMembers)
		.where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))

	if (!membership) return null
	return membership.role as z.infer<typeof WorkspaceRoleSchema>
}

function hasAdminAccess(role: z.infer<typeof WorkspaceRoleSchema>): boolean {
	return role === 'owner' || role === 'admin'
}

// =============================================================================
// Procedures
// =============================================================================

/**
 * List workspace members
 */
export const listMembers = requireWrite
	.route({ method: 'GET', path: '/workspaces/{id}/members' })
	.input(IdParamSchema)
	.output(z.object({ members: z.array(WorkspaceMemberSchema) }))
	.handler(async ({ input, context }) => {
		const { db, user } = context

		const role = await getUserWorkspaceRole(user.id, input.id, db)
		if (!role) notFound('Workspace not found or access denied')

		// Get workspace to find owner
		const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, input.id))
		if (!workspace) notFound('Workspace not found')

		// Get owner info
		const [owner] = await db.select().from(users).where(eq(users.id, workspace.ownerId))

		// Get all members
		const memberships = await db
			.select({
				id: workspaceMembers.id,
				userId: workspaceMembers.userId,
				role: workspaceMembers.role,
				createdAt: workspaceMembers.createdAt,
				userName: users.name,
				userEmail: users.email,
				userImage: users.image,
			})
			.from(workspaceMembers)
			.innerJoin(users, eq(workspaceMembers.userId, users.id))
			.where(eq(workspaceMembers.workspaceId, input.id))

		const members: z.infer<typeof WorkspaceMemberSchema>[] = []

		// Add owner first
		if (owner) {
			members.push({
				id: `owner_${owner.id}`,
				userId: owner.id,
				name: owner.name,
				email: owner.email,
				image: owner.image,
				role: 'owner',
				joinedAt: workspace.createdAt.toISOString(),
			})
		}

		// Add other members
		for (const m of memberships) {
			if (m.userId !== workspace.ownerId) {
				members.push({
					id: m.id,
					userId: m.userId,
					name: m.userName,
					email: m.userEmail,
					image: m.userImage,
					role: m.role as z.infer<typeof WorkspaceRoleSchema>,
					joinedAt: m.createdAt.toISOString(),
				})
			}
		}

		return { members }
	})

/**
 * Send workspace invitation
 */
export const sendInvitation = requireAdmin
	.route({ method: 'POST', path: '/workspaces/{id}/invites', successStatus: 201 })
	.input(IdParamSchema.merge(SendInvitationInputSchema))
	.output(WorkspaceInvitationSchema)
	.handler(async ({ input, context }) => {
		const { db, user } = context
		const { id: workspaceId, email, role } = input

		// Fetch workspace
		const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId))
		if (!workspace) notFound('Workspace not found')

		// Check if user already exists and is a member
		const [existingUser] = await db.select().from(users).where(eq(users.email, email))

		if (existingUser) {
			if (workspace.ownerId === existingUser.id) {
				badRequest('User is already the workspace owner')
			}

			const [existingMember] = await db
				.select()
				.from(workspaceMembers)
				.where(
					and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, existingUser.id)),
				)

			if (existingMember) {
				badRequest('User is already a member of this workspace')
			}
		}

		// Check for existing pending invitation
		const [existingInvitation] = await db
			.select()
			.from(workspaceInvitations)
			.where(
				and(
					eq(workspaceInvitations.workspaceId, workspaceId),
					eq(workspaceInvitations.email, email),
					eq(workspaceInvitations.status, 'pending'),
				),
			)

		if (existingInvitation) {
			badRequest('An invitation is already pending for this email')
		}

		// Create invitation (expires in 7 days)
		const expiresAt = new Date()
		expiresAt.setDate(expiresAt.getDate() + 7)

		const [invitation] = await db
			.insert(workspaceInvitations)
			.values({
				workspaceId,
				email,
				role: role || 'member',
				invitedBy: user.id,
				expiresAt,
			})
			.returning()

		if (!invitation) serverError('Failed to create invitation')

		return {
			id: invitation.id,
			email: invitation.email,
			role: invitation.role as z.infer<typeof InvitationRoleSchema>,
			status: invitation.status as z.infer<typeof InvitationStatusSchema>,
			invitedBy: {
				id: user.id,
				name: user.name,
				email: user.email,
			},
			expiresAt: invitation.expiresAt.toISOString(),
			createdAt: invitation.createdAt.toISOString(),
		}
	})

/**
 * List pending invitations
 */
export const listInvitations = requireAdmin
	.route({ method: 'GET', path: '/workspaces/{id}/invites' })
	.input(IdParamSchema)
	.output(z.object({ invitations: z.array(WorkspaceInvitationSchema) }))
	.handler(async ({ input, context }) => {
		const { db } = context

		const invitations = await db
			.select({
				id: workspaceInvitations.id,
				email: workspaceInvitations.email,
				role: workspaceInvitations.role,
				status: workspaceInvitations.status,
				expiresAt: workspaceInvitations.expiresAt,
				createdAt: workspaceInvitations.createdAt,
				invitedById: workspaceInvitations.invitedBy,
				inviterName: users.name,
				inviterEmail: users.email,
			})
			.from(workspaceInvitations)
			.innerJoin(users, eq(workspaceInvitations.invitedBy, users.id))
			.where(
				and(eq(workspaceInvitations.workspaceId, input.id), eq(workspaceInvitations.status, 'pending')),
			)

		return {
			invitations: invitations.map((inv) => ({
				id: inv.id,
				email: inv.email,
				role: inv.role as z.infer<typeof InvitationRoleSchema>,
				status: inv.status as z.infer<typeof InvitationStatusSchema>,
				invitedBy: {
					id: inv.invitedById,
					name: inv.inviterName,
					email: inv.inviterEmail,
				},
				expiresAt: inv.expiresAt.toISOString(),
				createdAt: inv.createdAt.toISOString(),
			})),
		}
	})

/**
 * Revoke invitation
 */
export const revokeInvitation = requireAdmin
	.route({ method: 'DELETE', path: '/workspaces/{id}/invites/{inviteId}' })
	.input(InviteParamsSchema)
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db } = context

		const [invitation] = await db
			.select()
			.from(workspaceInvitations)
			.where(
				and(
					eq(workspaceInvitations.id, input.inviteId),
					eq(workspaceInvitations.workspaceId, input.id),
					eq(workspaceInvitations.status, 'pending'),
				),
			)

		if (!invitation) notFound('Invitation not found')

		await db
			.update(workspaceInvitations)
			.set({ status: 'revoked', updatedAt: new Date() })
			.where(eq(workspaceInvitations.id, input.inviteId))

		return { success: true }
	})

/**
 * Remove workspace member
 */
export const removeMember = requireWrite
	.route({ method: 'DELETE', path: '/workspaces/{id}/members/{userId}' })
	.input(MemberParamsSchema)
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db, user } = context

		const userRole = await getUserWorkspaceRole(user.id, input.id, db)
		if (!userRole) notFound('Workspace not found')

		// Check if trying to remove the owner
		const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, input.id))
		if (workspace?.ownerId === input.userId) {
			badRequest('Cannot remove workspace owner')
		}

		// Users can remove themselves, admins can remove anyone
		if (input.userId !== user.id && !hasAdminAccess(userRole)) {
			badRequest('Admin access required to remove other members')
		}

		const [member] = await db
			.select()
			.from(workspaceMembers)
			.where(and(eq(workspaceMembers.workspaceId, input.id), eq(workspaceMembers.userId, input.userId)))

		if (!member) notFound('Member not found')

		await db.delete(workspaceMembers).where(eq(workspaceMembers.id, member.id))

		return { success: true }
	})

/**
 * Update member role
 */
export const updateMemberRole = requireAdmin
	.route({ method: 'PATCH', path: '/workspaces/{id}/members/{userId}' })
	.input(MemberParamsSchema.merge(UpdateMemberRoleInputSchema))
	.output(WorkspaceMemberSchema)
	.handler(async ({ input, context }) => {
		const { db } = context
		const { id: workspaceId, userId, role: newRole } = input

		// Check if trying to change owner's role
		const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId))
		if (workspace?.ownerId === userId) {
			badRequest('Cannot change workspace owner role')
		}

		// Get member
		const [member] = await db
			.select({
				id: workspaceMembers.id,
				userId: workspaceMembers.userId,
				role: workspaceMembers.role,
				createdAt: workspaceMembers.createdAt,
				userName: users.name,
				userEmail: users.email,
				userImage: users.image,
			})
			.from(workspaceMembers)
			.innerJoin(users, eq(workspaceMembers.userId, users.id))
			.where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))

		if (!member) notFound('Member not found')

		// Update role
		await db
			.update(workspaceMembers)
			.set({ role: newRole, updatedAt: new Date() })
			.where(eq(workspaceMembers.id, member.id))

		return {
			id: member.id,
			userId: member.userId,
			name: member.userName,
			email: member.userEmail,
			image: member.userImage,
			role: newRole,
			joinedAt: member.createdAt.toISOString(),
		}
	})

// =============================================================================
// Router Export
// =============================================================================

export const workspaceMembersRouter = {
	listMembers,
	sendInvitation,
	listInvitations,
	revokeInvitation,
	removeMember,
	updateMemberRole,
}
