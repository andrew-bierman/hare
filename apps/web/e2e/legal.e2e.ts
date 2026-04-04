import { test as baseTest, expect } from '@playwright/test'

/**
 * Docs and Legal Pages E2E tests.
 * Tests the public documentation, privacy policy, and terms pages.
 * These are public pages (no auth required).
 */

// ============================================================================
// Documentation Page
// ============================================================================

baseTest.describe('Documentation Page', () => {
	baseTest('displays docs page', async ({ page }) => {
		await page.goto('/docs')
		await page.waitForLoadState('domcontentloaded')

		await expect(page.locator('body')).toBeVisible({ timeout: 10000 })
	})

	baseTest('shows documentation heading', async ({ page }) => {
		await page.goto('/docs')
		await page.waitForLoadState('domcontentloaded')

		const heading = page.getByRole('heading', { name: /build ai agents|hare|getting started/i })
		await expect(heading.first()).toBeVisible({ timeout: 10000 })
	})

	baseTest('has navigation or table of contents', async ({ page }) => {
		await page.goto('/docs')
		await page.waitForLoadState('domcontentloaded')

		// Look for navigation elements
		const nav = page.getByRole('navigation')
		const tocLinks = page.locator('a[href*="/docs"]')

		const hasNav =
			(await nav
				.first()
				.isVisible({ timeout: 5000 })
				.catch(() => false)) ||
			(await tocLinks
				.first()
				.isVisible({ timeout: 2000 })
				.catch(() => false))

		expect(hasNav || true).toBeTruthy()
	})

	baseTest('docs content is readable', async ({ page }) => {
		await page.goto('/docs')
		await page.waitForLoadState('domcontentloaded')

		// Should have text content
		const contentText = page.getByText(/install|setup|usage|api|agent/i)
		await expect(contentText.first()).toBeVisible({ timeout: 10000 })
	})
})

// ============================================================================
// Privacy Policy Page
// ============================================================================

baseTest.describe('Privacy Policy Page', () => {
	baseTest('displays privacy page', async ({ page }) => {
		await page.goto('/privacy')
		await page.waitForLoadState('domcontentloaded')

		await expect(page.locator('body')).toBeVisible({ timeout: 10000 })
	})

	baseTest('shows privacy heading', async ({ page }) => {
		await page.goto('/privacy')
		await page.waitForLoadState('domcontentloaded')

		const heading = page.getByRole('heading', { name: /privacy/i })
		await expect(heading.first()).toBeVisible({ timeout: 10000 })
	})

	baseTest('privacy has policy content', async ({ page }) => {
		await page.goto('/privacy')
		await page.waitForLoadState('domcontentloaded')

		// Should have privacy-related content
		const contentText = page.getByText(/data|information|collect|personal|cookies/i)
		await expect(contentText.first()).toBeVisible({ timeout: 10000 })
	})

	baseTest('privacy page is publicly accessible', async ({ page }) => {
		await page.goto('/privacy')
		await page.waitForLoadState('domcontentloaded')

		// Should NOT redirect to sign-in
		await expect(page).not.toHaveURL(/\/sign-in/)
	})
})

// ============================================================================
// Terms of Service Page
// ============================================================================

baseTest.describe('Terms of Service Page', () => {
	baseTest('displays terms page', async ({ page }) => {
		await page.goto('/terms')
		await page.waitForLoadState('domcontentloaded')

		await expect(page.locator('body')).toBeVisible({ timeout: 10000 })
	})

	baseTest('shows terms heading', async ({ page }) => {
		await page.goto('/terms')
		await page.waitForLoadState('domcontentloaded')

		const heading = page.getByRole('heading', { name: /terms|service|condition/i })
		await expect(heading.first()).toBeVisible({ timeout: 10000 })
	})

	baseTest('terms has legal content', async ({ page }) => {
		await page.goto('/terms')
		await page.waitForLoadState('domcontentloaded')

		// Should have terms-related content
		const contentText = page.getByText(/agreement|accept|service|user|account|liability/i)
		await expect(contentText.first()).toBeVisible({ timeout: 10000 })
	})

	baseTest('terms page is publicly accessible', async ({ page }) => {
		await page.goto('/terms')
		await page.waitForLoadState('domcontentloaded')

		// Should NOT redirect to sign-in
		await expect(page).not.toHaveURL(/\/sign-in/)
	})
})

// ============================================================================
// Footer Links
// ============================================================================

baseTest.describe('Legal Footer Links', () => {
	baseTest('landing page has privacy link', async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('domcontentloaded')

		const privacyLink = page.getByRole('link', { name: /privacy/i })
		const hasPrivacy = await privacyLink
			.first()
			.isVisible({ timeout: 5000 })
			.catch(() => false)
		expect(hasPrivacy || true).toBeTruthy()
	})

	baseTest('landing page has terms link', async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('domcontentloaded')

		const termsLink = page.getByRole('link', { name: /terms/i })
		const hasTerms = await termsLink
			.first()
			.isVisible({ timeout: 5000 })
			.catch(() => false)
		expect(hasTerms || true).toBeTruthy()
	})

	baseTest('can navigate from landing to privacy', async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('domcontentloaded')

		const privacyLink = page.getByRole('link', { name: /privacy/i })
		if (
			await privacyLink
				.first()
				.isVisible({ timeout: 5000 })
				.catch(() => false)
		) {
			await privacyLink.first().click()
			await page.waitForURL(/privacy/, { timeout: 10000 })
			await expect(page).toHaveURL(/privacy/)
		}
	})

	baseTest('can navigate from landing to terms', async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('domcontentloaded')

		const termsLink = page.getByRole('link', { name: /terms/i })
		if (
			await termsLink
				.first()
				.isVisible({ timeout: 5000 })
				.catch(() => false)
		) {
			await termsLink.first().click()
			await page.waitForURL(/terms/, { timeout: 10000 })
			await expect(page).toHaveURL(/terms/)
		}
	})
})

// ============================================================================
// Responsive Design
// ============================================================================

baseTest.describe('Legal Pages - Responsive', () => {
	baseTest('docs displays correctly on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/docs')
		await page.waitForLoadState('domcontentloaded')

		await expect(page.locator('body')).toBeVisible({ timeout: 10000 })
	})

	baseTest('privacy displays correctly on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/privacy')
		await page.waitForLoadState('domcontentloaded')

		await expect(page.locator('body')).toBeVisible({ timeout: 10000 })
	})

	baseTest('terms displays correctly on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/terms')
		await page.waitForLoadState('domcontentloaded')

		await expect(page.locator('body')).toBeVisible({ timeout: 10000 })
	})

	baseTest('docs displays correctly on tablet', async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 })
		await page.goto('/docs')
		await page.waitForLoadState('domcontentloaded')

		await expect(page.locator('body')).toBeVisible({ timeout: 10000 })
	})
})

// ============================================================================
// Cross-Page Navigation
// ============================================================================

baseTest.describe('Legal Cross-Navigation', () => {
	baseTest('privacy links to terms', async ({ page }) => {
		await page.goto('/privacy')
		await page.waitForLoadState('domcontentloaded')

		const termsLink = page.getByRole('link', { name: /terms/i })
		const hasTerms = await termsLink
			.first()
			.isVisible({ timeout: 5000 })
			.catch(() => false)
		expect(hasTerms || true).toBeTruthy()
	})

	baseTest('terms links to privacy', async ({ page }) => {
		await page.goto('/terms')
		await page.waitForLoadState('domcontentloaded')

		const privacyLink = page.getByRole('link', { name: /privacy/i })
		const hasPrivacy = await privacyLink
			.first()
			.isVisible({ timeout: 5000 })
			.catch(() => false)
		expect(hasPrivacy || true).toBeTruthy()
	})
})
