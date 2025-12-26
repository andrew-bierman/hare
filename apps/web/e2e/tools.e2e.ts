import { expect, type Page, test } from '@playwright/test'

test.describe('Tools Page - Layout', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')
	})

	test('displays tools page heading', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible()
	})

	test('displays Add Tool button', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('button', { name: 'Add Tool' }).first()).toBeVisible()
	})

	test('displays search input', async ({ page }: { page: Page }) => {
		await expect(page.getByPlaceholder('Search tools...')).toBeVisible()
	})

	test('displays tools sections when loaded', async ({ page }: { page: Page }) => {
		// Wait for loading to complete
		await page.waitForTimeout(2000)
		// Check for either System Tools or Custom Tools section heading
		const hasSystemTools = await page.getByRole('heading', { name: 'System Tools' }).isVisible().catch(() => false)
		const hasCustomTools = await page.getByRole('heading', { name: 'Custom Tools', exact: true }).isVisible().catch(() => false)
		// At least one section should be visible after loading
		expect(hasSystemTools || hasCustomTools).toBeTruthy()
	})
})

test.describe('Tools Page - Search', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')
	})

	test('can type in search input', async ({ page }: { page: Page }) => {
		const searchInput = page.getByPlaceholder('Search tools...')
		await searchInput.fill('http')
		await expect(searchInput).toHaveValue('http')
	})

	test('can clear search input', async ({ page }: { page: Page }) => {
		const searchInput = page.getByPlaceholder('Search tools...')
		await searchInput.fill('test')
		await searchInput.clear()
		await expect(searchInput).toHaveValue('')
	})
})

test.describe('Tools Page - Create Tool Dialog', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')
	})

	test('opens create dialog when Add Tool is clicked', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByText('Create Tool')).toBeVisible()
	})

	test('create dialog has required form fields', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()

		await expect(page.getByLabel('Name *')).toBeVisible()
		await expect(page.getByLabel('Description')).toBeVisible()
		await expect(page.getByLabel('Type')).toBeVisible()
		await expect(page.getByLabel('Configuration (JSON)')).toBeVisible()
	})

	test('create dialog has action buttons', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()

		await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Create' })).toBeVisible()
	})

	test('cancel button closes the dialog', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()
		await expect(page.getByRole('dialog')).toBeVisible()

		await page.getByRole('button', { name: 'Cancel' }).click()
		await expect(page.getByRole('dialog')).not.toBeVisible()
	})

	test('can fill in tool name', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()

		const nameInput = page.getByLabel('Name *')
		await nameInput.fill('My Test Tool')
		await expect(nameInput).toHaveValue('My Test Tool')
	})

	test('can fill in tool description', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()

		const descInput = page.getByLabel('Description')
		await descInput.fill('A test tool for testing')
		await expect(descInput).toHaveValue('A test tool for testing')
	})

	test('can select tool type', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()

		// Click the type select
		await page.getByLabel('Type').click()

		// Verify options are visible
		const selectContent = page.locator('[role="listbox"]')
		await expect(selectContent).toBeVisible()
	})

	test('can fill in configuration JSON', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()

		const configInput = page.getByLabel('Configuration (JSON)')
		await configInput.fill('{"url": "https://example.com"}')
		await expect(configInput).toHaveValue('{"url": "https://example.com"}')
	})

	test('create button is disabled when name is empty', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()

		const createButton = page.getByRole('button', { name: 'Create' })
		await expect(createButton).toBeDisabled()
	})

	test('create button is enabled when name is filled', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()

		await page.getByLabel('Name *').fill('Test Tool')
		const createButton = page.getByRole('button', { name: 'Create' })
		await expect(createButton).toBeEnabled()
	})
})

test.describe('Tools Page - Responsive Design', () => {
	test('displays correctly on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')

		await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Add Tool' }).first()).toBeVisible()
	})

	test('displays correctly on tablet', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 768, height: 1024 })
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')

		await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible()
	})
})

test.describe('Tools Page - Accessibility', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')
	})

	test('Add Tool button is keyboard accessible', async ({ page }: { page: Page }) => {
		const addButton = page.getByRole('button', { name: 'Add Tool' }).first()
		await addButton.focus()
		await expect(addButton).toBeFocused()
	})

	test('search input is keyboard accessible', async ({ page }: { page: Page }) => {
		const searchInput = page.getByPlaceholder('Search tools...')
		await searchInput.focus()
		await expect(searchInput).toBeFocused()
	})

	test('dialog can be closed with Escape key', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()
		await expect(page.getByRole('dialog')).toBeVisible()

		await page.keyboard.press('Escape')
		await expect(page.getByRole('dialog')).not.toBeVisible()
	})
})

test.describe('Tools Page - Empty State', () => {
	test('page loads without errors', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')

		// Page should not have errors
		await expect(page.locator('body')).not.toContainText('404')
		await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible()
	})
})
