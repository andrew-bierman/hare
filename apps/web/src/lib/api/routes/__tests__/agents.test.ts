import { describe, expect, it } from 'vitest'
import { app } from 'web-app/lib/api/index'

describe('Agents API', () => {
	describe('GET /api/agents', () => {
		it('returns agents list', async () => {
			const res = await app.request('/api/agents')
			expect(res.status).toBe(200)

			interface AgentsResponse {
				agents: Array<{
					id: string
					workspaceId: string
					name: string
					description: string | null
					model: string
					instructions: string
					status: string
					createdAt: string
					updatedAt: string
				}>
			}

			const json = (await res.json()) as AgentsResponse
			expect(json).toHaveProperty('agents')
			expect(Array.isArray(json.agents)).toBe(true)
		})
	})

	describe('POST /api/agents', () => {
		it('creates a new agent with valid data', async () => {
			const res = await app.request('/api/agents', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Test Agent',
					model: 'llama-3.3-70b-instruct',
					instructions: 'You are a helpful assistant.',
				}),
			})

			expect(res.status).toBe(201)

			interface CreateAgentResponse {
				id: string
				name: string
				status: string
				workspaceId: string
				model: string
				instructions: string
				createdAt: string
				updatedAt: string
			}

			const json = (await res.json()) as CreateAgentResponse
			expect(json.id).toBeDefined()
			expect(json.name).toBe('Test Agent')
			expect(json.status).toBe('draft')
		})

		it('returns 400 for invalid data', async () => {
			const res = await app.request('/api/agents', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: '' }),
			})

			expect(res.status).toBe(400)
		})
	})

	describe('GET /api/agents/:id', () => {
		it('returns agent details', async () => {
			const res = await app.request('/api/agents/agent_test123')
			expect(res.status).toBe(200)

			interface AgentResponse {
				id: string
				workspaceId: string
				name: string
				description: string | null
				model: string
				instructions: string
				status: string
				createdAt: string
				updatedAt: string
			}

			const json = (await res.json()) as AgentResponse
			expect(json.id).toBeDefined()
			expect(json.name).toBeDefined()
		})
	})

	describe('PATCH /api/agents/:id', () => {
		it('updates an agent', async () => {
			const res = await app.request('/api/agents/agent_test123', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Updated Agent',
				}),
			})

			expect(res.status).toBe(200)

			interface UpdateAgentResponse {
				id: string
				name: string
				workspaceId: string
				model: string
				instructions: string
				status: string
				createdAt: string
				updatedAt: string
			}

			const json = (await res.json()) as UpdateAgentResponse
			expect(json.name).toBe('Updated Agent')
		})
	})

	describe('DELETE /api/agents/:id', () => {
		it('deletes an agent', async () => {
			const res = await app.request('/api/agents/agent_test123', {
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

	describe('POST /api/agents/:id/deploy', () => {
		it('deploys an agent', async () => {
			const res = await app.request('/api/agents/agent_test123/deploy', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					version: '1.0.0',
				}),
			})

			expect(res.status).toBe(200)

			interface DeployResponse {
				id: string
				status: string
				deployedAt: string
				version: string
			}

			const json = (await res.json()) as DeployResponse
			expect(json.status).toBe('deployed')
			expect(json.deployedAt).toBeDefined()
		})
	})
})
