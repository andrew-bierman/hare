/**
 * Workspace Member Routes
 *
 * Member management, invitations, and role updates.
 */

import {
	config,
	INVITATION_STATUSES,
	MEMBER_ROLES,
	WORKSPACE_ROLES,
	WorkspaceRole,
} from '@hare/config'
import { users, workspaceInvitations, workspaceMembers, workspaces } from '@hare/db/schema'
import type { Database } from '@hare/db'
import { and, eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { logAudit } from '../audit'
import { adminPlugin, writePlugin, type AuthUserContext } from '../context'

// =============================================================================
// Schemas
// =============================================================================

const WorkspaceRoleSchema = z.enum(WORKSPACE_ROLES)
const InvitationRoleSchema = z.enum(MEMBER_ROLES)
const InvitationStatusSchema = z.enum(INVITATION_STATUSES)

const SendInvitationInputSchema = z.object({
	email: z.string().email(),
	role: InvitationRoleSchema.optional().default('member'),
})

const UpdateMemberRoleInputSchema = z.object({
	role: InvitationRoleSchema,
})

// =============================================================================
// Helpers
// =============================================================================

async function getUserWorkspaceRole(
	userId: string,
	workspaceId: string,
	db: Database,
): Promise<z.infer<typeof WorkspaceRoleSchema> | null> {
	const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId))
	if (!workspace) return null
	if (workspace.ownerId === userId) return WorkspaceRole.OWNER

	const [membership] = await db
		.select()
		.from(workspaceMembers)
		.where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))

	if (!membership) return null
	return membership.role as z.infer<typeof WorkspaceRoleSchema>
}

function hasAdminAccess(role: z.infer<typeof WorkspaceRoleSchema>): boolean {
	return role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN
}

function auditCtx(ctx: {
	db: Database
	workspaceId: string
	user: AuthUserContext
	request: Request
}) {
	return {
		db: ctx.db,
		workspaceId: ctx.workspaceId,
		userId: ctx.user.id,
		headers: ctx.request.headers,
	}
}

// =============================================================================
// Routes
// =============================================================================

export const workspaceMemberRoutes = new Elysia({
	prefix: '/workspaces',
	name: 'workspace-member-routes',
})
	// --- Write-access routes ---
	.use(writePlugin)

	// List workspace members
	.get('/:id/members', async ({ db, user, params, error }) => {
		const role = await getUserWorkspaceRole(user.id, params.id, db)
		if (!role) return error(404, { error: 'Workspace not found or access denied' })

		const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, params.id))
		if (!workspace) return error(404, { error: 'Workspace not found' })

		const [owner] = await db.select().from(users).where(eq(users.id, workspace.ownerId))

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
			.where(eq(workspaceMembers.workspaceId, params.id))

		const members: Array<{
			id: string
			userId: string
			name: string | null
			email: string
			image: string | null
			role: z.infer<typeof WorkspaceRoleSchema>
			joinedAt: string
		}> = []

		if (owner) {
			members.push({
				id: `owner_${owner.id}`,
				userId: owner.id,
				name: owner.name,
				email: owner.email,
				image: owner.image,
				role: WorkspaceRole.OWNER,
				joinedAt: workspace.createdAt.toISOString(),
			})
		}

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
	}, { writeAccess: true })

	// Remove workspace member
	.delete('/:id/members/:userId', async (ctx) => {
		const { db, user, params, error } = ctx

		const userRole = await getUserWorkspaceRole(user.id, params.id, db)
		if (!userRole) return error(404, { error: 'Workspace not found' })

		const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, params.id))
		if (workspace?.ownerId === params.userId) {
			return error(400, { error: 'Cannot remove workspace owner' })
		}

		if (params.userId !== user.id && !hasAdminAccess(userRole)) {
			return error(400, { error: 'Admin access required to remove other members' })
		}

		const [member] = await db
			.select({
				id: workspaceMembers.id,
				userId: workspaceMembers.userId,
				role: workspaceMembers.role,
				userEmail: users.email,
			})
			.from(workspaceMembers)
			.innerJoin(users, eq(workspaceMembers.userId, users.id))
			.where(
				and(
					eq(workspaceMembers.workspaceId, params.id),
					eq(workspaceMembers.userId, params.userId),
				),
			)

		if (!member) return error(404, { error: 'Member not found' })

		await db.delete(workspaceMembers).where(eq(workspaceMembers.id, member.id))

		await logAudit({
			...auditCtx(ctx),
			action: config.enums.auditAction.MEMBER_REMOVE,
			resourceType: 'member',
			resourceId: member.userId,
			details: { email: member.userEmail, removedRole: member.role },
		})

		return { success: true }
	}, { writeAccess: true })

	// --- Admin-access routes ---
	.use(adminPlugin)

	// Send workspace invitation
	.post('/:id/invites', async (ctx) => {
		const { db, user, params, body, error } = ctx
		const workspaceId = params.id

		const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId))
		if (!workspace) return error(404, { error: 'Workspace not found' })

		const [existingUser] = await db.select().from(users).where(eq(users.email, body.email))

		if (existingUser) {
			if (workspace.ownerId === existingUser.id) {
				return error(400, { error: 'User is already the workspace owner' })
			}

			const [existingMember] = await db
				.select()
				.from(workspaceMembers)
				.where(
					and(
						eq(workspaceMembers.workspaceId, workspaceId),
						eq(workspaceMembers.userId, existingUser.id),
					),
				)

			if (existingMember) {
				return error(400, { error: 'User is already a member of this workspace' })
			}
		}

		const [existingInvitation] = await db
			.select()
			.from(workspaceInvitations)
			.where(
				and(
					eq(workspaceInvitations.workspaceId, workspaceId),
					eq(workspaceInvitations.email, body.email),
					eq(workspaceInvitations.status, 'pending'),
				),
			)

		if (existingInvitation) {
			return error(400, { error: 'An invitation is already pending for this email' })
		}

		const expiresAt = new Date()
		expiresAt.setDate(expiresAt.getDate() + 7)

		const [invitation] = await db
			.insert(workspaceInvitations)
			.values({
				workspaceId,
				email: body.email,
				role: body.role || 'member',
				invitedBy: user.id,
				expiresAt,
			})
			.returning()

		if (!invitation) throw new Error('Failed to create invitation')

		await logAudit({
			...auditCtx(ctx),
			action: config.enums.auditAction.MEMBER_INVITE,
			resourceType: 'member',
			resourceId: invitation.id,
			details: { email: invitation.email, role: invitation.role },
		})

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
	}, { adminAccess: true, body: SendInvitationInputSchema })

	// List pending invitations
	.get('/:id/invites', async ({ db, params }) => {
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
				and(
					eq(workspaceInvitations.workspaceId, params.id),
					eq(workspaceInvitations.status, 'pending'),
				),
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
	}, { adminAccess: true })

	// Revoke invitation
	.delete('/:id/invites/:inviteId', async ({ db, params, error }) => {
		const [invitation] = await db
			.select()
			.from(workspaceInvitations)
			.where(
				and(
					eq(workspaceInvitations.id, params.inviteId),
					eq(workspaceInvitations.workspaceId, params.id),
					eq(workspaceInvitations.status, 'pending'),
				),
			)

		if (!invitation) return error(404, { error: 'Invitation not found' })

		await db
			.update(workspaceInvitations)
			.set({ status: 'revoked', updatedAt: new Date() })
			.where(eq(workspaceInvitations.id, params.inviteId))

		return { success: true }
	}, { adminAccess: true })

	// Update member role
	.patch('/:id/members/:userId', async (ctx) => {
		const { db, params, body, error } = ctx
		const { id: workspaceId, userId } = params

		const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId))
		if (workspace?.ownerId === userId) {
			return error(400, { error: 'Cannot change workspace owner role' })
		}

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
			.where(
				and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
			)

		if (!member) return error(404, { error: 'Member not found' })

		const previousRole = member.role
		await db
			.update(workspaceMembers)
			.set({ role: body.role, updatedAt: new Date() })
			.where(eq(workspaceMembers.id, member.id))

		await logAudit({
			...auditCtx(ctx),
			action: config.enums.auditAction.MEMBER_ROLE_CHANGE,
			resourceType: 'member',
			resourceId: member.userId,
			details: { email: member.userEmail, previousRole, newRole: body.role },
		})

		return {
			id: member.id,
			userId: member.userId,
			name: member.userName,
			email: member.userEmail,
			image: member.userImage,
			role: body.role,
			joinedAt: member.createdAt.toISOString(),
		}
	}, { adminAccess: true, body: UpdateMemberRoleInputSchema })
