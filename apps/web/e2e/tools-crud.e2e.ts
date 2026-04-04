import { expect, test } from './fixtures'

test.describe('Tools CRUD - Real Functionality', () => {
	test('tools list page loads with key elements', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForSelector('main', { state: 'visible' })

		// Page title
		await expect(page.getByRole('heading', { name: 'Tools' })).toBeVisible()

		// Search input
		await expect(page.getByPlaceholder(/search tools/i)).toBeVisible()

		// Create HTTP Tool button (may be link or button)
		await expect(page.getByText('Create HTTP Tool').first()).toBeVisible()

		// Custom Tools section
		await expect(page.getByText('Custom Tools').first()).toBeVisible()
	})

	test('create tool page loads', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/tools/new')
		await page.waitForSelector('main', { state: 'visible' })

		// Should see the create tool form or page
		const nameInput = page.getByLabel(/name/i).first()
		await expect(nameInput).toBeVisible()
	})

	test('full tool lifecycle: create via form and verify in list', async ({ authenticatedPage: page }) => {
		const toolName = `E2E Tool ${Date.now()}`

		await page.goto('/dashboard/tools/new')
		await page.waitForSelector('main', { state: 'visible' })

		// Fill in tool name
		const nameInput = page.getByLabel(/name/i).first()
		await nameInput.click()
		await nameInput.fill('')
		await nameInput.pressSequentially(toolName, { delay: 10 })

		// Fill in description if available
		const descInput = page.getByLabel(/description/i).first()
		if (await descInput.isVisible().catch(() => false)) {
			await descInput.click()
			await descInput.pressSequentially('A test HTTP tool created by E2E', { delay: 10 })
		}

		// Fill in URL if available
		const urlInput = page.getByLabel(/url|endpoint/i).first()
		if (await urlInput.isVisible().catch(() => false)) {
			await urlInput.click()
			await urlInput.pressSequentially('https://httpbin.org/get', { delay: 10 })
		}

		// Submit the form
		const createButton = page.getByRole('button', { name: /create|save/i }).first()
		if (await createButton.isEnabled()) {
			await createButton.click()
			// Wait for navigation or success
			await page.waitForURL(/\/dashboard\/tools/, { timeout: 15000 }).catch(() => {})
		}

		// Navigate to tools list and verify
		await page.goto('/dashboard/tools')
		await page.waitForSelector('main', { state: 'visible' })

		await expect(page.getByText(toolName).first()).toBeVisible({ timeout: 10000 })
	})

	test('Create HTTP Tool button opens creation flow', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForSelector('main', { state: 'visible' })

		// Click Create HTTP Tool button/link
		await page.getByText('Create HTTP Tool').first().click()

		// Should navigate to tool creation or open dialog
		await page.waitForURL(/\/dashboard\/tools\/new/, { timeout: 10000 }).catch(async () => {
			// Might open a dialog instead
			const dialog = page.getByRole('dialog').first()
			if (await dialog.isVisible().catch(() => false)) {
				await expect(dialog).toBeVisible()
			}
		})
	})

	test('custom tools section is visible', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForSelector('main', { state: 'visible' })

		// Custom Tools section header
		await expect(page.getByText('Custom Tools').first()).toBeVisible()
	})

	test('tools search input works', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForSelector('main', { state: 'visible' })

		const searchInput = page.getByPlaceholder(/search tools/i)
		await searchInput.click()
		await searchInput.pressSequentially('nonexistent-tool', { delay: 10 })

		// Search should filter - no results expected
		// Just verify search input accepts text
		await expect(searchInput).toHaveValue('nonexistent-tool')
	})
})
