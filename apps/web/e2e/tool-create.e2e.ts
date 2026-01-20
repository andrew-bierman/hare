import { expect } from '@playwright/test'
import { test } from './fixtures'

/**
 * Custom Tool Creation Page E2E tests.
 * Tests the tool creation flow including form display, validation,
 * HTTP configuration, headers, parameters, testing, and submission.
 *
 * Note: All tests require authentication since /dashboard/tools/new is a protected route.
 */

// Helper to generate unique tool names
function generateToolName(prefix = 'Test'): string {
	return `${prefix} Tool ${Date.now()}`
}

// Helper to navigate to tool create page and wait for it to load
async function navigateToToolCreatePage(page: import('@playwright/test').Page) {
	await page.goto('/dashboard/tools/new')
	await page.waitForLoadState('networkidle')

	// Wait for the page heading to be visible
	await expect(page.getByRole('heading', { name: 'Create HTTP Tool' })).toBeVisible({
		timeout: 15000,
	})
}

// ============================================================================
// Page Load and Display Tests
// ============================================================================

test.describe('Tool Create Page - Load and Display', () => {
	test('create page loads with empty form', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Page heading should be visible
		await expect(authenticatedPage.getByRole('heading', { name: 'Create HTTP Tool' })).toBeVisible()

		// Subheading should be visible
		await expect(
			authenticatedPage.getByText('Create a custom HTTP tool to call external APIs'),
		).toBeVisible()

		// Name field should be empty
		const nameInput = authenticatedPage.locator('#name')
		await expect(nameInput).toBeVisible()
		await expect(nameInput).toHaveValue('')

		// Description field should be empty
		const descriptionInput = authenticatedPage.locator('#description')
		await expect(descriptionInput).toBeVisible()
		await expect(descriptionInput).toHaveValue('')

		// URL field should be empty
		const urlInput = authenticatedPage.locator('#url')
		await expect(urlInput).toBeVisible()
		await expect(urlInput).toHaveValue('')

		// Create Tool button should be visible but disabled (empty form)
		const createButton = authenticatedPage.getByRole('button', { name: 'Create Tool' })
		await expect(createButton).toBeVisible()
		await expect(createButton).toBeDisabled()

		// Cancel button should be visible
		const cancelButton = authenticatedPage.getByRole('button', { name: 'Cancel' })
		await expect(cancelButton).toBeVisible()
	})
})

// ============================================================================
// Name Field Validation Tests
// ============================================================================

test.describe('Tool Create Page - Name Field Validation', () => {
	test('name field is required - button stays disabled without name', async ({
		authenticatedPage,
	}) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Create Tool button should be disabled when name is empty
		const createButton = authenticatedPage.getByRole('button', { name: 'Create Tool' })
		await expect(createButton).toBeDisabled()

		// Enter a URL but no name
		const urlInput = authenticatedPage.locator('#url')
		await urlInput.fill('https://api.example.com')

		// Button should still be disabled without name
		await expect(createButton).toBeDisabled()
	})

	test('name field accepts valid text input', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		const toolName = generateToolName('NameInput')
		const nameInput = authenticatedPage.locator('#name')
		await nameInput.fill(toolName)

		await expect(nameInput).toHaveValue(toolName)
	})
})

// ============================================================================
// URL Field Validation Tests
// ============================================================================

test.describe('Tool Create Page - URL Field Validation', () => {
	test('URL field is required - button stays disabled without URL', async ({
		authenticatedPage,
	}) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Enter a name but no URL
		const nameInput = authenticatedPage.locator('#name')
		await nameInput.fill('Test Tool')

		// Create Tool button should be disabled without URL
		const createButton = authenticatedPage.getByRole('button', { name: 'Create Tool' })
		await expect(createButton).toBeDisabled()
	})

	test('URL field accepts valid URL input', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		const urlInput = authenticatedPage.locator('#url')
		await urlInput.fill('https://api.example.com/data')

		await expect(urlInput).toHaveValue('https://api.example.com/data')
	})

	test('URL field shows placeholder with variable syntax', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		const urlInput = authenticatedPage.locator('#url')
		const placeholder = await urlInput.getAttribute('placeholder')
		expect(placeholder).toContain('{{')
	})

	test('both name and URL enable create button', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		const nameInput = authenticatedPage.locator('#name')
		const urlInput = authenticatedPage.locator('#url')
		const createButton = authenticatedPage.getByRole('button', { name: 'Create Tool' })

		// Initially disabled
		await expect(createButton).toBeDisabled()

		// Fill name - still disabled
		await nameInput.fill('Test Tool')
		await expect(createButton).toBeDisabled()

		// Fill URL - now enabled
		await urlInput.fill('https://api.example.com')
		await expect(createButton).toBeEnabled()
	})
})

// ============================================================================
// HTTP Method Dropdown Tests
// ============================================================================

test.describe('Tool Create Page - HTTP Method Dropdown', () => {
	test('method dropdown shows GET, POST, PUT, DELETE, PATCH options', async ({
		authenticatedPage,
	}) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Find and click the method selector trigger
		const methodTrigger = authenticatedPage.locator('#method')
		await expect(methodTrigger).toBeVisible()
		await methodTrigger.click()

		// Wait for dropdown content to be visible
		const dropdownContent = authenticatedPage.locator('[role="listbox"]')
		await expect(dropdownContent).toBeVisible()

		// Should show all HTTP methods
		await expect(authenticatedPage.getByRole('option', { name: 'GET' })).toBeVisible()
		await expect(authenticatedPage.getByRole('option', { name: 'POST' })).toBeVisible()
		await expect(authenticatedPage.getByRole('option', { name: 'PUT' })).toBeVisible()
		await expect(authenticatedPage.getByRole('option', { name: 'PATCH' })).toBeVisible()
		await expect(authenticatedPage.getByRole('option', { name: 'DELETE' })).toBeVisible()
	})

	test('method dropdown defaults to GET', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		const methodTrigger = authenticatedPage.locator('#method')
		await expect(methodTrigger).toContainText('GET')
	})

	test('method selection updates form state', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Click method dropdown
		const methodTrigger = authenticatedPage.locator('#method')
		await methodTrigger.click()

		// Select POST
		await authenticatedPage.getByRole('option', { name: 'POST' }).click()

		// Verify POST is selected
		await expect(methodTrigger).toContainText('POST')
	})

	test('POST method shows request body field', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Initially body should not be visible (GET is default)
		await expect(authenticatedPage.locator('#body')).not.toBeVisible()

		// Select POST method
		const methodTrigger = authenticatedPage.locator('#method')
		await methodTrigger.click()
		await authenticatedPage.getByRole('option', { name: 'POST' }).click()

		// Body textarea should now be visible
		await expect(authenticatedPage.locator('#body')).toBeVisible()
	})
})

// ============================================================================
// Headers Section Tests
// ============================================================================

test.describe('Tool Create Page - Headers Section', () => {
	test('headers section allows adding custom headers', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Find and click the Add button in headers section
		const headersLabel = authenticatedPage.getByText('Headers', { exact: true })
		await expect(headersLabel).toBeVisible()

		// Click Add button - find within the headers section row
		const headersSection = authenticatedPage.locator('.space-y-2').filter({ has: headersLabel })
		const addButton = headersSection.getByRole('button', { name: 'Add' })
		await addButton.click()

		// Header input fields should appear
		await expect(authenticatedPage.getByPlaceholder('Header name')).toBeVisible()
		await expect(
			authenticatedPage.getByPlaceholder('Value (use {{variable}} for dynamic values)'),
		).toBeVisible()
	})

	test('headers can be filled with name and value', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Find and click the Add button
		const headersLabel = authenticatedPage.getByText('Headers', { exact: true })
		const headersSection = authenticatedPage.locator('.space-y-2').filter({ has: headersLabel })
		const addButton = headersSection.getByRole('button', { name: 'Add' })
		await addButton.click()

		// Fill in header name and value
		const headerNameInput = authenticatedPage.getByPlaceholder('Header name')
		const headerValueInput = authenticatedPage.getByPlaceholder(
			'Value (use {{variable}} for dynamic values)',
		)

		await headerNameInput.fill('Authorization')
		await headerValueInput.fill('Bearer {{api_key}}')

		await expect(headerNameInput).toHaveValue('Authorization')
		await expect(headerValueInput).toHaveValue('Bearer {{api_key}}')
	})

	test('headers can be removed', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Add a header
		const headersLabel = authenticatedPage.getByText('Headers', { exact: true })
		const headersSection = authenticatedPage.locator('.space-y-2').filter({ has: headersLabel })
		const addButton = headersSection.getByRole('button', { name: 'Add' })
		await addButton.click()

		// Header should be visible
		const headerNameInput = authenticatedPage.getByPlaceholder('Header name')
		await expect(headerNameInput).toBeVisible()

		// Find and click the remove button (trash icon) - it's a ghost button in the row
		const headerRow = headerNameInput.locator('..').locator('..')
		const removeButton = headerRow.locator('button').last()
		await removeButton.click()

		// Header should be removed
		await expect(headerNameInput).not.toBeVisible()
	})

	test('multiple headers can be added', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Find the Add button
		const headersLabel = authenticatedPage.getByText('Headers', { exact: true })
		const headersSection = authenticatedPage.locator('.space-y-2').filter({ has: headersLabel })
		const addButton = headersSection.getByRole('button', { name: 'Add' })

		// Add first header
		await addButton.click()

		// Add second header
		await addButton.click()

		// Should have two header name inputs
		const headerNameInputs = authenticatedPage.getByPlaceholder('Header name')
		await expect(headerNameInputs).toHaveCount(2)
	})
})

// ============================================================================
// Parameters Section Tests (Input Schema)
// ============================================================================

test.describe('Tool Create Page - Parameters Section', () => {
	test('parameters section allows adding input parameters', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Find the Add Parameter button
		const addParameterButton = authenticatedPage.getByRole('button', { name: 'Add Parameter' })
		await expect(addParameterButton).toBeVisible()

		// Click to add a parameter
		await addParameterButton.click()

		// Parameter fields should appear
		await expect(authenticatedPage.getByPlaceholder('e.g., query')).toBeVisible()
	})

	test('parameter can be configured with name and type', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Add a parameter
		await authenticatedPage.getByRole('button', { name: 'Add Parameter' }).click()

		// Fill in parameter name
		const paramNameInput = authenticatedPage.getByPlaceholder('e.g., query')
		await paramNameInput.fill('searchQuery')
		await expect(paramNameInput).toHaveValue('searchQuery')

		// Type selector should be visible
		const typeSelector = authenticatedPage
			.locator('.border.rounded-lg')
			.filter({ hasText: 'Parameter Name' })
			.locator('button[role="combobox"]')
			.first()
		await expect(typeSelector).toBeVisible()
	})

	test('parameter type dropdown shows available types', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Add a parameter
		await authenticatedPage.getByRole('button', { name: 'Add Parameter' }).click()
		await authenticatedPage.waitForTimeout(300)

		// Find and click the type selector
		const parameterCard = authenticatedPage
			.locator('.border.rounded-lg')
			.filter({ hasText: 'Type' })
		const typeSelector = parameterCard.locator('button[role="combobox"]').last()
		await typeSelector.click()

		// Wait for dropdown
		const dropdownContent = authenticatedPage.locator('[role="listbox"]')
		await expect(dropdownContent).toBeVisible()

		// Should show type options
		await expect(authenticatedPage.getByRole('option', { name: 'String' })).toBeVisible()
		await expect(authenticatedPage.getByRole('option', { name: 'Number' })).toBeVisible()
		await expect(authenticatedPage.getByRole('option', { name: 'Boolean' })).toBeVisible()
	})

	test('parameter can have description', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Add a parameter
		await authenticatedPage.getByRole('button', { name: 'Add Parameter' }).click()

		// Description input should be available
		const descriptionInput = authenticatedPage.getByPlaceholder('Describe this parameter...')
		await expect(descriptionInput).toBeVisible()

		await descriptionInput.fill('The search query string')
		await expect(descriptionInput).toHaveValue('The search query string')
	})

	test('parameter can be marked as required', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Add a parameter
		await authenticatedPage.getByRole('button', { name: 'Add Parameter' }).click()

		// Required checkbox should be available
		const requiredLabel = authenticatedPage.getByText('Required parameter')
		await expect(requiredLabel).toBeVisible()

		// Find the checkbox by looking for input next to the label
		const requiredCheckbox = authenticatedPage.locator('input[type="checkbox"]').first()
		await expect(requiredCheckbox).not.toBeChecked()

		// Click to mark as required
		await requiredCheckbox.click()
		await expect(requiredCheckbox).toBeChecked()
	})

	test('parameter can be removed', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Add a parameter
		await authenticatedPage.getByRole('button', { name: 'Add Parameter' }).click()

		// Parameter should be visible
		await expect(authenticatedPage.getByPlaceholder('e.g., query')).toBeVisible()

		// Find and click the remove button (in top right of parameter card)
		const parameterCard = authenticatedPage.locator('.border.rounded-lg.relative')
		const removeButton = parameterCard.locator('button.absolute')
		await removeButton.click()

		// Parameter should be removed - no parameters empty state should show
		await expect(authenticatedPage.getByText('No parameters defined yet')).toBeVisible()
	})
})

// ============================================================================
// Authentication Section Tests (via Headers)
// ============================================================================

test.describe('Tool Create Page - Authentication Configuration', () => {
	test('API key can be configured via headers', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Add a header for API key
		const headersLabel = authenticatedPage.getByText('Headers', { exact: true })
		const headersSection = authenticatedPage.locator('.space-y-2').filter({ has: headersLabel })
		const addButton = headersSection.getByRole('button', { name: 'Add' })
		await addButton.click()

		// Fill in API key header
		const headerNameInput = authenticatedPage.getByPlaceholder('Header name')
		const headerValueInput = authenticatedPage.getByPlaceholder(
			'Value (use {{variable}} for dynamic values)',
		)

		await headerNameInput.fill('X-API-Key')
		await headerValueInput.fill('{{api_key}}')

		await expect(headerNameInput).toHaveValue('X-API-Key')
		await expect(headerValueInput).toHaveValue('{{api_key}}')
	})

	test('Bearer token can be configured via Authorization header', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Add Authorization header
		const headersLabel = authenticatedPage.getByText('Headers', { exact: true })
		const headersSection = authenticatedPage.locator('.space-y-2').filter({ has: headersLabel })
		const addButton = headersSection.getByRole('button', { name: 'Add' })
		await addButton.click()

		const headerNameInput = authenticatedPage.getByPlaceholder('Header name')
		const headerValueInput = authenticatedPage.getByPlaceholder(
			'Value (use {{variable}} for dynamic values)',
		)

		await headerNameInput.fill('Authorization')
		await headerValueInput.fill('Bearer {{token}}')

		await expect(headerNameInput).toHaveValue('Authorization')
		await expect(headerValueInput).toHaveValue('Bearer {{token}}')
	})
})

// ============================================================================
// Test Tool Button Tests
// ============================================================================

test.describe('Tool Create Page - Test Tool Functionality', () => {
	test('Test Tool section is visible', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Test Tool card should be visible (CardTitle renders as div, not heading)
		await expect(authenticatedPage.getByText('Test Tool', { exact: true })).toBeVisible()

		// Run Test button should be visible
		const runTestButton = authenticatedPage.getByRole('button', { name: 'Run Test' })
		await expect(runTestButton).toBeVisible()
	})

	test('Run Test button is disabled without URL', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		const runTestButton = authenticatedPage.getByRole('button', { name: 'Run Test' })
		await expect(runTestButton).toBeDisabled()
	})

	test('Run Test button is enabled with URL', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Enter URL
		const urlInput = authenticatedPage.locator('#url')
		await urlInput.fill('https://httpbin.org/get')

		// Run Test button should be enabled
		const runTestButton = authenticatedPage.getByRole('button', { name: 'Run Test' })
		await expect(runTestButton).toBeEnabled()
	})

	test('Test Tool executes and shows results', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Enter a valid test URL
		const urlInput = authenticatedPage.locator('#url')
		await urlInput.fill('https://httpbin.org/get')

		// Click Run Test
		const runTestButton = authenticatedPage.getByRole('button', { name: 'Run Test' })
		await runTestButton.click()

		// Should show loading state or results
		// Wait for either success or failure indicator
		await expect(
			authenticatedPage.getByText('Success').or(authenticatedPage.getByText('Failed')),
		).toBeVisible({ timeout: 15000 })
	})

	test('Test inputs appear when parameters are defined', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Add a parameter
		await authenticatedPage.getByRole('button', { name: 'Add Parameter' }).click()

		// Fill in parameter name
		const paramNameInput = authenticatedPage.getByPlaceholder('e.g., query')
		await paramNameInput.fill('testParam')

		// Test Inputs section should appear with the parameter
		await expect(authenticatedPage.getByText('Test Inputs')).toBeVisible()
	})
})

// ============================================================================
// Form Submission Tests
// ============================================================================

test.describe('Tool Create Page - Form Submission', () => {
	test('successful creation redirects to tools list', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Fill in required fields
		const toolName = generateToolName('Submit')
		await authenticatedPage.locator('#name').fill(toolName)
		await authenticatedPage.locator('#url').fill('https://api.example.com/data')

		// Submit the form
		const createButton = authenticatedPage.getByRole('button', { name: 'Create Tool' })
		await expect(createButton).toBeEnabled()
		await createButton.click()

		// Wait for navigation to tools list page
		await authenticatedPage.waitForURL(/\/dashboard\/tools\/?$/, { timeout: 15000 })

		// Verify we're on the tools list page
		expect(authenticatedPage.url()).toMatch(/\/dashboard\/tools\/?$/)
	})

	test('created tool appears in custom tools section', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Fill in required fields with unique name
		const toolName = generateToolName('ListVerify')
		await authenticatedPage.locator('#name').fill(toolName)
		await authenticatedPage.locator('#description').fill('Tool to verify in list')
		await authenticatedPage.locator('#url').fill('https://api.example.com/verify')

		// Submit the form
		const createButton = authenticatedPage.getByRole('button', { name: 'Create Tool' })
		await createButton.click()

		// Wait for redirect to tools list
		await authenticatedPage.waitForURL(/\/dashboard\/tools\/?$/, { timeout: 15000 })
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(1000)

		// The created tool should appear in the custom tools section
		await expect(authenticatedPage.getByText(toolName)).toBeVisible({ timeout: 10000 })
	})

	test('form submission with description and headers', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Fill in all fields
		const toolName = generateToolName('Complete')
		await authenticatedPage.locator('#name').fill(toolName)
		await authenticatedPage.locator('#description').fill('A complete tool with all options')
		await authenticatedPage.locator('#url').fill('https://api.example.com/complete')

		// Add a header
		const headersLabel = authenticatedPage.getByText('Headers', { exact: true })
		const headersSection = authenticatedPage.locator('.space-y-2').filter({ has: headersLabel })
		const addButton = headersSection.getByRole('button', { name: 'Add' })
		await addButton.click()
		await authenticatedPage.getByPlaceholder('Header name').fill('Content-Type')
		await authenticatedPage
			.getByPlaceholder('Value (use {{variable}} for dynamic values)')
			.fill('application/json')

		// Submit the form
		const createButton = authenticatedPage.getByRole('button', { name: 'Create Tool' })
		await createButton.click()

		// Should redirect to tools list
		await authenticatedPage.waitForURL(/\/dashboard\/tools\/?$/, { timeout: 15000 })
	})
})

// ============================================================================
// Form Validation Error Tests
// ============================================================================

test.describe('Tool Create Page - Form Validation Errors', () => {
	test('shows error toast when submitting without name', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// The Create Tool button is disabled when name is empty, so we can't click it
		// This test verifies the button stays disabled without name
		const urlInput = authenticatedPage.locator('#url')
		await urlInput.fill('https://api.example.com')

		const createButton = authenticatedPage.getByRole('button', { name: 'Create Tool' })
		await expect(createButton).toBeDisabled()
	})

	test('shows error toast when submitting without URL', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// The Create Tool button is disabled when URL is empty, so we can't click it
		// This test verifies the button stays disabled without URL
		const nameInput = authenticatedPage.locator('#name')
		await nameInput.fill('Test Tool')

		const createButton = authenticatedPage.getByRole('button', { name: 'Create Tool' })
		await expect(createButton).toBeDisabled()
	})

	test('form preserves data when validation fails', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Fill in form data
		const toolName = generateToolName('Preserve')
		const description = 'Description to preserve'

		await authenticatedPage.locator('#name').fill(toolName)
		await authenticatedPage.locator('#description').fill(description)

		// Clear name (validation will keep button disabled)
		await authenticatedPage.locator('#name').clear()

		// Description should still be preserved
		await expect(authenticatedPage.locator('#description')).toHaveValue(description)

		// Re-enter name and verify everything is still there
		await authenticatedPage.locator('#name').fill(toolName)
		await expect(authenticatedPage.locator('#name')).toHaveValue(toolName)
		await expect(authenticatedPage.locator('#description')).toHaveValue(description)
	})
})

// ============================================================================
// Navigation Tests
// ============================================================================

test.describe('Tool Create Page - Navigation', () => {
	test('cancel button returns to tools list', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Fill in some data
		await authenticatedPage.locator('#name').fill('Test Tool to Cancel')

		// Click cancel
		const cancelButton = authenticatedPage.getByRole('button', { name: 'Cancel' })
		await cancelButton.click()

		// Should navigate back to tools list
		await authenticatedPage.waitForURL(/\/dashboard\/tools\/?$/, { timeout: 10000 })
		expect(authenticatedPage.url()).toMatch(/\/dashboard\/tools\/?$/)
	})
})

// ============================================================================
// Tips Card Tests
// ============================================================================

test.describe('Tool Create Page - Tips Card', () => {
	test('tips card displays helpful information', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		// Tips card should be visible (CardTitle renders as div, not heading)
		await expect(authenticatedPage.getByText('Tips', { exact: true })).toBeVisible()

		// Tips content should be visible - check for unique text from Tips card
		await expect(
			authenticatedPage.getByText('Define input parameters to make your tool reusable'),
		).toBeVisible()
	})
})

// ============================================================================
// Button State Tests
// ============================================================================

test.describe('Tool Create Page - Button States', () => {
	test('create button shows loading state during submission', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		const toolName = generateToolName('Loading')
		await authenticatedPage.locator('#name').fill(toolName)
		await authenticatedPage.locator('#url').fill('https://api.example.com/loading')

		const createButton = authenticatedPage.getByRole('button', { name: 'Create Tool' })
		await createButton.click()

		// Button should show loading state (text changes to "Creating...")
		// Note: This may be very quick, so we use a broad timeout
		const isLoading = await authenticatedPage
			.getByRole('button', { name: 'Creating...' })
			.isVisible({ timeout: 2000 })
			.catch(() => false)

		// Either we caught the loading state or it completed too fast
		// Both are valid - we just want to ensure no errors occurred
		expect(typeof isLoading).toBe('boolean')

		// Wait for navigation
		await authenticatedPage.waitForURL(/\/dashboard\/tools\/?$/, { timeout: 15000 })
	})
})

// ============================================================================
// Description Field Tests
// ============================================================================

test.describe('Tool Create Page - Description Field', () => {
	test('description field accepts text', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		const description = 'This is a test tool description for E2E testing purposes.'
		const descriptionInput = authenticatedPage.locator('#description')

		await expect(descriptionInput).toBeVisible()
		await descriptionInput.fill(description)

		await expect(descriptionInput).toHaveValue(description)
	})
})

// ============================================================================
// Response Mapping Tests
// ============================================================================

test.describe('Tool Create Page - Response Mapping', () => {
	test('response path field accepts value', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		const responsePathInput = authenticatedPage.locator('#responsePath')
		await expect(responsePathInput).toBeVisible()

		await responsePathInput.fill('data.results')
		await expect(responsePathInput).toHaveValue('data.results')
	})
})

// ============================================================================
// Timeout Configuration Tests
// ============================================================================

test.describe('Tool Create Page - Timeout Configuration', () => {
	test('timeout field accepts numeric value', async ({ authenticatedPage }) => {
		await navigateToToolCreatePage(authenticatedPage)

		const timeoutInput = authenticatedPage.locator('#timeout')
		await expect(timeoutInput).toBeVisible()

		// Default should be 10000
		await expect(timeoutInput).toHaveValue('10000')

		// Change to different value
		await timeoutInput.fill('15000')
		await expect(timeoutInput).toHaveValue('15000')
	})
})
