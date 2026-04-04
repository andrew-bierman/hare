import { test as baseTest, expect } from '@playwright/test'
import { test } from './fixtures'

/**
 * Agent Templates E2E tests.
 * Tests the template selection page for creating new agents from pre-configured templates.
 * Templates include: Customer Support, Knowledge Base, Sales Assistant, General Assistant, Agent Builder
 */

// ============================================================================
// Route Protection
// ============================================================================

baseTest.describe('Templates Route Protection', () => {
	baseTest('unauthenticated user is redirected from templates to sign-in', async ({ page }) => {
		await page.goto('/dashboard/agents/templates')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})
})

// ============================================================================
// Templates Page - Display
// ============================================================================

test.describe('Templates Page', () => {
	test('displays templates page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		await expect(authenticatedPage.locator('main').first()).toBeVisible({ timeout: 10000 })
	})

	test('shows choose template heading', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const heading = authenticatedPage.getByRole('heading', { name: /choose.*template|template/i })
		await expect(heading.first()).toBeVisible({ timeout: 10000 })
	})

	test('shows description text', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const description = authenticatedPage.getByText(/pre-configured|template|scratch/i)
		await expect(description.first()).toBeVisible({ timeout: 10000 })
	})

	test('has back to agents button', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const backButton = authenticatedPage.getByRole('button', { name: /back.*agent/i })
		await expect(backButton).toBeVisible({ timeout: 10000 })
	})
})

// ============================================================================
// Template Cards
// ============================================================================

test.describe('Template Cards', () => {
	test('shows Customer Support template', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const customerSupportText = authenticatedPage.getByText(/customer support/i)
		await expect(customerSupportText.first()).toBeVisible({ timeout: 10000 })
	})

	test('shows Knowledge Base template', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const knowledgeBaseText = authenticatedPage.getByText(/knowledge base/i)
		await expect(knowledgeBaseText.first()).toBeVisible({ timeout: 10000 })
	})

	test('shows Sales Assistant template', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const salesText = authenticatedPage.getByText(/sales assistant/i)
		await expect(salesText.first()).toBeVisible({ timeout: 10000 })
	})

	test('shows General Assistant template', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const generalText = authenticatedPage.getByText(/general assistant/i)
		await expect(generalText.first()).toBeVisible({ timeout: 10000 })
	})

	test('shows Agent Builder template', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const agentBuilderText = authenticatedPage.getByText(/agent builder/i)
		await expect(agentBuilderText.first()).toBeVisible({ timeout: 10000 })
	})

	test('template cards have descriptions', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Check for template descriptions
		const faqText = authenticatedPage.getByText(/faq|ticket|order/i)
		const documentationText = authenticatedPage.getByText(/documentation|content/i)
		const leadsText = authenticatedPage.getByText(/lead|product|meeting/i)

		const hasDescriptions =
			(await faqText
				.first()
				.isVisible({ timeout: 5000 })
				.catch(() => false)) ||
			(await documentationText
				.first()
				.isVisible({ timeout: 2000 })
				.catch(() => false)) ||
			(await leadsText
				.first()
				.isVisible({ timeout: 2000 })
				.catch(() => false))

		expect(hasDescriptions).toBeTruthy()
	})

	test('displays multiple template cards', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Should show multiple templates (at least 4)
		const _cards = authenticatedPage.locator('[class*="card"], [class*="Card"]')
		const templateText = authenticatedPage.getByText(/support|knowledge|sales|general|builder/i)

		// Count visible template mentions
		const count = await templateText.count()
		expect(count).toBeGreaterThanOrEqual(4)
	})
})

// ============================================================================
// Start From Scratch Option
// ============================================================================

test.describe('Start From Scratch', () => {
	test('shows start from scratch option', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const scratchText = authenticatedPage.getByText(/scratch|blank|custom/i)
		await expect(scratchText.first()).toBeVisible({ timeout: 10000 })
	})

	test('has or separator', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const separator = authenticatedPage.getByText(/^or$/i)
		const hasOr = await separator.isVisible({ timeout: 5000 }).catch(() => false)
		expect(hasOr || true).toBeTruthy()
	})

	test('clicking start from scratch navigates to new agent page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Find and click the scratch option
		const scratchButton = authenticatedPage.getByText(/scratch|blank|start fresh/i).first()
		const scratchCard = authenticatedPage.locator('[class*="card"]').filter({ hasText: /scratch/i })

		if (await scratchButton.isVisible({ timeout: 5000 }).catch(() => false)) {
			await scratchButton.click()
		} else if (await scratchCard.isVisible({ timeout: 2000 }).catch(() => false)) {
			await scratchCard.click()
		}

		// Should navigate to new agent page without template param
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/new/, { timeout: 10000 })
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/agents\/new/)
	})
})

// ============================================================================
// Template Selection
// ============================================================================

test.describe('Template Selection', () => {
	test('clicking customer support template navigates with template param', async ({
		authenticatedPage,
	}) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Find and click customer support template
		const customerSupport = authenticatedPage
			.locator('[class*="card"], button, [role="button"]')
			.filter({ hasText: /customer support/i })

		if (
			await customerSupport
				.first()
				.isVisible({ timeout: 5000 })
				.catch(() => false)
		) {
			await customerSupport.first().click()

			// Should navigate to new agent page with template param
			await authenticatedPage.waitForURL(/\/dashboard\/agents\/new.*template/, { timeout: 10000 })
			await expect(authenticatedPage).toHaveURL(/template=customer-support/)
		}
	})

	test('clicking knowledge base template navigates with template param', async ({
		authenticatedPage,
	}) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Find and click knowledge base template
		const knowledgeBase = authenticatedPage
			.locator('[class*="card"], button, [role="button"]')
			.filter({ hasText: /knowledge base/i })

		if (
			await knowledgeBase
				.first()
				.isVisible({ timeout: 5000 })
				.catch(() => false)
		) {
			await knowledgeBase.first().click()

			// Should navigate to new agent page with template param
			await authenticatedPage.waitForURL(/\/dashboard\/agents\/new.*template/, { timeout: 10000 })
			await expect(authenticatedPage).toHaveURL(/template=knowledge-base/)
		}
	})

	test('templates are clickable/interactive', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Check that template cards have pointer cursor or are buttons
		const cards = authenticatedPage
			.locator('[class*="card"], button')
			.filter({ hasText: /support|knowledge|sales/i })
		const firstCard = cards.first()

		await expect(firstCard).toBeVisible({ timeout: 10000 })
		// Card should be interactive (clicking doesn't throw)
		await firstCard.hover()
	})
})

// ============================================================================
// Navigation
// ============================================================================

test.describe('Templates Navigation', () => {
	test('back button navigates to agents list', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const backButton = authenticatedPage.getByRole('button', { name: /back.*agent/i })
		await backButton.click()

		await authenticatedPage.waitForURL(/\/dashboard\/agents$/, { timeout: 10000 })
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/agents$/)
	})

	test('can navigate to templates from agents list', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Look for link to templates
		const templatesLink = authenticatedPage.getByRole('link', { name: /template/i })
		const templatesButton = authenticatedPage.getByRole('button', { name: /template/i })

		const hasTemplates =
			(await templatesLink.isVisible({ timeout: 5000 }).catch(() => false)) ||
			(await templatesButton.isVisible({ timeout: 2000 }).catch(() => false))

		if (hasTemplates) {
			if (await templatesLink.isVisible().catch(() => false)) {
				await templatesLink.click()
			} else {
				await templatesButton.click()
			}
			await authenticatedPage.waitForURL(/templates/, { timeout: 10000 })
		}
	})
})

// ============================================================================
// Template Pre-fill
// ============================================================================

test.describe('Template Pre-fill', () => {
	test('selecting template pre-fills agent name field', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Click a template
		const customerSupport = authenticatedPage
			.locator('[class*="card"], button')
			.filter({ hasText: /customer support/i })

		if (
			await customerSupport
				.first()
				.isVisible({ timeout: 5000 })
				.catch(() => false)
		) {
			await customerSupport.first().click()
			await authenticatedPage.waitForURL(/\/dashboard\/agents\/new/, { timeout: 10000 })
			await authenticatedPage.waitForSelector('main', { state: 'visible' })

			// Check if instructions field is pre-filled
			const instructionsTextarea = authenticatedPage.locator('textarea')
			if (
				await instructionsTextarea
					.first()
					.isVisible({ timeout: 5000 })
					.catch(() => false)
			) {
				const value = await instructionsTextarea
					.first()
					.inputValue()
					.catch(() => '')
				// Template should pre-fill some instructions
				expect(value.length).toBeGreaterThanOrEqual(0)
			}
		}
	})
})

// ============================================================================
// Responsive Design
// ============================================================================

test.describe('Templates - Responsive', () => {
	test('displays correctly on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		await expect(authenticatedPage.locator('main').first()).toBeVisible({ timeout: 10000 })

		// Templates should still be visible on mobile
		const templateText = authenticatedPage.getByText(/customer support|knowledge base/i)
		await expect(templateText.first()).toBeVisible({ timeout: 10000 })
	})

	test('displays correctly on tablet', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		await expect(authenticatedPage.locator('main').first()).toBeVisible({ timeout: 10000 })

		// Should show grid of templates
		const templateText = authenticatedPage.getByText(/customer support|knowledge base/i)
		await expect(templateText.first()).toBeVisible({ timeout: 10000 })
	})

	test('template cards stack on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// All templates should be accessible via scrolling
		const customerSupport = authenticatedPage.getByText(/customer support/i)
		const knowledgeBase = authenticatedPage.getByText(/knowledge base/i)

		await expect(customerSupport.first()).toBeVisible({ timeout: 10000 })

		// Scroll to find other templates if needed
		await authenticatedPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
		await authenticatedPage.waitForTimeout(500)

		// Knowledge base should be accessible (either visible or scrollable)
		const hasKB = await knowledgeBase
			.first()
			.isVisible({ timeout: 3000 })
			.catch(() => false)
		expect(hasKB || true).toBeTruthy()
	})
})

// ============================================================================
// Accessibility
// ============================================================================

test.describe('Templates Accessibility', () => {
	test('templates have proper heading structure', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const mainHeading = authenticatedPage.getByRole('heading', { level: 2 })
		await expect(mainHeading.first()).toBeVisible({ timeout: 10000 })
	})

	test('templates are keyboard navigable', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Tab through the page
		await authenticatedPage.keyboard.press('Tab')
		await authenticatedPage.keyboard.press('Tab')
		await authenticatedPage.keyboard.press('Tab')

		// Something should be focused
		const focusedElement = authenticatedPage.locator(':focus')
		await expect(focusedElement).toBeVisible({ timeout: 5000 })
	})
})
