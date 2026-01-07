import { type APIRequestContext, test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Comprehensive API tests for authenticated endpoints.
 * Tests all CRUD operations for workspaces, agents, and tools.
 */

/**
 * Helper to get the first workspace ID from an authenticated page.
 * Ensures page is ready and validates the API response.
 */
async function getWorkspaceId(page: Page): Promise<string> {
	await page.waitForLoadState('networkidle')
	const response = await page.request.get('/api/rpc/workspaces')
	expect(response.status()).toBe(200)
	const body = await response.json()
	expect(body).toHaveProperty('workspaces')
	expect(body.workspaces.length).toBeGreaterThan(0)
	return body.workspaces[0].id
}

baseTest.describe('API Authentication Requirements', () => {
	baseTest(
		'workspaces endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.get('/api/rpc/workspaces')
			expect(response.status()).toBe(401)
		},
	)

	baseTest(
		'agents endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.get('/api/rpc/agents?workspaceId=test')
			expect(response.status()).toBe(401)
		},
	)

	baseTest(
		'tools endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.get('/api/rpc/tools?workspaceId=test')
			expect(response.status()).toBe(401)
		},
	)

	baseTest(
		'usage endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.get('/api/rpc/usage?workspaceId=test')
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
		// Ensure page is on the right domain for cookies to be included in requests
		await authenticatedPage.waitForLoadState('networkidle')

		// Make API request using page context (inherits auth cookies)
		const response = await authenticatedPage.request.get('/api/rpc/workspaces')
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(body).toHaveProperty('workspaces')
		expect(Array.isArray(body.workspaces)).toBe(true)
		// New user should have at least one workspace (created by auto-workspace feature)
		expect(body.workspaces.length).toBeGreaterThanOrEqual(1)
	})

	test('workspace has required fields', async ({ authenticatedPage }) => {
		await authenticatedPage.waitForLoadState('networkidle')
		const response = await authenticatedPage.request.get('/api/rpc/workspaces')
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(body.workspaces.length).toBeGreaterThan(0)

		const workspace = body.workspaces[0]
		expect(workspace).toHaveProperty('id')
		expect(workspace).toHaveProperty('name')
		expect(workspace).toHaveProperty('role')
		expect(workspace).toHaveProperty('createdAt')
	})
})

test.describe('Agents API - Authenticated', () => {
	test('can list agents for workspace', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		// List agents
		const response = await authenticatedPage.request.get(`/api/rpc/agents?workspaceId=${workspaceId}`)
		expect(response.status()).toBe(200)

		const body = await response.json()
		// API returns { agents: [...] } format
		expect(body).toHaveProperty('agents')
		expect(Array.isArray(body.agents)).toBe(true)
	})

	test('can create and delete an agent', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		// Create agent
		const createResponse = await authenticatedPage.request.post(
			`/api/rpc/agents?workspaceId=${workspaceId}`,
			{
				data: {
					name: `Test Agent ${Date.now()}`,
					description: 'A test agent created via API',
					model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
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
			`/api/rpc/agents/${agent.id}?workspaceId=${workspaceId}`,
		)
		expect(deleteResponse.status()).toBe(200)
	})

	test('can update an agent', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		// Create agent first
		const createResponse = await authenticatedPage.request.post(
			`/api/rpc/agents?workspaceId=${workspaceId}`,
			{
				data: {
					name: `Update Test Agent ${Date.now()}`,
					description: 'Original description',
					model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
					instructions: 'Original instructions.',
				},
			},
		)
		expect(createResponse.status()).toBe(201)
		const agent = await createResponse.json()

		// Update agent
		const updateResponse = await authenticatedPage.request.patch(
			`/api/rpc/agents/${agent.id}?workspaceId=${workspaceId}`,
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
		await authenticatedPage.request.delete(`/api/rpc/agents/${agent.id}?workspaceId=${workspaceId}`)
	})

	test('can deploy an agent with instructions', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		// Create agent with instructions
		const createResponse = await authenticatedPage.request.post(
			`/api/rpc/agents?workspaceId=${workspaceId}`,
			{
				data: {
					name: `Deploy Test Agent ${Date.now()}`,
					description: 'Agent ready for deployment',
					model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
					instructions: 'You are a helpful assistant for testing deployments.',
				},
			},
		)
		const agent = await createResponse.json()

		// Deploy agent
		const deployResponse = await authenticatedPage.request.post(
			`/api/rpc/agents/${agent.id}/deploy?workspaceId=${workspaceId}`,
			{
				data: {},
			},
		)

		expect(deployResponse.status()).toBe(200)
		const deployedAgent = await deployResponse.json()
		expect(deployedAgent.status).toBe('deployed')

		// Cleanup
		await authenticatedPage.request.delete(`/api/rpc/agents/${agent.id}?workspaceId=${workspaceId}`)
	})

	test('cannot create agent without instructions', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		// Try to create agent WITHOUT instructions - should fail validation
		const createResponse = await authenticatedPage.request.post(
			`/api/rpc/agents?workspaceId=${workspaceId}`,
			{
				data: {
					name: `No Instructions Agent ${Date.now()}`,
					model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
				},
			},
		)

		// Should fail validation because instructions are required
		expect(createResponse.status()).toBe(400)
	})
})

test.describe('Tools API - Authenticated', () => {
	test('can list tools including system tools', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		const response = await authenticatedPage.request.get(
			`/api/rpc/tools?workspaceId=${workspaceId}&includeSystem=true`,
		)
		expect(response.status()).toBe(200)

		const body = await response.json()
		// API returns { tools: [...] } format
		expect(body).toHaveProperty('tools')
		expect(Array.isArray(body.tools)).toBe(true)

		// Should have system tools (they have IDs like http_request, kv_get, etc.)
		expect(body.tools.length).toBeGreaterThan(0)
	})

	test('system tools have correct structure', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		const response = await authenticatedPage.request.get(
			`/api/rpc/tools?workspaceId=${workspaceId}&includeSystem=true`,
		)
		const body = await response.json()

		// Find HTTP request system tool
		const httpTool = body.tools.find((t: { id?: string }) => t.id === 'http_request')
		expect(httpTool).toBeDefined()
		expect(httpTool.name).toBeDefined()
		expect(httpTool.type).toBe('http')
	})

	test('can create and delete a custom tool', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		// Create custom tool with required inputSchema
		const createResponse = await authenticatedPage.request.post(
			`/api/rpc/tools?workspaceId=${workspaceId}`,
			{
				data: {
					name: `Custom Tool ${Date.now()}`,
					description: 'A test custom tool',
					type: 'http',
					inputSchema: { url: { type: 'string' } },
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
			`/api/rpc/tools/${tool.id}?workspaceId=${workspaceId}`,
		)
		expect(deleteResponse.status()).toBe(200)
	})

	test('cannot delete system tools', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		// Try to delete a system tool (http_request is a real system tool ID)
		const deleteResponse = await authenticatedPage.request.delete(
			`/api/rpc/tools/http_request?workspaceId=${workspaceId}`,
		)
		expect(deleteResponse.status()).toBe(400)
	})
})

test.describe('Usage API - Authenticated', () => {
	test('can get workspace usage stats', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		const response = await authenticatedPage.request.get(`/api/rpc/usage?workspaceId=${workspaceId}`)
		expect(response.status()).toBe(200)

		const body = await response.json()
		// API returns { period: {...}, usage: {...} } format
		expect(body).toHaveProperty('period')
		expect(body).toHaveProperty('usage')
		expect(body.usage).toHaveProperty('totalMessages')
		expect(body.usage).toHaveProperty('totalTokensIn')
		expect(body.usage).toHaveProperty('totalTokensOut')
	})
})

test.describe('Dev API - Authenticated', () => {
	test('can seed sample agents in development', async ({ authenticatedPage }) => {
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
