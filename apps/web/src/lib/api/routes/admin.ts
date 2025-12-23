import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, desc, eq, or } from 'drizzle-orm'
import { betaAccess, workspaceMembers } from 'web-app/db/schema'
import type { Database } from 'web-app/db/types'
import { getDb } from '../db'
import { authMiddleware } from '../middleware'
import { ErrorSchema, IdParamSchema, SuccessSchema } from '../schemas'
import type { AuthEnv } from '../types'

// Beta access schemas
const BetaAccessSchema = z.object({
	id: z.string(),
	userId: z.string(),
	email: z.string(),
	status: z.enum(['active', 'suspended', 'revoked']),
	notes: z.string().nullable(),
	grantedBy: z.string().nullable(),
	grantedAt: z.string(),
	lastAccessAt: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
})

const GrantBetaAccessSchema = z.object({
	email: z.string().email(),
	notes: z.string().optional(),
})

const UpdateBetaAccessSchema = z.object({
	status: z.enum(['active', 'suspended', 'revoked']).optional(),
	notes: z.string().optional(),
})

// Define routes
const listBetaUsersRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Admin'],
	summary: 'List beta users',
	description: 'Get a list of all users with beta access (admin only)',
	responses: {
		200: {
			description: 'List of beta users',
			content: {
				'application/json': {
					schema: z.object({
						users: z.array(BetaAccessSchema),
					}),
				},
			},
		},
		401: {
			description: 'Unauthorized',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		403: {
			description: 'Forbidden - Admin access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

const grantBetaAccessRoute = createRoute({
	method: 'post',
	path: '/',
	tags: ['Admin'],
	summary: 'Grant beta access',
	description: 'Grant beta access to a user by email (admin only)',
	request: {
		body: {
			content: {
				'application/json': {
					schema: GrantBetaAccessSchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: 'Beta access granted',
			content: {
				'application/json': {
					schema: BetaAccessSchema,
				},
			},
		},
		400: {
			description: 'User not found or already has access',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		401: {
			description: 'Unauthorized',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		403: {
			description: 'Forbidden - Admin access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

const updateBetaAccessRoute = createRoute({
	method: 'patch',
	path: '/{id}',
	tags: ['Admin'],
	summary: 'Update beta access',
	description: 'Update beta access status or notes (admin only)',
	request: {
		params: IdParamSchema,
		body: {
			content: {
				'application/json': {
					schema: UpdateBetaAccessSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Beta access updated',
			content: {
				'application/json': {
					schema: BetaAccessSchema,
				},
			},
		},
		404: {
			description: 'Beta access record not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		401: {
			description: 'Unauthorized',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		403: {
			description: 'Forbidden - Admin access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

const revokeBetaAccessRoute = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['Admin'],
	summary: 'Revoke beta access',
	description: 'Revoke beta access from a user (admin only)',
	request: {
		params: IdParamSchema,
	},
	responses: {
		200: {
			description: 'Beta access revoked',
			content: {
				'application/json': {
					schema: SuccessSchema,
				},
			},
		},
		404: {
			description: 'Beta access record not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		401: {
			description: 'Unauthorized',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		403: {
			description: 'Forbidden - Admin access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

// Helper to check if user is admin in any workspace
async function isAdmin(db: Database, userId: string): Promise<boolean> {
	const memberships = await db
		.select()
		.from(workspaceMembers)
		.where(
			and(
				eq(workspaceMembers.userId, userId),
				or(eq(workspaceMembers.role, 'owner'), eq(workspaceMembers.role, 'admin')),
			),
		)

	return memberships.length > 0
}

// Create app
const app = new OpenAPIHono<AuthEnv>()

// Apply auth middleware to all routes
app.use('*', authMiddleware)

// Admin check middleware
app.use('*', async (c, next) => {
	const user = c.get('user')
	const db = await getDb(c)

	const admin = await isAdmin(db, user.id)
	if (!admin) {
		return c.json({ error: 'Admin access required' }, 403)
	}

	await next()
})

// List beta users
app.openapi(listBetaUsersRoute, async (c) => {
	const db = await getDb(c)

	const users = await db.select().from(betaAccess).orderBy(desc(betaAccess.createdAt))

	return c.json(
		{
			users: users.map((u) => ({
				id: u.id,
				userId: u.userId,
				email: u.email,
				status: u.status,
				notes: u.notes,
				grantedBy: u.grantedBy,
				grantedAt: u.grantedAt.toISOString(),
				lastAccessAt: u.lastAccessAt?.toISOString() ?? null,
				createdAt: u.createdAt.toISOString(),
				updatedAt: u.updatedAt.toISOString(),
			})),
		},
		200,
	)
})

// Grant beta access
app.openapi(grantBetaAccessRoute, async (c) => {
	const { email, notes } = c.req.valid('json')
	const db = await getDb(c)
	const user = c.get('user')

	// Find user by email
	const { users } = await import('web-app/db/schema')
	const [targetUser] = await db.select().from(users).where(eq(users.email, email)).limit(1)

	if (!targetUser) {
		return c.json({ error: 'User not found with that email' }, 400)
	}

	// Check if user already has beta access
	const [existing] = await db
		.select()
		.from(betaAccess)
		.where(eq(betaAccess.userId, targetUser.id))
		.limit(1)

	if (existing) {
		return c.json({ error: 'User already has beta access' }, 400)
	}

	// Grant access
	const [access] = await db
		.insert(betaAccess)
		.values({
			userId: targetUser.id,
			email: targetUser.email,
			status: 'active',
			notes: notes || null,
			grantedBy: user.id,
		})
		.returning()

	return c.json(
		{
			id: access.id,
			userId: access.userId,
			email: access.email,
			status: access.status,
			notes: access.notes,
			grantedBy: access.grantedBy,
			grantedAt: access.grantedAt.toISOString(),
			lastAccessAt: access.lastAccessAt?.toISOString() ?? null,
			createdAt: access.createdAt.toISOString(),
			updatedAt: access.updatedAt.toISOString(),
		},
		201,
	)
})

// Update beta access
app.openapi(updateBetaAccessRoute, async (c) => {
	const { id } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = await getDb(c)

	const [existing] = await db.select().from(betaAccess).where(eq(betaAccess.id, id)).limit(1)

	if (!existing) {
		return c.json({ error: 'Beta access record not found' }, 404)
	}

	const [updated] = await db
		.update(betaAccess)
		.set({
			...(data.status && { status: data.status }),
			...(data.notes !== undefined && { notes: data.notes }),
			updatedAt: new Date(),
		})
		.where(eq(betaAccess.id, id))
		.returning()

	return c.json(
		{
			id: updated.id,
			userId: updated.userId,
			email: updated.email,
			status: updated.status,
			notes: updated.notes,
			grantedBy: updated.grantedBy,
			grantedAt: updated.grantedAt.toISOString(),
			lastAccessAt: updated.lastAccessAt?.toISOString() ?? null,
			createdAt: updated.createdAt.toISOString(),
			updatedAt: updated.updatedAt.toISOString(),
		},
		200,
	)
})

// Revoke beta access
app.openapi(revokeBetaAccessRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)

	const result = await db.delete(betaAccess).where(eq(betaAccess.id, id)).returning()

	if (result.length === 0) {
		return c.json({ error: 'Beta access record not found' }, 404)
	}

	return c.json({ success: true }, 200)
})

export default app
