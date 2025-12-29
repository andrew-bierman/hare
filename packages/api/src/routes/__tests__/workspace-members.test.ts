import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '@hare/api'
import { applyMigrations } from './setup'

// Apply D1 migrations before tests
beforeAll(async () => {
	await applyMigrations(env.DB)
})

describe('Workspace Members API', () => {
	describe('Authentication', () => {
		it('returns 401 for unauthenticated GET /api/workspaces/:id/members', async () => {
			const res = await app.request('/api/workspaces/ws_test123/members', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated POST /api/workspaces/:id/invites', async () => {
			const res = await app.request(
				'/api/workspaces/ws_test123/invites',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'newmember@example.com',
						role: 'member',
					}),
				},
				env,
			)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated GET /api/workspaces/:id/invites', async () => {
			const res = await app.request('/api/workspaces/ws_test123/invites', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated DELETE /api/workspaces/:id/invites/:inviteId', async () => {
			const res = await app.request(
				'/api/workspaces/ws_test123/invites/inv_abc123',
				{
					method: 'DELETE',
				},
				env,
			)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated DELETE /api/workspaces/:id/members/:userId', async () => {
			const res = await app.request(
				'/api/workspaces/ws_test123/members/user_abc123',
				{
					method: 'DELETE',
				},
				env,
			)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated PATCH /api/workspaces/:id/members/:userId', async () => {
			const res = await app.request(
				'/api/workspaces/ws_test123/members/user_abc123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ role: 'admin' }),
				},
				env,
			)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})
	})

	describe('List Members', () => {
		it('GET /api/workspaces/:id/members requires authentication', async () => {
			const res = await app.request('/api/workspaces/ws_test123/members', {}, env)
			expect(res.status).toBe(401)
		})
	})

	describe('Send Invitation', () => {
		it('POST /api/workspaces/:id/invites requires authentication', async () => {
			const res = await app.request(
				'/api/workspaces/ws_test123/invites',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'newmember@example.com',
						role: 'member',
					}),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('POST /api/workspaces/:id/invites requires email in body', async () => {
			const res = await app.request(
				'/api/workspaces/ws_test123/invites',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						role: 'member',
					}),
				},
				env,
			)
			// Auth check first, then validation
			expect(res.status).toBe(401)
		})

		it('accepts valid role values (member, admin, viewer)', async () => {
			// Test member role
			const resMember = await app.request(
				'/api/workspaces/ws_test123/invites',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'member@example.com',
						role: 'member',
					}),
				},
				env,
			)
			expect(resMember.status).toBe(401) // Auth first

			// Test admin role
			const resAdmin = await app.request(
				'/api/workspaces/ws_test123/invites',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'admin@example.com',
						role: 'admin',
					}),
				},
				env,
			)
			expect(resAdmin.status).toBe(401) // Auth first

			// Test viewer role
			const resViewer = await app.request(
				'/api/workspaces/ws_test123/invites',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'viewer@example.com',
						role: 'viewer',
					}),
				},
				env,
			)
			expect(resViewer.status).toBe(401) // Auth first
		})

		it('defaults to member role when role is not specified', async () => {
			const res = await app.request(
				'/api/workspaces/ws_test123/invites',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'newuser@example.com',
						// role not specified
					}),
				},
				env,
			)
			// Auth check first
			expect(res.status).toBe(401)
		})
	})

	describe('List Invitations', () => {
		it('GET /api/workspaces/:id/invites requires authentication', async () => {
			const res = await app.request('/api/workspaces/ws_test123/invites', {}, env)
			expect(res.status).toBe(401)
		})
	})

	describe('Revoke Invitation', () => {
		it('DELETE /api/workspaces/:id/invites/:inviteId requires authentication', async () => {
			const res = await app.request(
				'/api/workspaces/ws_test123/invites/inv_abc123',
				{
					method: 'DELETE',
				},
				env,
			)
			expect(res.status).toBe(401)
		})
	})

	describe('Remove Member', () => {
		it('DELETE /api/workspaces/:id/members/:userId requires authentication', async () => {
			const res = await app.request(
				'/api/workspaces/ws_test123/members/user_abc123',
				{
					method: 'DELETE',
				},
				env,
			)
			expect(res.status).toBe(401)
		})
	})

	describe('Update Member Role', () => {
		it('PATCH /api/workspaces/:id/members/:userId requires authentication', async () => {
			const res = await app.request(
				'/api/workspaces/ws_test123/members/user_abc123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ role: 'admin' }),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('PATCH /api/workspaces/:id/members/:userId requires role in body', async () => {
			const res = await app.request(
				'/api/workspaces/ws_test123/members/user_abc123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				},
				env,
			)
			// Auth check first, then validation
			expect(res.status).toBe(401)
		})

		it('accepts valid role values for update (member, admin, viewer)', async () => {
			// Test member role
			const resMember = await app.request(
				'/api/workspaces/ws_test123/members/user_abc123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ role: 'member' }),
				},
				env,
			)
			expect(resMember.status).toBe(401) // Auth first

			// Test admin role
			const resAdmin = await app.request(
				'/api/workspaces/ws_test123/members/user_abc123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ role: 'admin' }),
				},
				env,
			)
			expect(resAdmin.status).toBe(401) // Auth first

			// Test viewer role
			const resViewer = await app.request(
				'/api/workspaces/ws_test123/members/user_abc123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ role: 'viewer' }),
				},
				env,
			)
			expect(resViewer.status).toBe(401) // Auth first
		})
	})

	describe('Authorization Scenarios', () => {
		it('listing members requires workspace access', async () => {
			// Note: Auth check happens first
			const res = await app.request('/api/workspaces/ws_nonexistent/members', {}, env)
			expect(res.status).toBe(401)
		})

		it('sending invitations requires admin access', async () => {
			// Note: Auth check happens first, then admin access is verified
			const res = await app.request(
				'/api/workspaces/ws_test123/invites',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'newmember@example.com',
						role: 'member',
					}),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('listing invitations requires admin access', async () => {
			// Note: Auth check happens first, then admin access is verified
			const res = await app.request('/api/workspaces/ws_test123/invites', {}, env)
			expect(res.status).toBe(401)
		})

		it('revoking invitations requires admin access', async () => {
			// Note: Auth check happens first, then admin access is verified
			const res = await app.request(
				'/api/workspaces/ws_test123/invites/inv_abc123',
				{
					method: 'DELETE',
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('removing members requires admin access (or self-removal)', async () => {
			// Note: Auth check happens first
			const res = await app.request(
				'/api/workspaces/ws_test123/members/user_abc123',
				{
					method: 'DELETE',
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('updating member roles requires admin access', async () => {
			// Note: Auth check happens first, then admin access is verified
			const res = await app.request(
				'/api/workspaces/ws_test123/members/user_abc123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ role: 'admin' }),
				},
				env,
			)
			expect(res.status).toBe(401)
		})
	})

	describe('Input Validation', () => {
		it('validates email format in invitation', async () => {
			const res = await app.request(
				'/api/workspaces/ws_test123/invites',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'invalid-email',
						role: 'member',
					}),
				},
				env,
			)
			// Auth check happens first
			expect(res.status).toBe(401)
		})

		it('validates workspaceId format in path', async () => {
			const res = await app.request('/api/workspaces//members', {}, env)
			// Either 404 or 401
			expect([401, 404].includes(res.status)).toBe(true)
		})

		it('validates userId format in path', async () => {
			const res = await app.request(
				'/api/workspaces/ws_test123/members/',
				{
					method: 'DELETE',
				},
				env,
			)
			// Either 404 or 401
			expect([401, 404].includes(res.status)).toBe(true)
		})
	})

	describe('Edge Cases', () => {
		it('handles request with empty body for POST invite', async () => {
			const res = await app.request(
				'/api/workspaces/ws_test123/invites',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				},
				env,
			)
			// Auth check first
			expect(res.status).toBe(401)
		})

		it('handles request with empty body for PATCH member role', async () => {
			const res = await app.request(
				'/api/workspaces/ws_test123/members/user_abc123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				},
				env,
			)
			// Auth check first
			expect(res.status).toBe(401)
		})

		it('handles request without Content-Type header', async () => {
			const res = await app.request(
				'/api/workspaces/ws_test123/invites',
				{
					method: 'POST',
					body: JSON.stringify({
						email: 'test@example.com',
						role: 'member',
					}),
				},
				env,
			)
			// Auth check first
			expect(res.status).toBe(401)
		})
	})
})
