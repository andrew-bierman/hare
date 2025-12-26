import { type APIRequestContext, test as baseTest, expect } from '@playwright/test'
import { test } from './fixtures'

/**
 * Comprehensive API tests for authenticated endpoints.
 * Tests all CRUD operations for workspaces, agents, and tools.
 */

baseTest.describe('API Authentication Requirements', () => {
	baseTest(
		'workspaces endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.get('/api/workspaces')
			expect(response.status()).toBe(401)
		},
	)

	baseTest(
		'agents endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.get('/api/agents?workspaceId=test')
			expect(response.status()).toBe(401)
		},
	)

	baseTest(
		'tools endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.get('/api/tools?workspaceId=test')
			expect(response.status()).toBe(401)
		},
	)

	baseTest(
		'usage endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.get('/api/usage?workspaceId=test')
			expect(response.status()).toBe(401)
		},
	)

	baseTest(
		'dev/seed endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.post('/api/dev/seed')
			expect(response.status()).toBe(401)
		},
	)
})

test.describe('Workspaces API - Authenticated', () => {
	test('can list workspaces', async ({ authenticatedPage }) => {
		// Navigate to dashboard to ensure we have a session
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Make API request using page context (inherits auth cookies)
		const response = await authenticatedPage.request.get('/api/workspaces')
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(Array.isArray(body)).toBe(true)
		// New user should have at least one workspace (default)
		expect(body.length).toBeGreaterThanOrEqual(1)
	})

	test('workspace has required fields', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		const response = await authenticatedPage.request.get('/api/workspaces')
		expect(response.status()).toBe(200)

		const workspaces = await response.json()
		expect(workspaces.length).toBeGreaterThan(0)

		const workspace = workspaces[0]
		expect(workspace).toHaveProperty('id')
		expect(workspace).toHaveProperty('name')
		expect(workspace).toHaveProperty('slug')
	})
})

test.describe('Agents API - Authenticated', () => {
	test('can list agents for workspace', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Get workspace ID first
		const workspacesResponse = await authenticatedPage.request.get('/api/workspaces')
		const workspaces = await workspacesResponse.json()
		const workspaceId = workspaces[0]?.id

		expect(workspaceId).toBeDefined()

		// List agents
		const response = await authenticatedPage.request.get(`/api/agents?workspaceId=${workspaceId}`)
		expect(response.status()).toBe(200)

		const agents = await response.json()
		expect(Array.isArray(agents)).toBe(true)
	})

	test('can create and delete an agent', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Get workspace ID
		const workspacesResponse = await authenticatedPage.request.get('/api/workspaces')
		const workspaces = await workspacesResponse.json()
		const workspaceId = workspaces[0]?.id

		// Create agent
		const createResponse = await authenticatedPage.request.post(
			`/api/agents?workspaceId=${workspaceId}`,
			{
				data: {
					name: `Test Agent ${Date.now()}`,
					description: 'A test agent created via API',
					model: 'llama-3.3-70b',
					instructions: 'You are a helpful test assistant.',
				},
			},
		)

		expect(createResponse.status()).toBe(201)
		const agent = await createResponse.json()
		expect(agent).toHaveProperty('id')
		expect(agent).toHaveProperty('name')
		expect(agent.status).toBe('draft')

		// Delete the agent
		const deleteResponse = await authenticatedPage.request.delete(
			`/api/agents/${agent.id}?workspaceId=${workspaceId}`,
		)
		expect(deleteResponse.status()).toBe(200)
	})

	test('can update an agent', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Get workspace ID
		const workspacesResponse = await authenticatedPage.request.get('/api/workspaces')
		const workspaces = await workspacesResponse.json()
		const workspaceId = workspaces[0]?.id

		// Create agent first
		const createResponse = await authenticatedPage.request.post(
			`/api/agents?workspaceId=${workspaceId}`,
			{
				data: {
					name: `Update Test Agent ${Date.now()}`,
					description: 'Original description',
					model: 'llama-3.3-70b',
				},
			},
		)
		const agent = await createResponse.json()

		// Update agent
		const updateResponse = await authenticatedPage.request.patch(
			`/api/agents/${agent.id}?workspaceId=${workspaceId}`,
			{
				data: {
					description: 'Updated description',
					instructions: 'Updated instructions for deployment',
				},
			},
		)

		expect(updateResponse.status()).toBe(200)
		const updatedAgent = await updateResponse.json()
		expect(updatedAgent.description).toBe('Updated description')

		// Cleanup
		await authenticatedPage.request.delete(`/api/agents/${agent.id}?workspaceId=${workspaceId}`)
	})

	test('can deploy an agent with instructions', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Get workspace ID
		const workspacesResponse = await authenticatedPage.request.get('/api/workspaces')
		const workspaces = await workspacesResponse.json()
		const workspaceId = workspaces[0]?.id

		// Create agent with instructions
		const createResponse = await authenticatedPage.request.post(
			`/api/agents?workspaceId=${workspaceId}`,
			{
				data: {
					name: `Deploy Test Agent ${Date.now()}`,
					description: 'Agent ready for deployment',
					model: 'llama-3.3-70b',
					instructions: 'You are a helpful assistant for testing deployments.',
				},
			},
		)
		const agent = await createResponse.json()

		// Deploy agent
		const deployResponse = await authenticatedPage.request.post(
			`/api/agents/${agent.id}/deploy?workspaceId=${workspaceId}`,
			{
				data: {},
			},
		)

		expect(deployResponse.status()).toBe(200)
		const deployedAgent = await deployResponse.json()
		expect(deployedAgent.status).toBe('deployed')

		// Cleanup
		await authenticatedPage.request.delete(`/api/agents/${agent.id}?workspaceId=${workspaceId}`)
	})

	test('cannot deploy agent without instructions', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Get workspace ID
		const workspacesResponse = await authenticatedPage.request.get('/api/workspaces')
		const workspaces = await workspacesResponse.json()
		const workspaceId = workspaces[0]?.id

		// Create agent WITHOUT instructions
		const createResponse = await authenticatedPage.request.post(
			`/api/agents?workspaceId=${workspaceId}`,
			{
				data: {
					name: `No Instructions Agent ${Date.now()}`,
					model: 'llama-3.3-70b',
				},
			},
		)
		const agent = await createResponse.json()

		// Try to deploy - should fail
		const deployResponse = await authenticatedPage.request.post(
			`/api/agents/${agent.id}/deploy?workspaceId=${workspaceId}`,
			{
				data: {},
			},
		)

		expect(deployResponse.status()).toBe(400)

		// Cleanup
		await authenticatedPage.request.delete(`/api/agents/${agent.id}?workspaceId=${workspaceId}`)
	})
})

test.describe('Tools API - Authenticated', () => {
	test('can list tools including system tools', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Get workspace ID
		const workspacesResponse = await authenticatedPage.request.get('/api/workspaces')
		const workspaces = await workspacesResponse.json()
		const workspaceId = workspaces[0]?.id

		const response = await authenticatedPage.request.get(
			`/api/tools?workspaceId=${workspaceId}&includeSystem=true`,
		)
		expect(response.status()).toBe(200)

		const tools = await response.json()
		expect(Array.isArray(tools)).toBe(true)

		// Should have system tools
		const systemTools = tools.filter((t: any) => t.id?.startsWith('system-'))
		expect(systemTools.length).toBeGreaterThan(0)
	})

	test('system tools have correct structure', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		const workspacesResponse = await authenticatedPage.request.get('/api/workspaces')
		const workspaces = await workspacesResponse.json()
		const workspaceId = workspaces[0]?.id

		const response = await authenticatedPage.request.get(
			`/api/tools?workspaceId=${workspaceId}&includeSystem=true`,
		)
		const tools = await response.json()

		// Find HTTP system tool
		const httpTool = tools.find((t: any) => t.id === 'system-http')
		expect(httpTool).toBeDefined()
		expect(httpTool.name).toBe('HTTP Request')
		expect(httpTool.type).toBe('http')
	})

	test('can create and delete a custom tool', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		const workspacesResponse = await authenticatedPage.request.get('/api/workspaces')
		const workspaces = await workspacesResponse.json()
		const workspaceId = workspaces[0]?.id

		// Create custom tool
		const createResponse = await authenticatedPage.request.post(
			`/api/tools?workspaceId=${workspaceId}`,
			{
				data: {
					name: `Custom Tool ${Date.now()}`,
					description: 'A test custom tool',
					type: 'http',
					config: { url: 'https://api.example.com' },
				},
			},
		)

		expect(createResponse.status()).toBe(201)
		const tool = await createResponse.json()
		expect(tool).toHaveProperty('id')
		expect(tool.name).toContain('Custom Tool')

		// Delete the tool
		const deleteResponse = await authenticatedPage.request.delete(
			`/api/tools/${tool.id}?workspaceId=${workspaceId}`,
		)
		expect(deleteResponse.status()).toBe(200)
	})

	test('cannot delete system tools', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		const workspacesResponse = await authenticatedPage.request.get('/api/workspaces')
		const workspaces = await workspacesResponse.json()
		const workspaceId = workspaces[0]?.id

		// Try to delete a system tool
		const deleteResponse = await authenticatedPage.request.delete(
			`/api/tools/system-http?workspaceId=${workspaceId}`,
		)
		expect(deleteResponse.status()).toBe(400)
	})
})

test.describe('Usage API - Authenticated', () => {
	test('can get workspace usage stats', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		const workspacesResponse = await authenticatedPage.request.get('/api/workspaces')
		const workspaces = await workspacesResponse.json()
		const workspaceId = workspaces[0]?.id

		const response = await authenticatedPage.request.get(`/api/usage?workspaceId=${workspaceId}`)
		expect(response.status()).toBe(200)

		const usage = await response.json()
		expect(usage).toHaveProperty('totalMessages')
		expect(usage).toHaveProperty('totalTokensIn')
		expect(usage).toHaveProperty('totalTokensOut')
	})
})

test.describe('Dev API - Authenticated', () => {
	test('can seed sample agents in development', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		const response = await authenticatedPage.request.post('/api/dev/seed')

		// Should succeed in dev mode
		if (response.status() === 200) {
			const body = await response.json()
			expect(body.success).toBe(true)
			expect(body.created).toHaveProperty('agents')
		} else if (response.status() === 403) {
			// Production mode - expected
			console.log('Dev seed endpoint disabled in production mode')
		}
	})
})
