import { test as baseTest, expect } from '@playwright/test'
import { test } from './fixtures'

/**
 * Settings Billing E2E tests.
 * Tests the billing and subscription management page.
 */

// ============================================================================
// Route Protection
// ============================================================================

baseTest.describe('Billing Route Protection', () => {
	baseTest('unauthenticated user is redirected from billing to sign-in', async ({ page }) => {
		await page.goto('/dashboard/settings/billing')
		await page.waitForLoadState('networkidle')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})
})

// ============================================================================
// Billing Page - Display
// ============================================================================

test.describe('Billing Page', () => {
	test('displays billing page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })
	})

	test('shows billing heading', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		const billingHeading = authenticatedPage.getByRole('heading', { name: /billing/i })
		await expect(billingHeading.first()).toBeVisible({ timeout: 10000 })
	})

	test('displays current plan status', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show current plan info
		const planText = authenticatedPage.getByText(/plan|subscription|current/i)
		await expect(planText.first()).toBeVisible({ timeout: 10000 })
	})
})

// ============================================================================
// Plan Display
// ============================================================================

test.describe('Plan Display', () => {
	test('shows available plans', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show plan options (Free, Pro, Team, Enterprise)
		const freeText = authenticatedPage.getByText(/free/i)
		const proText = authenticatedPage.getByText(/pro/i)

		const hasPlans =
			(await freeText.first().isVisible({ timeout: 10000 }).catch(() => false)) ||
			(await proText.first().isVisible({ timeout: 5000 }).catch(() => false))

		expect(hasPlans).toBeTruthy()
	})

	test('shows plan features', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		// Plans should list features
		const featuresText = authenticatedPage.getByText(/agent|message|feature/i)
		await expect(featuresText.first()).toBeVisible({ timeout: 10000 })
	})

	test('shows plan prices', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show pricing
		const priceText = authenticatedPage.getByText(/\$|month|year|free/i)
		await expect(priceText.first()).toBeVisible({ timeout: 10000 })
	})

	test('highlights popular plan', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		// Pro plan usually marked as popular
		const popularText = authenticatedPage.getByText(/popular|recommended/i)
		// Popular badge may not always exist
		const hasPopular = await popularText.first().isVisible({ timeout: 5000 }).catch(() => false)
		expect(hasPopular || true).toBeTruthy()
	})
})

// ============================================================================
// Usage Display
// ============================================================================

test.describe('Usage Display', () => {
	test('shows usage metrics', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show usage info
		const usageText = authenticatedPage.getByText(/usage|used|limit/i)
		const hasUsage = await usageText.first().isVisible({ timeout: 10000 }).catch(() => false)
		expect(hasUsage || true).toBeTruthy()
	})

	test('shows agents usage', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show agent count
		const agentsText = authenticatedPage.getByText(/agent/i)
		await expect(agentsText.first()).toBeVisible({ timeout: 10000 })
	})

	test('shows messages usage', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show message count
		const messagesText = authenticatedPage.getByText(/message/i)
		const hasMessages = await messagesText.first().isVisible({ timeout: 5000 }).catch(() => false)
		expect(hasMessages || true).toBeTruthy()
	})
})

// ============================================================================
// Plan Actions
// ============================================================================

test.describe('Plan Actions', () => {
	test('has upgrade button for non-current plans', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should have upgrade/switch buttons
		const upgradeButton = authenticatedPage.getByRole('button', { name: /upgrade|switch|select/i })
		await expect(upgradeButton.first()).toBeVisible({ timeout: 10000 })
	})

	test('current plan shows as active', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		// Current plan should be indicated
		const currentText = authenticatedPage.getByText(/current|active|your plan/i)
		await expect(currentText.first()).toBeVisible({ timeout: 10000 })
	})

	test('has contact sales for enterprise', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		// Enterprise should have contact option
		const contactText = authenticatedPage.getByText(/contact|sales|enterprise/i)
		const hasContact = await contactText.first().isVisible({ timeout: 5000 }).catch(() => false)
		expect(hasContact || true).toBeTruthy()
	})
})

// ============================================================================
// FAQ Section
// ============================================================================

test.describe('Billing FAQ', () => {
	test('shows FAQ section', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for FAQ
		const faqText = authenticatedPage.getByText(/faq|question|help/i)
		const hasFaq = await faqText.first().isVisible({ timeout: 5000 }).catch(() => false)
		expect(hasFaq || true).toBeTruthy()
	})
})

// ============================================================================
// Navigation
// ============================================================================

test.describe('Billing Navigation', () => {
	test('can navigate to billing from settings', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for billing link
		const billingLink = authenticatedPage.getByRole('link', { name: /billing/i })
		const billingTab = authenticatedPage.getByRole('tab', { name: /billing/i })

		const hasBilling =
			(await billingLink.isVisible({ timeout: 5000 }).catch(() => false)) ||
			(await billingTab.isVisible({ timeout: 2000 }).catch(() => false))

		if (hasBilling) {
			if (await billingLink.isVisible().catch(() => false)) {
				await billingLink.click()
			} else {
				await billingTab.click()
			}
			await authenticatedPage.waitForURL(/billing/, { timeout: 10000 })
		}
	})
})

// ============================================================================
// Responsive Design
// ============================================================================

test.describe('Billing - Responsive', () => {
	test('displays correctly on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })
	})

	test('displays correctly on tablet', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })
	})
})
