import { type APIRequestContext, test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Comprehensive API tests for authenticated endpoints.
 * Tests all CRUD operations for workspaces, agents, and tools.
 *
 * Note: oRPC endpoints at /api/rpc/* have CSRF protection (double-submit cookie).
 * - GET requests bypass CSRF checks
 * - POST/PUT/PATCH/DELETE require the X-CSRF-Token header matching the csrf cookie
 * - Unauthenticated requests may get 403 (CSRF) before 401 (auth)
 */

/**
 * Extract the CSRF token from the page's cookies.
 * The csrf cookie is set by the server on every request (httpOnly: false).
 * In dev mode the cookie name is 'csrf', in production '__Host-csrf'.
 */
async function getCsrfToken(page: Page): Promise<string> {
	const cookies = await page.context().cookies()
	const csrfCookie =
		cookies.find((c) => c.name === 'csrf') ?? cookies.find((c) => c.name === '__Host-csrf')
	if (!csrfCookie) {
		throw new Error('CSRF cookie not found - ensure page has loaded at least once')
	}
	return csrfCookie.value
}

/**
 * Helper to get the first workspace ID from an authenticated page.
 * Uses the oRPC endpoint which returns { workspaces: [...] }.
 */
async function getWorkspaceId(page: Page): Promise<string> {
	await page.waitForSelector('main', { state: 'visible' })
	const response = await page.request.get('/api/rpc/workspaces/list')
	expect(response.status()).toBe(200)
	const body = await response.json()
	expect(body).toHaveProperty('workspaces')
	expect(Array.isArray(body.workspaces)).toBe(true)
	expect(body.workspaces.length).toBeGreaterThan(0)
	return body.workspaces[0].id
}

baseTest.describe('API Authentication Requirements', () => {
	baseTest(
		'workspaces endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.get('/api/rpc/workspaces/list')
			// CSRF may block (403) before auth check (401) for non-browser requests
			expect([401, 403]).toContain(response.status())
		},
	)

	baseTest(
		'agents endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.get('/api/rpc/agents/list')
			expect([401, 403]).toContain(response.status())
		},
	)

	baseTest(
		'tools endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.get('/api/rpc/tools/list')
			expect([401, 403]).toContain(response.status())
		},
	)

	baseTest(
		'usage endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.get('/api/rpc/usage/getWorkspaceUsage')
			expect([401, 403]).toContain(response.status())
		},
	)

	baseTest(
		'dev/seed endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.post('/api/dev/seed')
			// Dev endpoint might return 401, 403 (CSRF), or 404
			expect([401, 403, 404]).toContain(response.status())
		},
	)
})

test.describe('Workspaces API - Authenticated', () => {
	test('can list workspaces', async ({ authenticatedPage }) => {
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const response = await authenticatedPage.request.get('/api/rpc/workspaces/list')
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(body).toHaveProperty('workspaces')
		expect(Array.isArray(body.workspaces)).toBe(true)
		// New user should have at least one workspace (created by auto-workspace feature)
		expect(body.workspaces.length).toBeGreaterThanOrEqual(1)
	})

	test('workspace has required fields', async ({ authenticatedPage }) => {
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		const response = await authenticatedPage.request.get('/api/rpc/workspaces/list')
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(body.workspaces.length).toBeGreaterThan(0)

		const workspace = body.workspaces[0]
		expect(workspace).toHaveProperty('id')
		expect(workspace).toHaveProperty('name')
	})
})

test.describe('Agents API - Authenticated', () => {
	test('can list agents for workspace', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		// List agents via oRPC (requires X-Workspace-Id header)
		const response = await authenticatedPage.request.get('/api/rpc/agents/list', {
			headers: { 'X-Workspace-Id': workspaceId },
		})
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(body).toHaveProperty('agents')
		expect(Array.isArray(body.agents)).toBe(true)
	})

	test('can create and delete an agent', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)
		const csrfToken = await getCsrfToken(authenticatedPage)

		// Create agent via oRPC
		const createResponse = await authenticatedPage.request.post('/api/rpc/agents/create', {
			headers: {
				'Content-Type': 'application/json',
				'X-Workspace-Id': workspaceId,
				'X-CSRF-Token': csrfToken,
			},
			data: {
				name: `Test Agent ${Date.now()}`,
				description: 'A test agent created via API',
				model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
				instructions: 'You are a helpful test assistant.',
			},
		})

		expect(createResponse.status()).toBe(201)
		const agent = await createResponse.json()
		expect(agent).toHaveProperty('id')
		expect(agent).toHaveProperty('name')
		expect(agent.status).toBe('draft')

		// Delete the agent via oRPC
		const deleteResponse = await authenticatedPage.request.delete('/api/rpc/agents/delete', {
			headers: {
				'Content-Type': 'application/json',
				'X-Workspace-Id': workspaceId,
				'X-CSRF-Token': csrfToken,
			},
			data: { id: agent.id },
		})
		expect(deleteResponse.status()).toBe(200)
	})

	test('can update an agent', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)
		const csrfToken = await getCsrfToken(authenticatedPage)

		const headers = {
			'Content-Type': 'application/json',
			'X-Workspace-Id': workspaceId,
			'X-CSRF-Token': csrfToken,
		}

		// Create agent first
		const createResponse = await authenticatedPage.request.post('/api/rpc/agents/create', {
			headers,
			data: {
				name: `Update Test Agent ${Date.now()}`,
				description: 'Original description',
				model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
				instructions: 'Original instructions.',
			},
		})
		expect(createResponse.status()).toBe(201)
		const agent = await createResponse.json()

		// Update agent via oRPC
		const updateResponse = await authenticatedPage.request.patch('/api/rpc/agents/update', {
			headers,
			data: {
				id: agent.id,
				description: 'Updated description',
				instructions: 'Updated instructions for deployment',
			},
		})

		expect(updateResponse.status()).toBe(200)
		const updatedAgent = await updateResponse.json()
		expect(updatedAgent.description).toBe('Updated description')

		// Cleanup
		await authenticatedPage.request.delete('/api/rpc/agents/delete', {
			headers,
			data: { id: agent.id },
		})
	})

	test('can deploy an agent with instructions', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)
		const csrfToken = await getCsrfToken(authenticatedPage)

		const headers = {
			'Content-Type': 'application/json',
			'X-Workspace-Id': workspaceId,
			'X-CSRF-Token': csrfToken,
		}

		// Create agent with instructions
		const createResponse = await authenticatedPage.request.post('/api/rpc/agents/create', {
			headers,
			data: {
				name: `Deploy Test Agent ${Date.now()}`,
				description: 'Agent ready for deployment',
				model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
				instructions: 'You are a helpful assistant for testing deployments.',
			},
		})
		const agent = await createResponse.json()

		// Deploy agent via oRPC
		const deployResponse = await authenticatedPage.request.post('/api/rpc/agents/deploy', {
			headers,
			data: { id: agent.id },
		})

		expect(deployResponse.status()).toBe(200)
		const deployment = await deployResponse.json()
		expect(deployment).toHaveProperty('status')
		expect(deployment.status).toBe('active')

		// Cleanup
		await authenticatedPage.request.delete('/api/rpc/agents/delete', {
			headers,
			data: { id: agent.id },
		})
	})

	test('cannot create agent without instructions', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)
		const csrfToken = await getCsrfToken(authenticatedPage)

		// Try to create agent WITHOUT instructions - should fail validation
		const createResponse = await authenticatedPage.request.post('/api/rpc/agents/create', {
			headers: {
				'Content-Type': 'application/json',
				'X-Workspace-Id': workspaceId,
				'X-CSRF-Token': csrfToken,
			},
			data: {
				name: `No Instructions Agent ${Date.now()}`,
				model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			},
		})

		// Should fail validation because instructions are required
		expect(createResponse.ok()).toBe(false)
		expect([400, 422]).toContain(createResponse.status())
	})
})

test.describe('Tools API - Authenticated', () => {
	test('can list tools', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		const response = await authenticatedPage.request.get('/api/rpc/tools/list', {
			headers: { 'X-Workspace-Id': workspaceId },
		})
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(body).toHaveProperty('tools')
		expect(Array.isArray(body.tools)).toBe(true)
	})

	test('can create and delete a custom tool', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)
		const csrfToken = await getCsrfToken(authenticatedPage)

		const headers = {
			'Content-Type': 'application/json',
			'X-Workspace-Id': workspaceId,
			'X-CSRF-Token': csrfToken,
		}

		// Create custom tool via oRPC
		const createResponse = await authenticatedPage.request.post('/api/rpc/tools/create', {
			headers,
			data: {
				name: `Custom Tool ${Date.now()}`,
				description: 'A test custom tool',
				type: 'http',
				inputSchema: { url: { type: 'string' } },
				config: { url: 'https://api.example.com' },
			},
		})

		expect(createResponse.status()).toBe(201)
		const tool = await createResponse.json()
		expect(tool).toHaveProperty('id')
		expect(tool.name).toContain('Custom Tool')

		// Delete the tool via oRPC
		const deleteResponse = await authenticatedPage.request.delete('/api/rpc/tools/delete', {
			headers,
			data: { id: tool.id },
		})
		expect(deleteResponse.status()).toBe(200)
	})
})

test.describe('Usage API - Authenticated', () => {
	test('can get workspace usage stats', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		const response = await authenticatedPage.request.get('/api/rpc/usage/getWorkspaceUsage', {
			headers: { 'X-Workspace-Id': workspaceId },
		})
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(body).toHaveProperty('period')
		expect(body).toHaveProperty('usage')
		expect(body.usage).toHaveProperty('totalMessages')
		expect(body.usage).toHaveProperty('totalTokensIn')
		expect(body.usage).toHaveProperty('totalTokensOut')
	})
})

test.describe('Dev API - Authenticated', () => {
	test('can seed sample agents in development', async ({ authenticatedPage }) => {
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		const csrfToken = await getCsrfToken(authenticatedPage)

		const response = await authenticatedPage.request.post('/api/dev/seed', {
			headers: {
				'Content-Type': 'application/json',
				'X-CSRF-Token': csrfToken,
			},
		})

		// Should succeed in dev mode
		if (response.status() === 200) {
			const body = await response.json()
			expect(body.success).toBe(true)
			expect(body.created).toHaveProperty('agents')
		} else if (response.status() === 403) {
			// Production mode or CSRF - expected
			console.log('Dev seed endpoint disabled in production mode')
		}
	})
})
