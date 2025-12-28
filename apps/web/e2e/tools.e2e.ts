import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

baseTest.describe('Tools Page - Unauthenticated', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')
	})

	baseTest('displays tools heading', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible()
	})

	baseTest('has add tool buttons', async ({ page }: { page: Page }) => {
		// Should have Quick Add button
		await expect(page.getByRole('button', { name: /quick add/i })).toBeVisible()
		// Should have Create HTTP Tool button
		await expect(page.getByRole('link', { name: /create http tool/i })).toBeVisible()
	})

	baseTest('has search input', async ({ page }: { page: Page }) => {
		const searchInput = page.getByPlaceholder('Search tools...')
		await expect(searchInput).toBeVisible()
	})

	baseTest('page has content', async ({ page }: { page: Page }) => {
		// Wait for page to load and verify no 404
		await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible()
		await expect(page.locator('body')).not.toContainText('404')
	})
})

baseTest.describe('Tools Page - Quick Add Dialog', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')
	})

	baseTest('clicking Quick Add opens dialog', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: /quick add/i }).click()
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByRole('heading', { name: 'Create Tool' })).toBeVisible()
	})

	baseTest('dialog has required form fields', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: /quick add/i }).click()
		await expect(page.getByLabel('Name *')).toBeVisible()
		await expect(page.getByLabel('Description')).toBeVisible()
		await expect(page.getByLabel('Type')).toBeVisible()
		await expect(page.getByLabel('Configuration (JSON)')).toBeVisible()
	})

	baseTest('dialog has create and cancel buttons', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: /quick add/i }).click()
		await expect(page.getByRole('button', { name: 'Create' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
	})

	baseTest('cancel button closes dialog', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: /quick add/i }).click()
		await expect(page.getByRole('dialog')).toBeVisible()
		await page.getByRole('button', { name: 'Cancel' }).click()
		await expect(page.getByRole('dialog')).not.toBeVisible()
	})

	baseTest('create button is disabled when name is empty', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: /quick add/i }).click()
		const createButton = page.getByRole('button', { name: 'Create' })
		await expect(createButton).toBeDisabled()
	})
})

baseTest.describe('New HTTP Tool Page - Unauthenticated', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools/new')
		await page.waitForLoadState('networkidle')
	})

	baseTest('displays create http tool heading', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('heading', { name: 'Create HTTP Tool' })).toBeVisible()
	})

	baseTest('has tool details card', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Tool Details')).toBeVisible()
		await expect(page.getByLabel('Name *')).toBeVisible()
		await expect(page.getByLabel('Description')).toBeVisible()
	})

	baseTest('has http configuration card', async ({ page }: { page: Page }) => {
		await expect(page.getByText('HTTP Configuration')).toBeVisible()
		await expect(page.getByLabel('Method')).toBeVisible()
		await expect(page.getByLabel('URL *')).toBeVisible()
	})

	baseTest('has input parameters section', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Input Parameters', { exact: true })).toBeVisible()
		// The Add Parameter button might have different text
		const addParamButton = page.getByRole('button', { name: /add parameter/i })
		await expect(addParamButton).toBeVisible()
	})

	baseTest('has actions card with create and cancel buttons', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('button', { name: 'Create Tool' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
	})

	baseTest('has test tool section', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Test Tool')).toBeVisible()
		await expect(page.getByRole('button', { name: /run test/i })).toBeVisible()
	})

	baseTest('has tips section', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Tips')).toBeVisible()
	})
})

baseTest.describe('New HTTP Tool Page - Form Validation', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools/new')
		await page.waitForLoadState('networkidle')
	})

	baseTest('create button is disabled when required fields are empty', async ({
		page,
	}: { page: Page }) => {
		const createButton = page.getByRole('button', { name: 'Create Tool' })
		await expect(createButton).toBeDisabled()
	})

	baseTest('create button remains disabled with only name filled', async ({
		page,
	}: { page: Page }) => {
		await page.getByLabel('Name *').fill('Test Tool')
		const createButton = page.getByRole('button', { name: 'Create Tool' })
		// Still disabled because URL is required
		await expect(createButton).toBeDisabled()
	})

	baseTest('run test button is disabled without URL', async ({ page }: { page: Page }) => {
		const runTestButton = page.getByRole('button', { name: /run test/i })
		await expect(runTestButton).toBeDisabled()
	})
})

baseTest.describe('New HTTP Tool Page - Method Selection', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools/new')
		await page.waitForLoadState('networkidle')
	})

	baseTest('can select different HTTP methods', async ({ page }: { page: Page }) => {
		const methodSelect = page.getByLabel('Method')
		await methodSelect.click()

		// Check all methods are available
		await expect(page.getByRole('option', { name: 'GET' })).toBeVisible()
		await expect(page.getByRole('option', { name: 'POST' })).toBeVisible()
		await expect(page.getByRole('option', { name: 'PUT' })).toBeVisible()
		await expect(page.getByRole('option', { name: 'PATCH' })).toBeVisible()
		await expect(page.getByRole('option', { name: 'DELETE' })).toBeVisible()
	})

	baseTest('request body field appears for POST method', async ({ page }: { page: Page }) => {
		// Initially GET is selected, no body field
		await expect(page.getByLabel('Request Body')).not.toBeVisible()

		// Select POST
		await page.getByLabel('Method').click()
		await page.getByRole('option', { name: 'POST' }).click()

		// Body field should now be visible
		await expect(page.getByLabel('Request Body')).toBeVisible()
	})
})

baseTest.describe('New HTTP Tool Page - Headers', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools/new')
		await page.waitForLoadState('networkidle')
	})

	baseTest('can add a header', async ({ page }: { page: Page }) => {
		const addHeaderButton = page
			.locator('div')
			.filter({ hasText: /^HeadersAdd$/ })
			.getByRole('button', { name: 'Add' })
		await addHeaderButton.click()

		// Header inputs should appear
		await expect(page.getByPlaceholder('Header name')).toBeVisible()
		await expect(
			page.getByPlaceholder('Value (use {{variable}} for dynamic values)'),
		).toBeVisible()
	})

	baseTest('can remove a header', async ({ page }: { page: Page }) => {
		// Add a header first
		const addHeaderButton = page
			.locator('div')
			.filter({ hasText: /^HeadersAdd$/ })
			.getByRole('button', { name: 'Add' })
		await addHeaderButton.click()

		await expect(page.getByPlaceholder('Header name')).toBeVisible()

		// Click the trash icon to remove
		await page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).first().click()

		// Header inputs should be removed
		await expect(page.getByPlaceholder('Header name')).not.toBeVisible()
	})
})

baseTest.describe('New HTTP Tool Page - Parameters', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools/new')
		await page.waitForLoadState('networkidle')
	})

	baseTest('can add a parameter', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Parameter' }).click()

		// Parameter form should appear
		await expect(page.getByPlaceholder('e.g., query')).toBeVisible()
	})

	baseTest('parameter has all required fields', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Parameter' }).click()

		// Check for parameter form fields
		await expect(page.getByPlaceholder('e.g., query')).toBeVisible()
		await expect(page.getByPlaceholder('Describe this parameter...')).toBeVisible()
		await expect(page.getByPlaceholder('Optional default')).toBeVisible()
		await expect(page.getByPlaceholder('e.g., small, medium, large')).toBeVisible()
		await expect(page.getByLabel('Required parameter')).toBeVisible()
	})

	baseTest('can mark parameter as required', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Parameter' }).click()

		const requiredCheckbox = page.getByLabel('Required parameter')
		await expect(requiredCheckbox).not.toBeChecked()

		await requiredCheckbox.check()
		await expect(requiredCheckbox).toBeChecked()
	})
})

test.describe('Tools - Authenticated User', () => {
	test('authenticated user sees tools page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Tools', exact: true }),
		).toBeVisible()
	})

	test('authenticated user can open quick add dialog', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('button', { name: /quick add/i }).click()
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()
	})

	test('authenticated user can navigate to new http tool page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: /create http tool/i }).click()
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/tools\/new/)
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Create HTTP Tool' }),
		).toBeVisible()
	})

	test('authenticated user can fill in new tool form', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Fill in tool details
		await authenticatedPage.getByLabel('Name *').fill('Weather API')
		await authenticatedPage.getByLabel('Description').fill('Get weather data from API')
		await authenticatedPage.getByLabel('URL *').fill('https://api.weather.com/v1/current')

		// Verify values are filled
		await expect(authenticatedPage.getByLabel('Name *')).toHaveValue('Weather API')
		await expect(authenticatedPage.getByLabel('Description')).toHaveValue(
			'Get weather data from API',
		)
		await expect(authenticatedPage.getByLabel('URL *')).toHaveValue(
			'https://api.weather.com/v1/current',
		)

		// Create button should be enabled now
		const createButton = authenticatedPage.getByRole('button', { name: 'Create Tool' })
		await expect(createButton).toBeEnabled()
	})

	test('authenticated user can cancel tool creation', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Fill in some data
		await authenticatedPage.getByLabel('Name *').fill('Test Tool')

		// Click cancel
		await authenticatedPage.getByRole('button', { name: 'Cancel' }).click()

		// Should navigate back to tools list
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/tools/)
	})

	test('authenticated user can search tools', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		const searchInput = authenticatedPage.getByPlaceholder('Search tools...')
		await searchInput.fill('http')

		// Search input should have the value
		await expect(searchInput).toHaveValue('http')
	})
})

baseTest.describe('Tools Page - Responsive Design', () => {
	baseTest('displays correctly on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')

		await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible()
		// Buttons should still be visible
		await expect(page.getByRole('button', { name: /quick add/i })).toBeVisible()
	})

	baseTest('new tool page displays correctly on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard/tools/new')
		await page.waitForLoadState('networkidle')

		await expect(page.getByRole('heading', { name: 'Create HTTP Tool' })).toBeVisible()
		await expect(page.getByLabel('Name *')).toBeVisible()
	})
})
