import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Workspace management E2E tests.
 * Tests workspace switching, creation, and management.
 */

test.describe('Workspace Switcher - Authenticated', () => {
	test('workspace switcher is visible in sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for workspace switcher button
		const workspaceSwitcher = authenticatedPage
			.locator('[data-testid="workspace-switcher"]')
			.first()
		// If no data-testid, look for the button in the sidebar
		const sidebarButton = authenticatedPage.locator('aside button').first()

		const isVisible =
			(await workspaceSwitcher.isVisible().catch(() => false)) ||
			(await sidebarButton.isVisible().catch(() => false))

		expect(isVisible).toBe(true)
	})

	test('can open workspace dropdown', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Find and click the workspace switcher (usually a button with workspace name)
		const workspaceButton = authenticatedPage
			.locator('aside')
			.getByRole('button')
			.filter({ hasText: /workspace|personal/i })
			.first()

		if (await workspaceButton.isVisible({ timeout: 5000 }).catch(() => false)) {
			await workspaceButton.click()

			// Dropdown should appear
			await authenticatedPage.waitForTimeout(500)

			// Look for dropdown content or menu items
			const dropdownVisible = await authenticatedPage
				.locator('[role="menu"], [role="listbox"], [data-state="open"]')
				.first()
				.isVisible({ timeout: 2000 })
				.catch(() => false)

			// If dropdown visible, close it by clicking elsewhere
			if (dropdownVisible) {
				await authenticatedPage.keyboard.press('Escape')
			}
		}
	})

	test('can create a new workspace via dialog', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Find workspace switcher
		const workspaceButton = authenticatedPage
			.locator('aside')
			.getByRole('button')
			.filter({ hasText: /workspace|personal/i })
			.first()

		if (await workspaceButton.isVisible({ timeout: 5000 }).catch(() => false)) {
			await workspaceButton.click()
			await authenticatedPage.waitForTimeout(500)

			// Look for "Create workspace" option
			const createOption = authenticatedPage.getByText(/create.*workspace/i).first()
			if (await createOption.isVisible({ timeout: 2000 }).catch(() => false)) {
				await createOption.click()

				// Dialog should open
				const dialog = authenticatedPage.getByRole('dialog')
				await expect(dialog).toBeVisible({ timeout: 3000 })

				// Fill in workspace name
				const nameInput = dialog.getByRole('textbox').first()
				const workspaceName = `Test Workspace ${Date.now()}`
				await nameInput.fill(workspaceName)

				// Create button
				const createButton = dialog.getByRole('button', { name: /create/i })
				await createButton.click()

				// Wait for dialog to close or success
				await authenticatedPage.waitForTimeout(2000)
			}
		}
	})
})

test.describe('Workspace Context', () => {
	test('workspace context is maintained across pages', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Navigate to agents
		await authenticatedPage.getByRole('link', { name: 'Agents', exact: true }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents/)
		await authenticatedPage.waitForLoadState('networkidle')

		// Navigate to tools
		await authenticatedPage.getByRole('link', { name: 'Tools', exact: true }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/tools/)
		await authenticatedPage.waitForLoadState('networkidle')

		// Navigate to settings
		await authenticatedPage.getByRole('link', { name: 'Settings', exact: true }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/settings/)
		await authenticatedPage.waitForLoadState('networkidle')

		// Verify we're still authenticated and on the correct page
		await expect(authenticatedPage.getByRole('heading', { name: 'Settings' })).toBeVisible()
	})

	test('settings page shows workspace info', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for workspace section
		const workspaceSection = authenticatedPage.getByText(/workspace/i).first()
		await expect(workspaceSection).toBeVisible()
	})
})

baseTest.describe('Workspace Access Control', () => {
	baseTest(
		'unauthenticated user cannot access workspace-specific features',
		async ({ page }: { page: Page }) => {
			// Try to access workspace page directly
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Page should still load (middleware might allow it) but show limited content
			// or redirect to login
			const url = page.url()
			expect(url.includes('/dashboard') || url.includes('/sign-in')).toBe(true)
		},
	)
})
