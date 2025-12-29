import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { users, workspaceInvitations, workspaceMembers, workspaces } from 'web-app/db/schema'
import { getDb } from '../db'
import {
	commonResponses,
	ErrorSchema,
	hasAdminAccess,
	IdParamSchema,
	requireAdminAccess,
	SuccessSchema,
} from '../helpers'
import { authMiddleware } from '../middleware'
import {
	SendInvitationSchema,
	UpdateMemberRoleSchema,
	WorkspaceInvitationSchema,
	WorkspaceMemberParamsSchema,
	WorkspaceMemberSchema,
} from '../schemas'
import { type AuthEnv, isWorkspaceRole, type WorkspaceRole } from '@hare/types'

// =============================================================================
// Route Definitions
// =============================================================================

const listMembersRoute = createRoute({
	method: 'get',
	path: '/{id}/members',
	tags: ['Workspaces'],
	summary: 'List workspace members',
	description: 'Get all members of a workspace',
	request: {
		params: IdParamSchema,
	},
	responses: {
		200: {
			description: 'List of workspace members',
			content: {
				'application/json': {
					schema: z.object({
						members: z.array(WorkspaceMemberSchema),
					}),
				},
			},
		},
		403: {
			description: 'Access denied',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Workspace not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const sendInvitationRoute = createRoute({
	method: 'post',
	path: '/{id}/invites',
	tags: ['Workspaces'],
	summary: 'Send workspace invitation',
	description: 'Send an invitation to join the workspace via email',
	request: {
		params: IdParamSchema,
		body: {
			content: {
				'application/json': {
					schema: SendInvitationSchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: 'Invitation sent successfully',
			content: {
				'application/json': {
					schema: WorkspaceInvitationSchema,
				},
			},
		},
		400: {
			description: 'User is already a member or has a pending invitation',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		403: {
			description: 'Admin access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Workspace not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		500: {
			description: 'Failed to create invitation',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const listInvitationsRoute = createRoute({
	method: 'get',
	path: '/{id}/invites',
	tags: ['Workspaces'],
	summary: 'List pending invitations',
	description: 'Get all pending invitations for a workspace',
	request: {
		params: IdParamSchema,
	},
	responses: {
		200: {
			description: 'List of pending invitations',
			content: {
				'application/json': {
					schema: z.object({
						invitations: z.array(WorkspaceInvitationSchema),
					}),
				},
			},
		},
		403: {
			description: 'Admin access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Workspace not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const revokeInvitationRoute = createRoute({
	method: 'delete',
	path: '/{id}/invites/{inviteId}',
	tags: ['Workspaces'],
	summary: 'Revoke invitation',
	description: 'Revoke a pending invitation',
	request: {
		params: z.object({
			id: z.string().openapi({ example: 'ws_xyz789', description: 'Workspace ID' }),
			inviteId: z.string().openapi({ example: 'inv_abc123', description: 'Invitation ID' }),
		}),
	},
	responses: {
		200: {
			description: 'Invitation revoked successfully',
			content: { 'application/json': { schema: SuccessSchema } },
		},
		403: {
			description: 'Admin access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Invitation not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const removeMemberRoute = createRoute({
	method: 'delete',
	path: '/{id}/members/{userId}',
	tags: ['Workspaces'],
	summary: 'Remove workspace member',
	description: 'Remove a member from the workspace',
	request: {
		params: WorkspaceMemberParamsSchema,
	},
	responses: {
		200: {
			description: 'Member removed successfully',
			content: { 'application/json': { schema: SuccessSchema } },
		},
		400: {
			description: 'Cannot remove workspace owner',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		403: {
			description: 'Admin access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Member not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const updateMemberRoleRoute = createRoute({
	method: 'patch',
	path: '/{id}/members/{userId}',
	tags: ['Workspaces'],
	summary: 'Update member role',
	description: 'Change the role of a workspace member',
	request: {
		params: WorkspaceMemberParamsSchema,
		body: {
			content: {
				'application/json': {
					schema: UpdateMemberRoleSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Role updated successfully',
			content: {
				'application/json': {
					schema: WorkspaceMemberSchema,
				},
			},
		},
		400: {
			description: 'Cannot change owner role',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		403: {
			description: 'Admin access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Member not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

// =============================================================================
// Helper Functions
// =============================================================================

async function getUserWorkspaceRole(
	userId: string,
	workspaceId: string,
	db: Awaited<ReturnType<typeof getDb>>,
): Promise<WorkspaceRole | null> {
	const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId))

	if (!workspace) return null
	if (workspace.ownerId === userId) return 'owner'

	const [membership] = await db
		.select()
		.from(workspaceMembers)
		.where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))

	if (!membership) return null
	if (!isWorkspaceRole(membership.role)) {
		throw new Error(`Invalid workspace role in database: ${membership.role}`)
	}
	return membership.role
}

// =============================================================================
// App Setup
// =============================================================================

const app = new OpenAPIHono<AuthEnv>()

app.use('*', authMiddleware)

// =============================================================================
// Route Handlers
// =============================================================================

app.openapi(listMembersRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = getDb(c)
	const user = c.get('user')

	const role = await getUserWorkspaceRole(user.id, id, db)
	if (!role) {
		return c.json({ error: 'Workspace not found or access denied' }, 404)
	}

	// Get workspace to find owner
	const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id))

	if (!workspace) {
		return c.json({ error: 'Workspace not found' }, 404)
	}

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
		.where(eq(workspaceMembers.workspaceId, id))

	// Combine owner and members
	const members = []

	// Add owner first
	if (owner) {
		members.push({
			id: `owner_${owner.id}`,
			userId: owner.id,
			name: owner.name,
			email: owner.email,
			image: owner.image,
			role: 'owner' as const,
			joinedAt: workspace.createdAt.toISOString(),
		})
	}

	// Add other members (excluding owner if they somehow appear)
	for (const m of memberships) {
		if (m.userId !== workspace.ownerId) {
			members.push({
				id: m.id,
				userId: m.userId,
				name: m.userName,
				email: m.userEmail,
				image: m.userImage,
				role: m.role as WorkspaceRole,
				joinedAt: m.createdAt.toISOString(),
			})
		}
	}

	return c.json({ members }, 200)
})

app.openapi(sendInvitationRoute, async (c) => {
	const { id } = c.req.valid('param')
	const { email, role } = c.req.valid('json')
	const db = getDb(c)
	const user = c.get('user')

	const userRole = await getUserWorkspaceRole(user.id, id, db)
	if (!userRole) {
		return c.json({ error: 'Workspace not found' }, 404)
	}

	if (!hasAdminAccess(userRole)) {
		return c.json({ error: 'Admin access required' }, 403)
	}

	// Check if user already exists and is a member
	const [existingUser] = await db.select().from(users).where(eq(users.email, email))

	if (existingUser) {
		// Check if they're the owner
		const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id))

		if (workspace?.ownerId === existingUser.id) {
			return c.json({ error: 'User is already the workspace owner' }, 400)
		}

		// Check if they're already a member
		const [existingMember] = await db
			.select()
			.from(workspaceMembers)
			.where(
				and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, existingUser.id)),
			)

		if (existingMember) {
			return c.json({ error: 'User is already a member of this workspace' }, 400)
		}
	}

	// Check for existing pending invitation
	const [existingInvitation] = await db
		.select()
		.from(workspaceInvitations)
		.where(
			and(
				eq(workspaceInvitations.workspaceId, id),
				eq(workspaceInvitations.email, email),
				eq(workspaceInvitations.status, 'pending'),
			),
		)

	if (existingInvitation) {
		return c.json({ error: 'An invitation is already pending for this email' }, 400)
	}

	// Create invitation (expires in 7 days)
	const expiresAt = new Date()
	expiresAt.setDate(expiresAt.getDate() + 7)

	const [invitation] = await db
		.insert(workspaceInvitations)
		.values({
			workspaceId: id,
			email,
			role: role || 'member',
			invitedBy: user.id,
			expiresAt,
		})
		.returning()

	if (!invitation) {
		return c.json({ error: 'Failed to create invitation' }, 500)
	}

	// TODO: Send email notification (not implemented in this PR)

	return c.json(
		{
			id: invitation.id,
			email: invitation.email,
			role: invitation.role as 'admin' | 'member' | 'viewer',
			status: invitation.status as 'pending' | 'accepted' | 'expired' | 'revoked',
			invitedBy: {
				id: user.id,
				name: user.name || '',
				email: user.email,
			},
			expiresAt: invitation.expiresAt.toISOString(),
			createdAt: invitation.createdAt.toISOString(),
		},
		201,
	)
})

app.openapi(listInvitationsRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = getDb(c)
	const user = c.get('user')

	const role = await getUserWorkspaceRole(user.id, id, db)
	if (!role) {
		return c.json({ error: 'Workspace not found' }, 404)
	}

	if (!hasAdminAccess(role)) {
		return c.json({ error: 'Admin access required' }, 403)
	}

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
			and(eq(workspaceInvitations.workspaceId, id), eq(workspaceInvitations.status, 'pending')),
		)

	const formattedInvitations = invitations.map((inv) => ({
		id: inv.id,
		email: inv.email,
		role: inv.role as 'admin' | 'member' | 'viewer',
		status: inv.status as 'pending' | 'accepted' | 'expired' | 'revoked',
		invitedBy: {
			id: inv.invitedById,
			name: inv.inviterName,
			email: inv.inviterEmail,
		},
		expiresAt: inv.expiresAt.toISOString(),
		createdAt: inv.createdAt.toISOString(),
	}))

	return c.json({ invitations: formattedInvitations }, 200)
})

app.openapi(revokeInvitationRoute, async (c) => {
	const { id, inviteId } = c.req.valid('param')
	const db = getDb(c)
	const user = c.get('user')

	const role = await getUserWorkspaceRole(user.id, id, db)
	if (!role) {
		return c.json({ error: 'Workspace not found' }, 404)
	}

	if (!hasAdminAccess(role)) {
		return c.json({ error: 'Admin access required' }, 403)
	}

	const [invitation] = await db
		.select()
		.from(workspaceInvitations)
		.where(
			and(
				eq(workspaceInvitations.id, inviteId),
				eq(workspaceInvitations.workspaceId, id),
				eq(workspaceInvitations.status, 'pending'),
			),
		)

	if (!invitation) {
		return c.json({ error: 'Invitation not found' }, 404)
	}

	await db
		.update(workspaceInvitations)
		.set({ status: 'revoked', updatedAt: new Date() })
		.where(eq(workspaceInvitations.id, inviteId))

	return c.json({ success: true }, 200)
})

app.openapi(removeMemberRoute, async (c) => {
	const { id, userId } = c.req.valid('param')
	const db = getDb(c)
	const user = c.get('user')

	const userRole = await getUserWorkspaceRole(user.id, id, db)
	if (!userRole) {
		return c.json({ error: 'Workspace not found' }, 404)
	}

	// Check if trying to remove the owner
	const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id))

	if (workspace?.ownerId === userId) {
		return c.json({ error: 'Cannot remove workspace owner' }, 400)
	}

	// Users can remove themselves, admins can remove anyone
	if (userId !== user.id && !hasAdminAccess(userRole)) {
		return c.json({ error: 'Admin access required to remove other members' }, 403)
	}

	const [member] = await db
		.select()
		.from(workspaceMembers)
		.where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, userId)))

	if (!member) {
		return c.json({ error: 'Member not found' }, 404)
	}

	await db.delete(workspaceMembers).where(eq(workspaceMembers.id, member.id))

	return c.json({ success: true }, 200)
})

app.openapi(updateMemberRoleRoute, async (c) => {
	const { id, userId } = c.req.valid('param')
	const { role: newRole } = c.req.valid('json')
	const db = getDb(c)
	const user = c.get('user')

	const userRole = await getUserWorkspaceRole(user.id, id, db)
	if (!userRole) {
		return c.json({ error: 'Workspace not found' }, 404)
	}

	requireAdminAccess(userRole)

	// Check if trying to change owner's role
	const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id))

	if (workspace?.ownerId === userId) {
		return c.json({ error: 'Cannot change workspace owner role' }, 400)
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
		.where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, userId)))

	if (!member) {
		return c.json({ error: 'Member not found' }, 404)
	}

	// Update role
	await db
		.update(workspaceMembers)
		.set({ role: newRole, updatedAt: new Date() })
		.where(eq(workspaceMembers.id, member.id))

	return c.json(
		{
			id: member.id,
			userId: member.userId,
			name: member.userName,
			email: member.userEmail,
			image: member.userImage,
			role: newRole,
			joinedAt: member.createdAt.toISOString(),
		},
		200,
	)
})

export default app
