import { describe, it, expect } from 'vitest'
import { app } from '../../index'

describe('Tools API', () => {
	describe('GET /api/tools', () => {
		it('returns tools list', async () => {
			const res = await app.request('/api/tools')
			expect(res.status).toBe(200)

			interface ToolsResponse {
				tools: Array<{
					id: string
					name: string
					description: string
					type: string
					inputSchema: Record<string, unknown>
					isSystem: boolean
					createdAt: string
					updatedAt: string
				}>
			}

			const json = (await res.json()) as ToolsResponse
			expect(json).toHaveProperty('tools')
			expect(Array.isArray(json.tools)).toBe(true)
		})

		it('includes system tools', async () => {
			const res = await app.request('/api/tools')

			interface ToolsResponse {
				tools: Array<{
					id: string
					name: string
					description: string
					type: string
					isSystem: boolean
				}>
			}

			const json = (await res.json()) as ToolsResponse
			const systemTools = json.tools.filter((tool) => tool.isSystem)
			expect(systemTools.length).toBeGreaterThan(0)
		})
	})

	describe('POST /api/tools', () => {
		it('creates a new custom tool with valid data', async () => {
			const res = await app.request('/api/tools', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Test Tool',
					description: 'A test tool',
					type: 'custom',
					inputSchema: {
						input: { type: 'string', description: 'Input value' },
					},
				}),
			})

			expect(res.status).toBe(201)

			interface CreateToolResponse {
				id: string
				name: string
				description: string
				type: string
				inputSchema: Record<string, unknown>
				isSystem: boolean
				createdAt: string
				updatedAt: string
			}

			const json = (await res.json()) as CreateToolResponse
			expect(json.id).toBeDefined()
			expect(json.name).toBe('Test Tool')
			expect(json.isSystem).toBe(false)
		})

		it('returns 400 for invalid data', async () => {
			const res = await app.request('/api/tools', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: '' }),
			})

			expect(res.status).toBe(400)
		})
	})

	describe('GET /api/tools/:id', () => {
		it('returns tool details', async () => {
			const res = await app.request('/api/tools/tool_test123')
			expect(res.status).toBe(200)

			interface ToolResponse {
				id: string
				name: string
				description: string
				type: string
				inputSchema: Record<string, unknown>
				isSystem: boolean
				createdAt: string
				updatedAt: string
			}

			const json = (await res.json()) as ToolResponse
			expect(json.id).toBeDefined()
			expect(json.name).toBeDefined()
			expect(json.type).toBeDefined()
		})
	})

	describe('PATCH /api/tools/:id', () => {
		it('updates a custom tool', async () => {
			const res = await app.request('/api/tools/tool_test123', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Updated Tool',
					description: 'Updated description',
				}),
			})

			expect(res.status).toBe(200)

			interface UpdateToolResponse {
				id: string
				name: string
				description: string
				type: string
				inputSchema: Record<string, unknown>
				isSystem: boolean
				createdAt: string
				updatedAt: string
			}

			const json = (await res.json()) as UpdateToolResponse
			expect(json.name).toBe('Updated Tool')
		})
	})

	describe('DELETE /api/tools/:id', () => {
		it('deletes a custom tool', async () => {
			const res = await app.request('/api/tools/tool_test123', {
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
