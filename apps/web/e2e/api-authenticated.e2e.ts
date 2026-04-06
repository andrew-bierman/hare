import { type APIRequestContext, test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * API tests for authenticated Elysia endpoints.
 * Elysia uses standard REST (GET/POST/PATCH/DELETE) with JSON bodies.
 */

async function apiGet(page: Page, path: string, headers: Record<string, string> = {}) {
	return page.request.get(`/api${path}`, { headers })
}

async function apiPost(
	page: Page,
	path: string,
	data: Record<string, unknown> = {},
	headers: Record<string, string> = {},
) {
	return page.request.post(`/api${path}`, {
		headers: { 'Content-Type': 'application/json', ...headers },
		data,
	})
}

async function apiDelete(page: Page, path: string, headers: Record<string, string> = {}) {
	return page.request.delete(`/api${path}`, { headers })
}

async function getWorkspaceId(page: Page): Promise<string> {
	await page.waitForSelector('main', { state: 'visible' })
	await page
		.locator('button')
		.filter({ hasText: /workspace/i })
		.first()
		.waitFor({ state: 'visible', timeout: 10000 })
		.catch(() => {})
	const response = await apiGet(page, '/workspaces')
	expect(response.status()).toBe(200)
	const data = await response.json()
	const workspaces = data.workspaces ?? data
	expect(Array.isArray(workspaces)).toBe(true)
	expect(workspaces.length).toBeGreaterThan(0)
	return workspaces[0].id
}

// Unauthenticated tests
baseTest.describe('API Authentication Requirements', () => {
	baseTest(
		'workspaces endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.get('/api/workspaces')
			expect([401, 403]).toContain(response.status())
		},
	)

	baseTest(
		'agents endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.get('/api/agents')
			expect([401, 403]).toContain(response.status())
		},
	)

	baseTest(
		'tools endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.get('/api/tools')
			expect([401, 403]).toContain(response.status())
		},
	)
})

// Authenticated tests
test.describe('Workspaces API - Authenticated', () => {
	test('can list workspaces', async ({ authenticatedPage }) => {
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage
			.locator('button')
			.filter({ hasText: /workspace/i })
			.first()
			.waitFor({ state: 'visible', timeout: 10000 })
			.catch(() => {})

		const response = await apiGet(authenticatedPage, '/workspaces')
		expect(response.status()).toBe(200)

		const data = await response.json()
		const workspaces = data.workspaces ?? data
		expect(Array.isArray(workspaces)).toBe(true)
		expect(workspaces.length).toBeGreaterThanOrEqual(1)
	})

	test('workspace has required fields', async ({ authenticatedPage }) => {
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage
			.locator('button')
			.filter({ hasText: /workspace/i })
			.first()
			.waitFor({ state: 'visible', timeout: 10000 })
			.catch(() => {})

		let workspaces: Array<{ id: string; name: string }> = []
		for (let attempt = 0; attempt < 5; attempt++) {
			const response = await apiGet(authenticatedPage, '/workspaces')
			expect(response.status()).toBe(200)
			const data = await response.json()
			workspaces = data.workspaces ?? data
			if (Array.isArray(workspaces) && workspaces.length > 0) break
			await authenticatedPage.waitForTimeout(1000)
		}

		expect(workspaces.length).toBeGreaterThan(0)
		expect(workspaces[0]).toHaveProperty('id')
		expect(workspaces[0]).toHaveProperty('name')
	})
})

test.describe('Agents API - Authenticated', () => {
	test('can list agents for workspace', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)
		const response = await apiGet(authenticatedPage, '/agents', {
			'X-Workspace-Id': workspaceId,
		})
		expect(response.status()).toBe(200)

		const data = await response.json()
		const agents = data.agents ?? data
		expect(Array.isArray(agents)).toBe(true)
	})

	test('can create an agent via API', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)
		const wsHeader = { 'X-Workspace-Id': workspaceId }
		const agentName = `Test Agent ${Date.now()}`

		const createResp = await apiPost(
			authenticatedPage,
			'/agents',
			{
				name: agentName,
				description: 'A test agent created via API',
				model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
				instructions: 'You are a helpful test assistant.',
				systemToolsEnabled: true,
			},
			wsHeader,
		)

		if (createResp.ok()) {
			const agent = await createResp.json()
			expect(agent).toHaveProperty('id')
		} else {
			// Verify agent was created by listing
			let found = false
			for (let attempt = 0; attempt < 5; attempt++) {
				const listResp = await apiGet(authenticatedPage, '/agents', wsHeader)
				expect(listResp.status()).toBe(200)
				const data = await listResp.json()
				const agents = data.agents ?? data
				if (Array.isArray(agents)) {
					found = agents.some((a: { name: string }) => a.name === agentName)
					if (found) break
				}
				await authenticatedPage.waitForTimeout(1000)
			}
			expect(found).toBe(true)
		}
	})
})

test.describe('Tools API - Authenticated', () => {
	test('can list tools', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)
		const response = await apiGet(authenticatedPage, '/tools', {
			'X-Workspace-Id': workspaceId,
		})
		expect(response.status()).toBe(200)

		const data = await response.json()
		const tools = data.tools ?? data
		expect(Array.isArray(tools)).toBe(true)
	})

	test('can create and delete a custom tool', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)
		const wsHeader = { 'X-Workspace-Id': workspaceId }

		const createResp = await apiPost(
			authenticatedPage,
			'/tools',
			{
				name: `Custom Tool ${Date.now()}`,
				description: 'A test custom tool',
				type: 'http',
				inputSchema: { url: { type: 'string' } },
				config: { url: 'https://api.example.com' },
			},
			wsHeader,
		)

		expect([200, 201]).toContain(createResp.status())
		const tool = await createResp.json()
		expect(tool).toHaveProperty('id')

		// Delete
		const deleteResp = await apiDelete(authenticatedPage, `/tools/${tool.id}`, wsHeader)
		expect(deleteResp.status()).toBe(200)
	})
})

test.describe('Usage API - Authenticated', () => {
	test('can get workspace usage stats', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)
		const response = await apiGet(authenticatedPage, '/usage', {
			'X-Workspace-Id': workspaceId,
		})
		expect(response.status()).toBe(200)

		const data = await response.json()
		expect(data).toHaveProperty('period')
	})
})
