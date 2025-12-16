import { describe, expect, it } from 'vitest'
import { app } from 'web-app/lib/api/index'

describe('Workspaces API', () => {
	describe('GET /api/workspaces', () => {
		it('returns workspaces list', async () => {
			const res = await app.request('/api/workspaces')
			expect(res.status).toBe(200)

			interface WorkspacesResponse {
				workspaces: Array<{
					id: string
					name: string
					description: string | null
					role: string
					createdAt: string
					updatedAt: string
				}>
			}

			const json = (await res.json()) as WorkspacesResponse
			expect(json).toHaveProperty('workspaces')
			expect(Array.isArray(json.workspaces)).toBe(true)
		})
	})

	describe('POST /api/workspaces', () => {
		it('creates a new workspace with valid data', async () => {
			const res = await app.request('/api/workspaces', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Test Workspace',
					description: 'A test workspace',
				}),
			})

			expect(res.status).toBe(201)

			interface CreateWorkspaceResponse {
				id: string
				name: string
				description: string | null
				role: string
				createdAt: string
				updatedAt: string
			}

			const json = (await res.json()) as CreateWorkspaceResponse
			expect(json.id).toBeDefined()
			expect(json.name).toBe('Test Workspace')
			expect(json.role).toBe('owner')
		})

		it('returns 400 for invalid data', async () => {
			const res = await app.request('/api/workspaces', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: '' }),
			})

			expect(res.status).toBe(400)
		})
	})

	describe('GET /api/workspaces/:id', () => {
		it('returns workspace details', async () => {
			const res = await app.request('/api/workspaces/ws_test123')
			expect(res.status).toBe(200)

			interface WorkspaceResponse {
				id: string
				name: string
				description: string | null
				role: string
				createdAt: string
				updatedAt: string
			}

			const json = (await res.json()) as WorkspaceResponse
			expect(json.id).toBeDefined()
			expect(json.name).toBeDefined()
			expect(json.role).toBeDefined()
		})
	})

	describe('PATCH /api/workspaces/:id', () => {
		it('updates a workspace', async () => {
			const res = await app.request('/api/workspaces/ws_test123', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Updated Workspace',
					description: 'Updated description',
				}),
			})

			expect(res.status).toBe(200)

			interface UpdateWorkspaceResponse {
				id: string
				name: string
				description: string | null
				role: string
				createdAt: string
				updatedAt: string
			}

			const json = (await res.json()) as UpdateWorkspaceResponse
			expect(json.name).toBe('Updated Workspace')
		})
	})

	describe('DELETE /api/workspaces/:id', () => {
		it('deletes a workspace', async () => {
			const res = await app.request('/api/workspaces/ws_test123', {
				method: 'DELETE',
			})

			expect(res.status).toBe(200)

			interface DeleteResponse {
				success: boolean
			}

			const json = (await res.json()) as DeleteResponse
			expect(json.success).toBe(true)
		})
	})
})
