import { expect, test } from './fixtures'

test.describe('Agents CRUD - Real Functionality', () => {
	test('agents list page loads and shows key elements', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/agents')
		await page.waitForSelector('main', { state: 'visible' })

		// Page title
		await expect(page.getByRole('heading', { name: 'Agents' }).first()).toBeVisible()

		// Search input
		await expect(page.getByPlaceholder(/search agents/i)).toBeVisible()

		// Filter tabs - All, Live, Drafts
		await expect(page.getByText('All').first()).toBeVisible()

		// New Agent button
		await expect(page.getByRole('button', { name: /new agent/i })).toBeVisible()
	})

	test('create agent page has form fields', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/agents/new')
		await page.waitForSelector('main', { state: 'visible' })

		// Name field should exist
		const nameInput = page.getByLabel(/name/i).first()
		await expect(nameInput).toBeVisible()

		// Create button should exist
		await expect(page.getByRole('button', { name: /create/i }).first()).toBeVisible()
	})

	test('full agent lifecycle: create, view, and navigate', async ({ authenticatedPage: page }) => {
		const agentName = `E2E Agent ${Date.now()}`

		// Step 1: Create agent
		await page.goto('/dashboard/agents/new')
		await page.waitForSelector('main', { state: 'visible' })

		const nameInput = page.getByLabel(/name/i).first()
		await nameInput.click()
		await nameInput.fill('')
		await nameInput.pressSequentially(agentName, { delay: 10 })

		await page
			.getByRole('button', { name: /create/i })
			.first()
			.click()

		// Should navigate away from /new
		await page.waitForURL(/\/dashboard\/agents\/(?!new)/, { timeout: 15000 })

		// Step 2: Verify agent detail page shows agent name
		await expect(page.getByText(agentName).first()).toBeVisible({ timeout: 10000 })

		// Step 3: Navigate back to agents list
		await page.goto('/dashboard/agents')
		await page.waitForSelector('main', { state: 'visible' })

		// Agent should appear in list
		await expect(page.getByText(agentName).first()).toBeVisible({ timeout: 10000 })
	})

	test('templates page loads', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/agents/templates')
		await page.waitForSelector('main', { state: 'visible' })

		await expect(page.getByText(/template/i).first()).toBeVisible()
	})
})
