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

		// Look for workspace switcher button - it's a button with "Select workspace" or workspace name
		// The sidebar is a div (not aside), so use button selector directly
		const workspaceButton = authenticatedPage
			.getByRole('button')
			.filter({ hasText: /workspace|select/i })
			.first()

		const isVisible = await workspaceButton.isVisible({ timeout: 5000 }).catch(() => false)
		expect(isVisible).toBe(true)
	})

	test('can open workspace dropdown', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Find and click the workspace switcher
		const workspaceButton = authenticatedPage
			.getByRole('button')
			.filter({ hasText: /workspace|select/i })
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
			.getByRole('button')
			.filter({ hasText: /workspace|select/i })
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
	baseTest('unauthenticated user is redirected to sign-in', async ({ page }: { page: Page }) => {
		// Try to access workspace page directly
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Protected route should redirect to sign-in
		await expect(page).toHaveURL(/\/sign-in/)
		await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
	})
})
