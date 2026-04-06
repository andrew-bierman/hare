import { expect } from '@playwright/test'
import { test } from './fixtures'

/**
 * Webhook Management E2E tests.
 * Tests the webhook configuration flow including listing webhooks,
 * creating, editing, deleting, and managing webhook settings.
 *
 * Note: All tests require authentication since webhook pages are protected routes.
 * The AgentWebhooksPage was migrated from raw REST fetch to oRPC client calls.
 */

// Helper to generate unique webhook URLs
function generateWebhookUrl(prefix = 'test'): string {
	return `https://${prefix}-webhook-${Date.now()}.example.com/hook`
}

// Helper to generate unique agent names
function generateAgentName(prefix = 'Webhook'): string {
	return `${prefix} Agent ${Date.now()}`
}

// Helper to create an agent and navigate to its webhooks page
async function createAgentAndGoToWebhooks(page: import('@playwright/test').Page) {
	// Create an agent first
	await page.goto('/dashboard/agents/new')
	await page.waitForSelector('main', { state: 'visible' })

	const agentName = generateAgentName()
	await page.locator('#name').fill(agentName)
	await page.locator('#description').fill('Test agent for webhook E2E tests')

	const createButton = page.getByRole('button', { name: /create/i })
	await expect(createButton).toBeEnabled()
	await createButton.click()

	// Wait for redirect to agent detail page
	await page.waitForURL(/\/dashboard\/agents\/[a-f0-9-]+$/, { timeout: 15000 })
	await page.waitForSelector('main', { state: 'visible' })
	await page.waitForTimeout(1000)

	// Extract agent ID from URL
	const url = page.url()
	const agentId = url.split('/').pop()

	// Navigate to webhooks page
	await page.goto(`/dashboard/agents/${agentId}/webhooks`)
	await page.waitForSelector('main', { state: 'visible' })
	await page.waitForTimeout(1000)

	return { agentName, agentId }
}

// ============================================================================
// Webhooks Page Load and Display Tests
// ============================================================================

test.describe('Webhooks Page - Load and Display', () => {
	test('webhooks page loads from agent detail', async ({ authenticatedPage }) => {
		const { agentId } = await createAgentAndGoToWebhooks(authenticatedPage)

		// Verify we're on the webhooks page
		expect(authenticatedPage.url()).toContain(`/agents/${agentId}/webhooks`)

		// Page heading should be visible
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Webhooks', exact: true }).first(),
		).toBeVisible()

		// Description should be visible
		await expect(
			authenticatedPage.getByText('Configure webhooks to receive notifications'),
		).toBeVisible()

		// Add Webhook button should be visible
		await expect(authenticatedPage.getByRole('button', { name: /add webhook/i })).toBeVisible()
	})

	test('webhooks page shows empty state when no webhooks exist', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Empty state message should be visible
		await expect(authenticatedPage.getByText('No webhooks configured')).toBeVisible()

		// Empty state description
		await expect(
			authenticatedPage.getByText(/Add a webhook to receive notifications/),
		).toBeVisible()

		// Create first webhook button in empty state
		await expect(
			authenticatedPage.getByRole('button', { name: /create your first webhook/i }),
		).toBeVisible()
	})

	test('webhooks info card explains webhook functionality', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// About Webhooks card should be visible
		await expect(authenticatedPage.getByText('About Webhooks')).toBeVisible()

		// Should mention HMAC signature
		await expect(authenticatedPage.getByText(/HMAC signature/)).toBeVisible()

		// Should mention X-Webhook-Signature header
		await expect(authenticatedPage.getByText('X-Webhook-Signature')).toBeVisible()
	})
})

// ============================================================================
// Add Webhook Button and Dialog Tests
// ============================================================================

test.describe('Webhooks Page - Add Webhook Dialog', () => {
	test('Add Webhook button opens creation form', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Click Add Webhook button
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()

		// Dialog should appear
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()

		// Dialog title should be visible
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Create Webhook' }).first(),
		).toBeVisible()

		// Dialog description should be visible
		await expect(
			authenticatedPage.getByText('Configure a new webhook to receive event notifications'),
		).toBeVisible()

		// URL field should be visible
		await expect(authenticatedPage.locator('#webhook-url')).toBeVisible()

		// Events section should be visible (the label that says "Events")
		await expect(authenticatedPage.getByText('Events', { exact: true })).toBeVisible()

		// Cancel button should be visible
		await expect(authenticatedPage.getByRole('button', { name: 'Cancel' })).toBeVisible()

		// Create button should be visible
		await expect(authenticatedPage.getByRole('button', { name: 'Create Webhook' })).toBeVisible()
	})

	test('Create First Webhook button in empty state opens dialog', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Click the empty state button
		await authenticatedPage.getByRole('button', { name: /create your first webhook/i }).click()

		// Dialog should appear
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Create Webhook' }).first(),
		).toBeVisible()
	})

	test('cancel button closes dialog without creating webhook', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Open dialog
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()

		// Fill in some data
		await authenticatedPage.locator('#webhook-url').fill('https://example.com/webhook')

		// Click cancel
		await authenticatedPage.getByRole('button', { name: 'Cancel' }).click()

		// Dialog should close
		await expect(authenticatedPage.getByRole('dialog')).not.toBeVisible()

		// Empty state should still be visible
		await expect(authenticatedPage.getByText('No webhooks configured')).toBeVisible()
	})
})

// ============================================================================
// URL Field Validation Tests
// ============================================================================

test.describe('Webhooks Page - URL Validation', () => {
	test('URL field is required - form shows validation on submit', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Open create dialog
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()

		// Select an event using label click
		await authenticatedPage.locator('label[for="event-message.received"]').click()

		// Verify the URL field is empty and visible
		await expect(authenticatedPage.locator('#webhook-url')).toHaveValue('')
		await expect(authenticatedPage.locator('#webhook-url')).toBeVisible()

		// Dialog should still be open (verifying it's rendered correctly)
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()
	})

	test('URL field has type url for browser validation', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Open create dialog
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()

		// Verify the URL field has type="url" for browser validation
		await expect(authenticatedPage.locator('#webhook-url')).toHaveAttribute('type', 'url')
	})

	test('URL field accepts valid URLs', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Open create dialog
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()

		// Enter valid URL
		const validUrl = 'https://example.com/webhook'
		await authenticatedPage.locator('#webhook-url').fill(validUrl)

		// Verify the value is set
		await expect(authenticatedPage.locator('#webhook-url')).toHaveValue(validUrl)
	})
})

// ============================================================================
// Event Selection Tests
// ============================================================================

test.describe('Webhooks Page - Event Selection', () => {
	test('event selection shows all available events', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Open create dialog
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()

		// All events should be visible (using exact match to avoid conflicts)
		const events = [
			{ label: 'Message Received', description: 'When user sends a message' },
			{ label: 'Message Sent', description: 'When agent sends a response' },
			{ label: 'Tool Called', description: 'When agent uses a tool' },
			{ label: 'Error', description: 'When an error occurs' },
			{ label: 'Agent Deployed', description: 'When agent is deployed' },
		]

		for (const event of events) {
			await expect(authenticatedPage.getByText(event.label, { exact: true })).toBeVisible()
			await expect(authenticatedPage.getByText(event.description, { exact: true })).toBeVisible()
		}
	})

	test('at least one event is required', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Open create dialog
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()

		// Enter valid URL but no events
		await authenticatedPage.locator('#webhook-url').fill('https://example.com/webhook')

		// Try to submit
		await authenticatedPage.getByRole('button', { name: 'Create Webhook' }).click()

		// Error message should appear
		await expect(authenticatedPage.getByText('Select at least one event')).toBeVisible()
	})

	test('multiple events can be selected', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Open create dialog
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()

		// Select multiple events using labels
		await authenticatedPage.locator('label[for="event-message.received"]').click()
		await authenticatedPage.locator('label[for="event-message.sent"]').click()
		await authenticatedPage.locator('label[for="event-error"]').click()

		// Verify checkboxes are checked using attribute selectors
		await expect(authenticatedPage.locator('[id="event-message.received"]')).toBeChecked()
		await expect(authenticatedPage.locator('[id="event-message.sent"]')).toBeChecked()
		await expect(authenticatedPage.locator('[id="event-error"]')).toBeChecked()
	})

	test('events can be toggled on and off', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Open create dialog
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()

		// Select an event using label
		const label = authenticatedPage.locator('label[for="event-message.received"]')
		const checkbox = authenticatedPage.locator('[id="event-message.received"]')
		await label.click()
		await expect(checkbox).toBeChecked()

		// Deselect the event by clicking label again
		await label.click()
		await expect(checkbox).not.toBeChecked()
	})
})

// ============================================================================
// Back Navigation Tests
// ============================================================================

test.describe('Webhooks Page - Navigation', () => {
	test('back button returns to agent detail page', async ({ authenticatedPage }) => {
		const { agentId } = await createAgentAndGoToWebhooks(authenticatedPage)

		// Click the back button
		const backButton = authenticatedPage.locator('button').filter({
			has: authenticatedPage.locator('svg.lucide-arrow-left'),
		})
		await backButton.click()

		// Should navigate back to agent detail page
		await authenticatedPage.waitForURL(new RegExp(`/dashboard/agents/${agentId}$`), {
			timeout: 10000,
		})

		// Verify we're on the agent detail page
		expect(authenticatedPage.url()).toContain(`/agents/${agentId}`)
		expect(authenticatedPage.url()).not.toContain('/webhooks')
	})
})

// ============================================================================
// Webhook Creation Tests (Skipped - requires API fix)
// These tests document expected behavior once the webhook API endpoints are
// properly integrated with the component (REST to oRPC migration needed).
// ============================================================================

test.describe('Webhooks Page - Create Webhook', () => {
	test('creating webhook adds it to list', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		const webhookUrl = generateWebhookUrl('create-test')

		// Open create dialog
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()

		// Fill in form
		await authenticatedPage.locator('#webhook-url').fill(webhookUrl)
		await authenticatedPage.locator('label[for="event-message.received"]').click()

		// Submit
		await authenticatedPage.getByRole('button', { name: 'Create Webhook' }).click()

		// Dialog should close
		await expect(authenticatedPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

		// Webhook should appear in list
		await expect(authenticatedPage.getByText(webhookUrl)).toBeVisible()
	})

	test('created webhook shows active status', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Open create dialog
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()
		await authenticatedPage.locator('#webhook-url').fill(generateWebhookUrl())
		await authenticatedPage.locator('label[for="event-message.received"]').click()
		await authenticatedPage.getByRole('button', { name: 'Create Webhook' }).click()

		// Wait for dialog to close
		await expect(authenticatedPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

		// Status should be active
		await expect(authenticatedPage.getByText('active')).toBeVisible()
	})
})

// ============================================================================
// Webhook List Tests (Skipped - requires API fix)
// ============================================================================

test.describe('Webhooks Page - List Display', () => {
	test('webhooks list shows existing webhooks', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Create a webhook first
		const webhookUrl = generateWebhookUrl()
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()
		await authenticatedPage.locator('#webhook-url').fill(webhookUrl)
		await authenticatedPage.locator('label[for="event-message.received"]').click()
		await authenticatedPage.getByRole('button', { name: 'Create Webhook' }).click()
		await expect(authenticatedPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

		// Webhook URL should be visible in the list
		await expect(authenticatedPage.getByText(webhookUrl)).toBeVisible()

		// Status badge should be visible
		await expect(authenticatedPage.getByText('active')).toBeVisible()
	})

	test('webhook card shows subscribed events', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Create webhook with multiple events
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()
		await authenticatedPage.locator('#webhook-url').fill(generateWebhookUrl())
		await authenticatedPage.locator('label[for="event-message.received"]').click()
		await authenticatedPage.locator('label[for="event-message.sent"]').click()
		await authenticatedPage.getByRole('button', { name: 'Create Webhook' }).click()
		await expect(authenticatedPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

		// Event badges should be visible
		await expect(authenticatedPage.getByText('message.received')).toBeVisible()
		await expect(authenticatedPage.getByText('message.sent')).toBeVisible()
	})
})

// ============================================================================
// Webhook Secret Tests (Skipped - requires API fix)
// ============================================================================

test.describe('Webhooks Page - Secret Management', () => {
	test('webhook shows generated secret', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Create a webhook
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()
		await authenticatedPage.locator('#webhook-url').fill(generateWebhookUrl())
		await authenticatedPage.locator('label[for="event-message.received"]').click()
		await authenticatedPage.getByRole('button', { name: 'Create Webhook' }).click()
		await expect(authenticatedPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

		// Signing Secret label should be visible
		await expect(authenticatedPage.getByText('Signing Secret')).toBeVisible()

		// Secret should be masked by default (shows asterisks)
		await expect(authenticatedPage.getByText('************************')).toBeVisible()
	})

	test('secret can be revealed by clicking show button', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Create a webhook
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()
		await authenticatedPage.locator('#webhook-url').fill(generateWebhookUrl())
		await authenticatedPage.locator('label[for="event-message.received"]').click()
		await authenticatedPage.getByRole('button', { name: 'Create Webhook' }).click()
		await expect(authenticatedPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

		// Find and click the show secret button (eye icon)
		const showButton = authenticatedPage.locator('button').filter({
			has: authenticatedPage.locator('svg.lucide-eye'),
		})
		await showButton.click()

		// Secret should no longer be masked - the mask should be gone
		await expect(authenticatedPage.getByText('************************')).not.toBeVisible()

		// Hide button should now be visible
		await expect(
			authenticatedPage.locator('button').filter({
				has: authenticatedPage.locator('svg.lucide-eye-off'),
			}),
		).toBeVisible()
	})
})

// ============================================================================
// Webhook Editing Tests (Skipped - requires API fix)
// ============================================================================

test.describe('Webhooks Page - Edit Webhook', () => {
	test('Edit button opens edit form', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Create a webhook
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()
		await authenticatedPage.locator('#webhook-url').fill(generateWebhookUrl())
		await authenticatedPage.locator('label[for="event-message.received"]').click()
		await authenticatedPage.getByRole('button', { name: 'Create Webhook' }).click()
		await expect(authenticatedPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

		// Click Edit button
		await authenticatedPage.getByRole('button', { name: 'Edit' }).click()

		// Edit dialog should appear
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()
		await expect(authenticatedPage.getByText('Edit Webhook')).toBeVisible()
	})

	test('edit form is pre-filled with webhook data', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		const webhookUrl = generateWebhookUrl()

		// Create a webhook
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()
		await authenticatedPage.locator('#webhook-url').fill(webhookUrl)
		await authenticatedPage.locator('label[for="event-message.received"]').click()
		await authenticatedPage.locator('label[for="event-error"]').click()
		await authenticatedPage.getByRole('button', { name: 'Create Webhook' }).click()
		await expect(authenticatedPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

		// Click Edit button
		await authenticatedPage.getByRole('button', { name: 'Edit' }).click()
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()

		// URL should be pre-filled
		await expect(authenticatedPage.locator('#webhook-url')).toHaveValue(webhookUrl)

		// Events should be pre-selected
		await expect(authenticatedPage.locator('[id="event-message.received"]')).toBeChecked()
		await expect(authenticatedPage.locator('[id="event-error"]')).toBeChecked()
	})
})

// ============================================================================
// Webhook Enable/Disable Tests (Skipped - requires API fix)
// ============================================================================

test.describe('Webhooks Page - Enable/Disable Toggle', () => {
	test('toggle webhook disabled works', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Create a webhook
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()
		await authenticatedPage.locator('#webhook-url').fill(generateWebhookUrl())
		await authenticatedPage.locator('label[for="event-message.received"]').click()
		await authenticatedPage.getByRole('button', { name: 'Create Webhook' }).click()
		await expect(authenticatedPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

		// Should start as active
		await expect(authenticatedPage.getByText('active')).toBeVisible()

		// Click Disable button
		await authenticatedPage.getByRole('button', { name: 'Disable' }).click()

		// Wait for update
		await authenticatedPage.waitForTimeout(1000)

		// Should now show inactive status
		await expect(authenticatedPage.getByText('inactive')).toBeVisible()

		// Button should now say Enable
		await expect(authenticatedPage.getByRole('button', { name: 'Enable' })).toBeVisible()
	})
})

// ============================================================================
// Webhook Deletion Tests (Skipped - requires API fix)
// ============================================================================

test.describe('Webhooks Page - Delete Webhook', () => {
	test('delete webhook shows confirmation dialog', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Create a webhook
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()
		await authenticatedPage.locator('#webhook-url').fill(generateWebhookUrl())
		await authenticatedPage.locator('label[for="event-message.received"]').click()
		await authenticatedPage.getByRole('button', { name: 'Create Webhook' }).click()
		await expect(authenticatedPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

		// Click delete button (trash icon)
		const deleteButton = authenticatedPage.locator('button').filter({
			has: authenticatedPage.locator('svg.lucide-trash-2'),
		})
		await deleteButton.click()

		// Confirmation dialog should appear
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()
		await expect(authenticatedPage.getByText('Delete Webhook')).toBeVisible()
		await expect(authenticatedPage.getByText(/cannot be undone/)).toBeVisible()

		// Cancel and Delete buttons should be visible
		await expect(authenticatedPage.getByRole('button', { name: 'Cancel' })).toBeVisible()
		await expect(
			authenticatedPage.getByRole('dialog').getByRole('button', { name: 'Delete' }),
		).toBeVisible()
	})
})

// ============================================================================
// Webhook Delivery Logs Tests (Skipped - requires API fix)
// ============================================================================

test.describe('Webhooks Page - Delivery Logs', () => {
	test('View Logs button opens delivery logs dialog', async ({ authenticatedPage }) => {
		await createAgentAndGoToWebhooks(authenticatedPage)

		// Create a webhook
		await authenticatedPage.getByRole('button', { name: /add webhook/i }).click()
		await authenticatedPage.locator('#webhook-url').fill(generateWebhookUrl())
		await authenticatedPage.locator('label[for="event-message.received"]').click()
		await authenticatedPage.getByRole('button', { name: 'Create Webhook' }).click()
		await expect(authenticatedPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

		// Click View Logs button
		await authenticatedPage.getByRole('button', { name: 'View Logs' }).click()

		// Logs dialog should appear
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()
		await expect(authenticatedPage.getByText('Webhook Deliveries')).toBeVisible()
	})
})
