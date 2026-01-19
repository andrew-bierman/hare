/**
 * Unit tests for workspace API routes (oRPC)
 *
 * Tests cover:
 * - workspaces.list - List user's workspaces
 * - workspaces.create - Create new workspace
 * - workspaces.create - Validates workspace name uniqueness (slug)
 * - workspaces.get - Get workspace details
 * - workspaces.update - Update workspace settings
 * - workspaces.delete - Delete workspace (owner only)
 * - workspaceMembers.sendInvitation - Invite team member
 * - workspaceMembers.removeMember - Remove member
 * - workspaceMembers.updateMemberRole - Update member role
 * - Workspace switching persists in session
 *
 * oRPC uses pathname-based routing: workspaces.list -> /api/rpc/workspaces/list
 */

import { env } from 'cloudflare:test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '@hare/api'
import { applyMigrations } from './setup'

// Augment the cloudflare:test module with the bindings we use
declare module 'cloudflare:test' {
	interface ProvidedEnv {
		DB: D1Database
		KV: KVNamespace
		R2: R2Bucket
	}
}

// Suppress expected Better Auth APIError unhandled rejections
const originalUnhandledRejection = process.listeners('unhandledRejection')
const suppressAPIError = (reason: unknown) => {
	if (reason && typeof reason === 'object' && 'status' in reason) {
		return
	}
	throw reason
}

// Test counter for unique emails
let testCounter = 0
function generateTestEmail(): string {
	testCounter++
	return `test-workspace-${Date.now()}-${testCounter}@example.com`
}

// Helper to sign up a test user and return session cookie and user data
async function signUpTestUser(email: string, password: string, name: string) {
	const res = await app.request(
		'/api/auth/sign-up/email',
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, name }),
		},
		env,
	)
	const json = (await res.json()) as { user?: { id: string } }
	const setCookie = res.headers.get('set-cookie')
	return { res, setCookie, userId: json.user?.id }
}

// Helper to create a workspace directly in DB
async function createWorkspace(options: {
	id: string
	name: string
	slug: string
	ownerId: string
	description?: string
}) {
	const nowSeconds = Math.floor(Date.now() / 1000)
	await env.DB.prepare(
		`INSERT INTO workspaces (id, name, slug, description, ownerId, createdAt, updatedAt)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(
			options.id,
			options.name,
			options.slug,
			options.description ?? null,
			options.ownerId,
			nowSeconds,
			nowSeconds,
		)
		.run()
}

// Helper to add workspace member
async function addWorkspaceMember(options: {
	id: string
	workspaceId: string
	userId: string
	role: string
}) {
	const nowSeconds = Math.floor(Date.now() / 1000)
	await env.DB.prepare(
		`INSERT INTO workspace_members (id, workspaceId, userId, role, createdAt, updatedAt)
		 VALUES (?, ?, ?, ?, ?, ?)`,
	)
		.bind(options.id, options.workspaceId, options.userId, options.role, nowSeconds, nowSeconds)
		.run()
}

/**
 * Helper to make oRPC request
 * oRPC protocol: procedure path uses forward slashes (workspaces.list -> /workspaces/list)
 * Input is passed as JSON in the request body
 */
async function orpcRequest(options: {
	procedure: string // e.g., "workspaces/list", "workspaces/get"
	cookie?: string | null
	workspaceId?: string
	body?: unknown
}) {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	}
	if (options.cookie) {
		headers['Cookie'] = options.cookie
	}
	if (options.workspaceId) {
		headers['X-Workspace-Id'] = options.workspaceId
	}

	// oRPC expects input wrapped in { json: ..., meta: [] }
	const requestBody =
		options.body !== undefined ? { json: options.body, meta: [] } : { json: {}, meta: [] }

	return app.request(
		`/api/rpc/${options.procedure}`,
		{
			method: 'POST', // oRPC uses POST by default
			headers,
			body: JSON.stringify(requestBody),
		},
		env,
	)
}

/**
 * Helper to parse oRPC response
 * oRPC wraps response in { json: ..., meta: [] }
 */
async function parseOrpcResponse<T>(res: Response): Promise<T> {
	const data = (await res.json()) as { json: T; meta?: unknown[] }
	return data.json
}

beforeAll(async () => {
	await applyMigrations(env.DB)
	process.removeAllListeners('unhandledRejection')
	process.on('unhandledRejection', suppressAPIError)
})

afterAll(() => {
	process.removeAllListeners('unhandledRejection')
	for (const listener of originalUnhandledRejection) {
		process.on('unhandledRejection', listener as (...args: unknown[]) => void)
	}
})

describe('Workspace API Routes', () => {
	describe('workspaces.list - List workspaces', () => {
		it('returns 401 for unauthenticated request', async () => {
			const res = await orpcRequest({
				procedure: 'workspaces/list',
			})
			expect(res.status).toBe(401)
		})

		it('returns empty array for new user with no workspaces', async () => {
			const email = generateTestEmail()
			const { setCookie } = await signUpTestUser(email, 'SecurePass123!', 'Test User')

			const res = await orpcRequest({
				procedure: 'workspaces/list',
				cookie: setCookie,
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ workspaces: unknown[] }>(res)
			expect(json.workspaces).toEqual([])
		})

		it("returns list of user's workspaces", async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_list_${Date.now()}`
			const workspaceSlug = `list-workspace-${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'List Workspace',
				slug: workspaceSlug,
				ownerId: userId!,
			})

			// Add user as owner member
			await addWorkspaceMember({
				id: `member_list_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			const res = await orpcRequest({
				procedure: 'workspaces/list',
				cookie: setCookie,
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ workspaces: Array<{ name: string; slug: string }> }>(
				res,
			)
			expect(json.workspaces).toHaveLength(1)
			expect(json.workspaces[0]?.name).toBe('List Workspace')
			expect(json.workspaces[0]?.slug).toBe(workspaceSlug)
		})

		it('returns multiple workspaces user is member of', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')

			// Create and add user to two workspaces
			const wsId1 = `ws_multi_1_${Date.now()}`
			const wsId2 = `ws_multi_2_${Date.now()}`

			await createWorkspace({
				id: wsId1,
				name: 'Workspace One',
				slug: `workspace-one-${Date.now()}`,
				ownerId: userId!,
			})

			await createWorkspace({
				id: wsId2,
				name: 'Workspace Two',
				slug: `workspace-two-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_multi_1_${Date.now()}`,
				workspaceId: wsId1,
				userId: userId!,
				role: 'owner',
			})

			await addWorkspaceMember({
				id: `member_multi_2_${Date.now()}`,
				workspaceId: wsId2,
				userId: userId!,
				role: 'owner',
			})

			const res = await orpcRequest({
				procedure: 'workspaces/list',
				cookie: setCookie,
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ workspaces: Array<{ name: string }> }>(res)
			expect(json.workspaces).toHaveLength(2)
			expect(json.workspaces.map((w) => w.name).sort()).toEqual(['Workspace One', 'Workspace Two'])
		})

		it('does not return workspaces user is not a member of', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { setCookie: cookie1, userId: userId1 } = await signUpTestUser(
				email1,
				'SecurePass123!',
				'User 1',
			)
			const { userId: userId2 } = await signUpTestUser(email2, 'SecurePass123!', 'User 2')

			// User 1's workspace
			const wsId1 = `ws_isolation_1_${Date.now()}`
			await createWorkspace({
				id: wsId1,
				name: 'User 1 Workspace',
				slug: `user-1-workspace-${Date.now()}`,
				ownerId: userId1!,
			})

			await addWorkspaceMember({
				id: `member_iso_1_${Date.now()}`,
				workspaceId: wsId1,
				userId: userId1!,
				role: 'owner',
			})

			// User 2's workspace (user 1 should not see this)
			const wsId2 = `ws_isolation_2_${Date.now()}`
			await createWorkspace({
				id: wsId2,
				name: 'User 2 Workspace',
				slug: `user-2-workspace-${Date.now()}`,
				ownerId: userId2!,
			})

			await addWorkspaceMember({
				id: `member_iso_2_${Date.now()}`,
				workspaceId: wsId2,
				userId: userId2!,
				role: 'owner',
			})

			const res = await orpcRequest({
				procedure: 'workspaces/list',
				cookie: cookie1,
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ workspaces: Array<{ name: string }> }>(res)
			expect(json.workspaces).toHaveLength(1)
			expect(json.workspaces[0]?.name).toBe('User 1 Workspace')
		})
	})

	describe('workspaces.create - Create workspace', () => {
		it('creates workspace with valid data', async () => {
			const email = generateTestEmail()
			const { setCookie } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const uniqueSlug = `new-workspace-${Date.now()}`

			const res = await orpcRequest({
				procedure: 'workspaces/create',
				cookie: setCookie,
				body: {
					name: 'New Test Workspace',
					slug: uniqueSlug,
					description: 'A test workspace',
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				name: string
				slug: string
				description: string
			}>(res)
			expect(json.id).toBeDefined()
			expect(json.name).toBe('New Test Workspace')
			expect(json.slug).toBe(uniqueSlug)
			expect(json.description).toBe('A test workspace')
		})

		it('rejects duplicate workspace slug', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const duplicateSlug = `duplicate-slug-${Date.now()}`

			// Create existing workspace with the slug
			await createWorkspace({
				id: `ws_dup_${Date.now()}`,
				name: 'Existing Workspace',
				slug: duplicateSlug,
				ownerId: userId!,
			})

			// Try to create another workspace with same slug
			const res = await orpcRequest({
				procedure: 'workspaces/create',
				cookie: setCookie,
				body: {
					name: 'New Workspace',
					slug: duplicateSlug,
				},
			})

			expect(res.status).toBe(400)
		})

		it('rejects missing required fields (name)', async () => {
			const email = generateTestEmail()
			const { setCookie } = await signUpTestUser(email, 'SecurePass123!', 'Test User')

			const res = await orpcRequest({
				procedure: 'workspaces/create',
				cookie: setCookie,
				body: {
					slug: `missing-name-${Date.now()}`,
				},
			})

			expect(res.status).toBe(400)
		})

		it('rejects missing required fields (slug)', async () => {
			const email = generateTestEmail()
			const { setCookie } = await signUpTestUser(email, 'SecurePass123!', 'Test User')

			const res = await orpcRequest({
				procedure: 'workspaces/create',
				cookie: setCookie,
				body: {
					name: 'Missing Slug Workspace',
				},
			})

			expect(res.status).toBe(400)
		})

		it('rejects empty name', async () => {
			const email = generateTestEmail()
			const { setCookie } = await signUpTestUser(email, 'SecurePass123!', 'Test User')

			const res = await orpcRequest({
				procedure: 'workspaces/create',
				cookie: setCookie,
				body: {
					name: '',
					slug: `empty-name-${Date.now()}`,
				},
			})

			expect(res.status).toBe(400)
		})

		it('rejects invalid slug format', async () => {
			const email = generateTestEmail()
			const { setCookie } = await signUpTestUser(email, 'SecurePass123!', 'Test User')

			const res = await orpcRequest({
				procedure: 'workspaces/create',
				cookie: setCookie,
				body: {
					name: 'Invalid Slug Workspace',
					slug: 'Invalid Slug With Spaces!', // Invalid: contains spaces and special chars
				},
			})

			expect(res.status).toBe(400)
		})

		it('adds creator as workspace owner', async () => {
			const email = generateTestEmail()
			const { setCookie } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const uniqueSlug = `owner-test-${Date.now()}`

			// Create workspace
			const createRes = await orpcRequest({
				procedure: 'workspaces/create',
				cookie: setCookie,
				body: {
					name: 'Owner Test Workspace',
					slug: uniqueSlug,
				},
			})

			expect(createRes.status).toBe(200)
			const createJson = await parseOrpcResponse<{ id: string }>(createRes)

			// List workspaces to verify membership
			const listRes = await orpcRequest({
				procedure: 'workspaces/list',
				cookie: setCookie,
			})

			expect(listRes.status).toBe(200)
			const listJson = await parseOrpcResponse<{ workspaces: Array<{ id: string }> }>(listRes)
			expect(listJson.workspaces.some((w) => w.id === createJson.id)).toBe(true)
		})
	})

	describe('workspaces.get - Get workspace details', () => {
		it('returns workspace details', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_details_${Date.now()}`
			const workspaceSlug = `details-workspace-${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Details Workspace',
				slug: workspaceSlug,
				description: 'Workspace for details test',
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_details_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			const res = await orpcRequest({
				procedure: 'workspaces/get',
				cookie: setCookie,
				workspaceId,
				body: { id: workspaceId },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				name: string
				slug: string
				description: string
			}>(res)
			expect(json.id).toBe(workspaceId)
			expect(json.name).toBe('Details Workspace')
			expect(json.slug).toBe(workspaceSlug)
			expect(json.description).toBe('Workspace for details test')
		})

		it('returns 404 for non-existent workspace', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')

			// Create a workspace for context
			const workspaceId = `ws_404_context_${Date.now()}`
			await createWorkspace({
				id: workspaceId,
				name: 'Context Workspace',
				slug: `context-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_404_context_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			const res = await orpcRequest({
				procedure: 'workspaces/get',
				cookie: setCookie,
				workspaceId,
				body: { id: 'ws_nonexistent_12345' },
			})

			expect(res.status).toBe(404)
		})

		it('returns 403 without workspace context', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_no_context_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'No Context Workspace',
				slug: `no-context-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			// No X-Workspace-Id header
			const res = await orpcRequest({
				procedure: 'workspaces/get',
				cookie: setCookie,
				body: { id: workspaceId },
			})

			expect(res.status).toBe(403)
		})
	})

	describe('workspaces.update - Update workspace settings', () => {
		it('updates workspace name and description', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_update_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Original Name',
				slug: `update-workspace-${Date.now()}`,
				description: 'Original description',
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_update_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			const res = await orpcRequest({
				procedure: 'workspaces/update',
				cookie: setCookie,
				workspaceId,
				body: {
					id: workspaceId,
					name: 'Updated Name',
					description: 'Updated description',
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				name: string
				description: string
			}>(res)
			expect(json.id).toBe(workspaceId)
			expect(json.name).toBe('Updated Name')
			expect(json.description).toBe('Updated description')
		})

		it('rejects update from non-owner', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { userId: ownerId } = await signUpTestUser(email1, 'SecurePass123!', 'Owner')
			const { setCookie: memberCookie, userId: memberId } = await signUpTestUser(
				email2,
				'SecurePass123!',
				'Member',
			)

			const workspaceId = `ws_update_nonowner_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Non-Owner Update Workspace',
				slug: `nonowner-update-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			// Add owner
			await addWorkspaceMember({
				id: `member_update_owner_${Date.now()}`,
				workspaceId,
				userId: ownerId!,
				role: 'owner',
			})

			// Add member (not owner)
			await addWorkspaceMember({
				id: `member_update_member_${Date.now()}`,
				workspaceId,
				userId: memberId!,
				role: 'member',
			})

			// Member should not be able to update
			const res = await orpcRequest({
				procedure: 'workspaces/update',
				cookie: memberCookie,
				workspaceId,
				body: {
					id: workspaceId,
					name: 'Attempted Update',
				},
			})

			expect(res.status).toBe(403)
		})

		it('returns 404 for non-existent workspace', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')

			const workspaceId = `ws_update_404_${Date.now()}`
			await createWorkspace({
				id: workspaceId,
				name: 'Context Workspace',
				slug: `context-workspace-update-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_update_404_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			const res = await orpcRequest({
				procedure: 'workspaces/update',
				cookie: setCookie,
				workspaceId,
				body: {
					id: 'ws_nonexistent_update',
					name: 'New Name',
				},
			})

			expect(res.status).toBe(404)
		})
	})

	describe('workspaces.delete - Delete workspace (owner only)', () => {
		it('deletes workspace as owner', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_delete_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Delete Workspace',
				slug: `delete-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_delete_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			const res = await orpcRequest({
				procedure: 'workspaces/delete',
				cookie: setCookie,
				workspaceId,
				body: { id: workspaceId },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ success: boolean }>(res)
			expect(json.success).toBe(true)
		})

		it('rejects delete from non-owner (admin)', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { userId: ownerId } = await signUpTestUser(email1, 'SecurePass123!', 'Owner')
			const { setCookie: adminCookie, userId: adminId } = await signUpTestUser(
				email2,
				'SecurePass123!',
				'Admin',
			)

			const workspaceId = `ws_delete_admin_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Delete Admin Workspace',
				slug: `delete-admin-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			await addWorkspaceMember({
				id: `member_delete_owner_${Date.now()}`,
				workspaceId,
				userId: ownerId!,
				role: 'owner',
			})

			// Add admin (not owner)
			await addWorkspaceMember({
				id: `member_delete_admin_${Date.now()}`,
				workspaceId,
				userId: adminId!,
				role: 'admin',
			})

			// Admin should not be able to delete
			const res = await orpcRequest({
				procedure: 'workspaces/delete',
				cookie: adminCookie,
				workspaceId,
				body: { id: workspaceId },
			})

			expect(res.status).toBe(403)
		})

		it('rejects delete from regular member', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { userId: ownerId } = await signUpTestUser(email1, 'SecurePass123!', 'Owner')
			const { setCookie: memberCookie, userId: memberId } = await signUpTestUser(
				email2,
				'SecurePass123!',
				'Member',
			)

			const workspaceId = `ws_delete_member_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Delete Member Workspace',
				slug: `delete-member-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			await addWorkspaceMember({
				id: `member_delete_owner2_${Date.now()}`,
				workspaceId,
				userId: ownerId!,
				role: 'owner',
			})

			await addWorkspaceMember({
				id: `member_delete_member2_${Date.now()}`,
				workspaceId,
				userId: memberId!,
				role: 'member',
			})

			// Member should not be able to delete
			const res = await orpcRequest({
				procedure: 'workspaces/delete',
				cookie: memberCookie,
				workspaceId,
				body: { id: workspaceId },
			})

			expect(res.status).toBe(403)
		})

		it('returns 404 for non-existent workspace', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')

			const workspaceId = `ws_delete_404_${Date.now()}`
			await createWorkspace({
				id: workspaceId,
				name: 'Context Workspace',
				slug: `context-workspace-delete-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_delete_404_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			const res = await orpcRequest({
				procedure: 'workspaces/delete',
				cookie: setCookie,
				workspaceId,
				body: { id: 'ws_nonexistent_delete' },
			})

			expect(res.status).toBe(404)
		})
	})

	describe('workspaceMembers.sendInvitation - Invite team member', () => {
		it('invites member with valid email', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_invite_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Invite Workspace',
				slug: `invite-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_invite_owner_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			const inviteEmail = generateTestEmail()
			const res = await orpcRequest({
				procedure: 'workspaceMembers/sendInvitation',
				cookie: setCookie,
				workspaceId,
				body: {
					id: workspaceId,
					email: inviteEmail,
					role: 'member',
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				email: string
				role: string
				status: string
			}>(res)
			expect(json.id).toBeDefined()
			expect(json.email).toBe(inviteEmail)
			expect(json.role).toBe('member')
			expect(json.status).toBe('pending')
		})

		it('invites member with admin role', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_invite_admin_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Invite Admin Workspace',
				slug: `invite-admin-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_invite_admin_owner_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			const inviteEmail = generateTestEmail()
			const res = await orpcRequest({
				procedure: 'workspaceMembers/sendInvitation',
				cookie: setCookie,
				workspaceId,
				body: {
					id: workspaceId,
					email: inviteEmail,
					role: 'admin',
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ role: string }>(res)
			expect(json.role).toBe('admin')
		})

		it('rejects invite from non-admin member', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { userId: ownerId } = await signUpTestUser(email1, 'SecurePass123!', 'Owner')
			const { setCookie: memberCookie, userId: memberId } = await signUpTestUser(
				email2,
				'SecurePass123!',
				'Member',
			)

			const workspaceId = `ws_invite_member_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Invite Member Workspace',
				slug: `invite-member-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			await addWorkspaceMember({
				id: `member_invite_owner2_${Date.now()}`,
				workspaceId,
				userId: ownerId!,
				role: 'owner',
			})

			await addWorkspaceMember({
				id: `member_invite_member2_${Date.now()}`,
				workspaceId,
				userId: memberId!,
				role: 'member',
			})

			const inviteEmail = generateTestEmail()
			const res = await orpcRequest({
				procedure: 'workspaceMembers/sendInvitation',
				cookie: memberCookie,
				workspaceId,
				body: {
					id: workspaceId,
					email: inviteEmail,
					role: 'member',
				},
			})

			expect(res.status).toBe(403)
		})

		it('rejects duplicate pending invitation', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_invite_dup_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Duplicate Invite Workspace',
				slug: `duplicate-invite-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_invite_dup_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			const inviteEmail = generateTestEmail()

			// First invitation
			const firstRes = await orpcRequest({
				procedure: 'workspaceMembers/sendInvitation',
				cookie: setCookie,
				workspaceId,
				body: {
					id: workspaceId,
					email: inviteEmail,
					role: 'member',
				},
			})
			expect(firstRes.status).toBe(200)

			// Duplicate invitation
			const dupRes = await orpcRequest({
				procedure: 'workspaceMembers/sendInvitation',
				cookie: setCookie,
				workspaceId,
				body: {
					id: workspaceId,
					email: inviteEmail,
					role: 'member',
				},
			})
			expect(dupRes.status).toBe(400)
		})

		it('rejects inviting existing member', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { setCookie: ownerCookie, userId: ownerId } = await signUpTestUser(
				email1,
				'SecurePass123!',
				'Owner',
			)
			const { userId: memberId } = await signUpTestUser(email2, 'SecurePass123!', 'Existing Member')

			const workspaceId = `ws_invite_existing_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Invite Existing Workspace',
				slug: `invite-existing-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			await addWorkspaceMember({
				id: `member_invite_exist_owner_${Date.now()}`,
				workspaceId,
				userId: ownerId!,
				role: 'owner',
			})

			// Add existing member
			await addWorkspaceMember({
				id: `member_invite_exist_member_${Date.now()}`,
				workspaceId,
				userId: memberId!,
				role: 'member',
			})

			// Try to invite existing member
			const res = await orpcRequest({
				procedure: 'workspaceMembers/sendInvitation',
				cookie: ownerCookie,
				workspaceId,
				body: {
					id: workspaceId,
					email: email2, // Existing member's email
					role: 'member',
				},
			})

			expect(res.status).toBe(400)
		})
	})

	describe('workspaceMembers.removeMember - Remove member', () => {
		it('removes member as admin', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { setCookie: ownerCookie, userId: ownerId } = await signUpTestUser(
				email1,
				'SecurePass123!',
				'Owner',
			)
			const { userId: memberId } = await signUpTestUser(email2, 'SecurePass123!', 'Member')

			const workspaceId = `ws_remove_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Remove Workspace',
				slug: `remove-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			await addWorkspaceMember({
				id: `member_remove_owner_${Date.now()}`,
				workspaceId,
				userId: ownerId!,
				role: 'owner',
			})

			await addWorkspaceMember({
				id: `member_remove_member_${Date.now()}`,
				workspaceId,
				userId: memberId!,
				role: 'member',
			})

			const res = await orpcRequest({
				procedure: 'workspaceMembers/removeMember',
				cookie: ownerCookie,
				workspaceId,
				body: {
					id: workspaceId,
					userId: memberId,
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ success: boolean }>(res)
			expect(json.success).toBe(true)
		})

		it('allows member to remove themselves', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { userId: ownerId } = await signUpTestUser(email1, 'SecurePass123!', 'Owner')
			const { setCookie: memberCookie, userId: memberId } = await signUpTestUser(
				email2,
				'SecurePass123!',
				'Member',
			)

			const workspaceId = `ws_remove_self_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Remove Self Workspace',
				slug: `remove-self-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			await addWorkspaceMember({
				id: `member_remove_self_owner_${Date.now()}`,
				workspaceId,
				userId: ownerId!,
				role: 'owner',
			})

			await addWorkspaceMember({
				id: `member_remove_self_member_${Date.now()}`,
				workspaceId,
				userId: memberId!,
				role: 'member',
			})

			// Member removes themselves
			const res = await orpcRequest({
				procedure: 'workspaceMembers/removeMember',
				cookie: memberCookie,
				workspaceId,
				body: {
					id: workspaceId,
					userId: memberId,
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ success: boolean }>(res)
			expect(json.success).toBe(true)
		})

		it('rejects removing other member as non-admin', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const email3 = generateTestEmail()
			const { userId: ownerId } = await signUpTestUser(email1, 'SecurePass123!', 'Owner')
			const { setCookie: member1Cookie, userId: member1Id } = await signUpTestUser(
				email2,
				'SecurePass123!',
				'Member 1',
			)
			const { userId: member2Id } = await signUpTestUser(email3, 'SecurePass123!', 'Member 2')

			const workspaceId = `ws_remove_other_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Remove Other Workspace',
				slug: `remove-other-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			await addWorkspaceMember({
				id: `member_remove_other_owner_${Date.now()}`,
				workspaceId,
				userId: ownerId!,
				role: 'owner',
			})

			await addWorkspaceMember({
				id: `member_remove_other_m1_${Date.now()}`,
				workspaceId,
				userId: member1Id!,
				role: 'member',
			})

			await addWorkspaceMember({
				id: `member_remove_other_m2_${Date.now()}`,
				workspaceId,
				userId: member2Id!,
				role: 'member',
			})

			// Member 1 trying to remove member 2
			const res = await orpcRequest({
				procedure: 'workspaceMembers/removeMember',
				cookie: member1Cookie,
				workspaceId,
				body: {
					id: workspaceId,
					userId: member2Id,
				},
			})

			expect(res.status).toBe(400)
		})

		it('rejects removing workspace owner', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { userId: ownerId } = await signUpTestUser(email1, 'SecurePass123!', 'Owner')
			const { setCookie: adminCookie, userId: adminId } = await signUpTestUser(
				email2,
				'SecurePass123!',
				'Admin',
			)

			const workspaceId = `ws_remove_owner_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Remove Owner Workspace',
				slug: `remove-owner-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			await addWorkspaceMember({
				id: `member_remove_owner_owner_${Date.now()}`,
				workspaceId,
				userId: ownerId!,
				role: 'owner',
			})

			await addWorkspaceMember({
				id: `member_remove_owner_admin_${Date.now()}`,
				workspaceId,
				userId: adminId!,
				role: 'admin',
			})

			// Admin trying to remove owner
			const res = await orpcRequest({
				procedure: 'workspaceMembers/removeMember',
				cookie: adminCookie,
				workspaceId,
				body: {
					id: workspaceId,
					userId: ownerId,
				},
			})

			expect(res.status).toBe(400)
		})

		it('returns 404 for non-existent member', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_remove_404_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Remove 404 Workspace',
				slug: `remove-404-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_remove_404_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			const res = await orpcRequest({
				procedure: 'workspaceMembers/removeMember',
				cookie: setCookie,
				workspaceId,
				body: {
					id: workspaceId,
					userId: 'nonexistent_user_id',
				},
			})

			expect(res.status).toBe(404)
		})
	})

	describe('workspaceMembers.updateMemberRole - Update member role', () => {
		it('updates member role to admin', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { setCookie: ownerCookie, userId: ownerId } = await signUpTestUser(
				email1,
				'SecurePass123!',
				'Owner',
			)
			const { userId: memberId } = await signUpTestUser(email2, 'SecurePass123!', 'Member')

			const workspaceId = `ws_role_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Role Workspace',
				slug: `role-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			await addWorkspaceMember({
				id: `member_role_owner_${Date.now()}`,
				workspaceId,
				userId: ownerId!,
				role: 'owner',
			})

			await addWorkspaceMember({
				id: `member_role_member_${Date.now()}`,
				workspaceId,
				userId: memberId!,
				role: 'member',
			})

			const res = await orpcRequest({
				procedure: 'workspaceMembers/updateMemberRole',
				cookie: ownerCookie,
				workspaceId,
				body: {
					id: workspaceId,
					userId: memberId,
					role: 'admin',
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ role: string; userId: string }>(res)
			expect(json.role).toBe('admin')
			expect(json.userId).toBe(memberId)
		})

		it('demotes admin to member', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { setCookie: ownerCookie, userId: ownerId } = await signUpTestUser(
				email1,
				'SecurePass123!',
				'Owner',
			)
			const { userId: adminId } = await signUpTestUser(email2, 'SecurePass123!', 'Admin')

			const workspaceId = `ws_demote_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Demote Workspace',
				slug: `demote-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			await addWorkspaceMember({
				id: `member_demote_owner_${Date.now()}`,
				workspaceId,
				userId: ownerId!,
				role: 'owner',
			})

			await addWorkspaceMember({
				id: `member_demote_admin_${Date.now()}`,
				workspaceId,
				userId: adminId!,
				role: 'admin',
			})

			const res = await orpcRequest({
				procedure: 'workspaceMembers/updateMemberRole',
				cookie: ownerCookie,
				workspaceId,
				body: {
					id: workspaceId,
					userId: adminId,
					role: 'member',
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ role: string }>(res)
			expect(json.role).toBe('member')
		})

		it('rejects role update from non-admin', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const email3 = generateTestEmail()
			const { userId: ownerId } = await signUpTestUser(email1, 'SecurePass123!', 'Owner')
			const { setCookie: member1Cookie, userId: member1Id } = await signUpTestUser(
				email2,
				'SecurePass123!',
				'Member 1',
			)
			const { userId: member2Id } = await signUpTestUser(email3, 'SecurePass123!', 'Member 2')

			const workspaceId = `ws_role_nonadmin_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Role Non-Admin Workspace',
				slug: `role-nonadmin-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			await addWorkspaceMember({
				id: `member_role_nonadmin_owner_${Date.now()}`,
				workspaceId,
				userId: ownerId!,
				role: 'owner',
			})

			await addWorkspaceMember({
				id: `member_role_nonadmin_m1_${Date.now()}`,
				workspaceId,
				userId: member1Id!,
				role: 'member',
			})

			await addWorkspaceMember({
				id: `member_role_nonadmin_m2_${Date.now()}`,
				workspaceId,
				userId: member2Id!,
				role: 'member',
			})

			// Member trying to update another member's role
			const res = await orpcRequest({
				procedure: 'workspaceMembers/updateMemberRole',
				cookie: member1Cookie,
				workspaceId,
				body: {
					id: workspaceId,
					userId: member2Id,
					role: 'admin',
				},
			})

			expect(res.status).toBe(403)
		})

		it("rejects changing owner's role", async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { userId: ownerId } = await signUpTestUser(email1, 'SecurePass123!', 'Owner')
			const { setCookie: adminCookie, userId: adminId } = await signUpTestUser(
				email2,
				'SecurePass123!',
				'Admin',
			)

			const workspaceId = `ws_role_owner_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Role Owner Workspace',
				slug: `role-owner-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			await addWorkspaceMember({
				id: `member_role_owner_owner_${Date.now()}`,
				workspaceId,
				userId: ownerId!,
				role: 'owner',
			})

			await addWorkspaceMember({
				id: `member_role_owner_admin_${Date.now()}`,
				workspaceId,
				userId: adminId!,
				role: 'admin',
			})

			// Admin trying to change owner's role
			const res = await orpcRequest({
				procedure: 'workspaceMembers/updateMemberRole',
				cookie: adminCookie,
				workspaceId,
				body: {
					id: workspaceId,
					userId: ownerId,
					role: 'member',
				},
			})

			expect(res.status).toBe(400)
		})

		it('returns 404 for non-existent member', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_role_404_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Role 404 Workspace',
				slug: `role-404-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_role_404_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			const res = await orpcRequest({
				procedure: 'workspaceMembers/updateMemberRole',
				cookie: setCookie,
				workspaceId,
				body: {
					id: workspaceId,
					userId: 'nonexistent_user_id',
					role: 'admin',
				},
			})

			expect(res.status).toBe(404)
		})
	})

	describe('Workspace switching persists in session', () => {
		it('can access different workspaces with same session', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')

			// Create two workspaces
			const wsId1 = `ws_switch_1_${Date.now()}`
			const wsId2 = `ws_switch_2_${Date.now()}`

			await createWorkspace({
				id: wsId1,
				name: 'Switch Workspace 1',
				slug: `switch-workspace-1-${Date.now()}`,
				ownerId: userId!,
			})

			await createWorkspace({
				id: wsId2,
				name: 'Switch Workspace 2',
				slug: `switch-workspace-2-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_switch_1_${Date.now()}`,
				workspaceId: wsId1,
				userId: userId!,
				role: 'owner',
			})

			await addWorkspaceMember({
				id: `member_switch_2_${Date.now()}`,
				workspaceId: wsId2,
				userId: userId!,
				role: 'owner',
			})

			// Access workspace 1
			const res1 = await orpcRequest({
				procedure: 'workspaces/get',
				cookie: setCookie,
				workspaceId: wsId1,
				body: { id: wsId1 },
			})
			expect(res1.status).toBe(200)
			const json1 = await parseOrpcResponse<{ name: string }>(res1)
			expect(json1.name).toBe('Switch Workspace 1')

			// Switch to workspace 2 with same session
			const res2 = await orpcRequest({
				procedure: 'workspaces/get',
				cookie: setCookie,
				workspaceId: wsId2,
				body: { id: wsId2 },
			})
			expect(res2.status).toBe(200)
			const json2 = await parseOrpcResponse<{ name: string }>(res2)
			expect(json2.name).toBe('Switch Workspace 2')

			// Switch back to workspace 1
			const res3 = await orpcRequest({
				procedure: 'workspaces/get',
				cookie: setCookie,
				workspaceId: wsId1,
				body: { id: wsId1 },
			})
			expect(res3.status).toBe(200)
			const json3 = await parseOrpcResponse<{ name: string }>(res3)
			expect(json3.name).toBe('Switch Workspace 1')
		})

		it('rejects access to workspace user is not member of', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { setCookie: cookie1, userId: userId1 } = await signUpTestUser(
				email1,
				'SecurePass123!',
				'User 1',
			)
			const { userId: userId2 } = await signUpTestUser(email2, 'SecurePass123!', 'User 2')

			// User 1's workspace
			const wsId1 = `ws_switch_isolated_1_${Date.now()}`
			await createWorkspace({
				id: wsId1,
				name: 'User 1 Workspace',
				slug: `user-1-switch-workspace-${Date.now()}`,
				ownerId: userId1!,
			})

			await addWorkspaceMember({
				id: `member_switch_isolated_1_${Date.now()}`,
				workspaceId: wsId1,
				userId: userId1!,
				role: 'owner',
			})

			// User 2's workspace
			const wsId2 = `ws_switch_isolated_2_${Date.now()}`
			await createWorkspace({
				id: wsId2,
				name: 'User 2 Workspace',
				slug: `user-2-switch-workspace-${Date.now()}`,
				ownerId: userId2!,
			})

			await addWorkspaceMember({
				id: `member_switch_isolated_2_${Date.now()}`,
				workspaceId: wsId2,
				userId: userId2!,
				role: 'owner',
			})

			// User 1 trying to access User 2's workspace
			const res = await orpcRequest({
				procedure: 'workspaces/get',
				cookie: cookie1,
				workspaceId: wsId2, // Trying to switch to user 2's workspace
				body: { id: wsId2 },
			})

			expect(res.status).toBe(403)
		})

		it('lists workspaces correctly after multiple operations', async () => {
			const email = generateTestEmail()
			const { setCookie } = await signUpTestUser(email, 'SecurePass123!', 'Test User')

			// Create first workspace
			const slug1 = `session-test-1-${Date.now()}`
			const createRes1 = await orpcRequest({
				procedure: 'workspaces/create',
				cookie: setCookie,
				body: {
					name: 'Session Test 1',
					slug: slug1,
				},
			})
			expect(createRes1.status).toBe(200)
			const ws1 = await parseOrpcResponse<{ id: string }>(createRes1)

			// Create second workspace
			const slug2 = `session-test-2-${Date.now()}`
			const createRes2 = await orpcRequest({
				procedure: 'workspaces/create',
				cookie: setCookie,
				body: {
					name: 'Session Test 2',
					slug: slug2,
				},
			})
			expect(createRes2.status).toBe(200)

			// List should show both
			const listRes = await orpcRequest({
				procedure: 'workspaces/list',
				cookie: setCookie,
			})
			expect(listRes.status).toBe(200)
			const listJson = await parseOrpcResponse<{ workspaces: Array<{ name: string }> }>(listRes)
			expect(listJson.workspaces.some((w) => w.name === 'Session Test 1')).toBe(true)
			expect(listJson.workspaces.some((w) => w.name === 'Session Test 2')).toBe(true)

			// Delete first workspace (need workspace context for this)
			const deleteRes = await orpcRequest({
				procedure: 'workspaces/delete',
				cookie: setCookie,
				workspaceId: ws1.id,
				body: { id: ws1.id },
			})
			expect(deleteRes.status).toBe(200)

			// List should show only second
			const listRes2 = await orpcRequest({
				procedure: 'workspaces/list',
				cookie: setCookie,
			})
			expect(listRes2.status).toBe(200)
			const listJson2 = await parseOrpcResponse<{ workspaces: Array<{ name: string }> }>(listRes2)
			expect(listJson2.workspaces.some((w) => w.name === 'Session Test 1')).toBe(false)
			expect(listJson2.workspaces.some((w) => w.name === 'Session Test 2')).toBe(true)
		})
	})
})
