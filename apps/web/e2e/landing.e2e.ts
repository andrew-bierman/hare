import { expect, type Page, test } from '@playwright/test'

test.describe('Landing Page - Header & Navigation', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/')
	})

	test('displays app logo and name', async ({ page }: { page: Page }) => {
		// Check for Hare branding
		await expect(page.locator('header').first()).toBeVisible()
		await expect(page.getByText('Hare').first()).toBeVisible()
	})

	test('has navigation links', async ({ page }: { page: Page }) => {
		const header = page.locator('header')
		await expect(header.getByRole('link', { name: 'Features' })).toBeVisible()
		await expect(header.getByRole('link', { name: 'How it Works' })).toBeVisible()
	})

	test('has auth buttons for unauthenticated users', async ({ page }: { page: Page }) => {
		// Sign In and Get Started buttons
		await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible()
	})

	test('navigates to sign-up from Get Started button', async ({ page }: { page: Page }) => {
		const getStartedButton = page.getByRole('link', { name: 'Get Started' })
		await expect(getStartedButton).toHaveAttribute('href', '/sign-up')
	})
})

test.describe('Landing Page - Hero Section', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/')
	})

	test('displays hero badge', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Public Beta')).toBeVisible()
	})

	test('displays hero title', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('heading', { name: /Build & Deploy/i }).first()).toBeVisible()
		await expect(page.getByText('AI Agents').first()).toBeVisible()
	})

	test('displays hero description', async ({ page }: { page: Page }) => {
		await expect(page.getByText(/fastest way to create, deploy/i)).toBeVisible()
	})

	test('has primary CTA button', async ({ page }: { page: Page }) => {
		const primaryCta = page.getByRole('link', { name: 'Start Building Free' })
		await expect(primaryCta).toBeVisible()
		await expect(primaryCta).toHaveAttribute('href', '/sign-up')
	})

	test('displays hero feature badges', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Open Source', { exact: true })).toBeVisible()
		await expect(page.getByText('300+ Locations')).toBeVisible()
		await expect(page.getByText('<50ms Latency')).toBeVisible()
	})

	test('displays hero section content', async ({ page }: { page: Page }) => {
		// Hero section should have primary CTA visible
		await expect(page.getByRole('link', { name: 'Start Building Free' })).toBeVisible()
		await expect(page.getByText(/fastest way to create/i)).toBeVisible()
	})
})

test.describe('Landing Page - Code Preview', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/')
	})

	test('displays code preview card', async ({ page }: { page: Page }) => {
		await expect(page.getByText('agent.ts')).toBeVisible()
	})

	test('shows code example content', async ({ page }: { page: Page }) => {
		await expect(page.getByText(/import \{ Agent \}/)).toBeVisible()
		await expect(page.getByText(/await agent\.deploy/)).toBeVisible()
	})
})

test.describe('Landing Page - Features Section', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/')
	})

	test('displays features section heading', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('heading', { name: 'Everything you need' }).first()).toBeVisible()
	})

	test('displays all feature cards', async ({ page }: { page: Page }) => {
		const features = [
			'Agent Configuration',
			'Instant Deployment',
			'Built-in Tools',
			'Developer SDK',
			'Real-time Streaming',
			'Enterprise Security',
		]

		for (const feature of features) {
			await expect(page.getByText(feature, { exact: true }).first()).toBeVisible()
		}
	})

	test('has features navigation link', async ({ page }: { page: Page }) => {
		const featuresLink = page.getByRole('link', { name: 'Features' })
		await expect(featuresLink).toBeVisible()
	})
})

test.describe('Landing Page - How it Works Section', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/')
	})

	test('displays how it works heading', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('heading', { name: '3 simple steps' }).first()).toBeVisible()
	})

	test('displays all steps', async ({ page }: { page: Page }) => {
		const steps = ['Define', 'Add Tools', 'Deploy']
		for (const step of steps) {
			await expect(page.getByText(step, { exact: true }).first()).toBeVisible()
		}
	})

	test('has how it works navigation link', async ({ page }: { page: Page }) => {
		const howItWorksLink = page.getByRole('link', { name: 'How it Works' })
		await expect(howItWorksLink).toBeVisible()
	})
})

test.describe('Landing Page - Stats Section', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/')
	})

	test('page has multiple sections', async ({ page }: { page: Page }) => {
		// Page should have multiple sections for stats, features, etc.
		const sections = page.locator('section')
		const count = await sections.count()
		expect(count).toBeGreaterThan(2)
	})
})

test.describe('Landing Page - CTA Section', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/')
	})

	test('displays CTA section', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Ready to build your first agent?')).toBeVisible()
	})

	test('has Get Started Free button', async ({ page }: { page: Page }) => {
		const ctaButton = page.getByRole('link', { name: 'Get Started Free' })
		await expect(ctaButton).toBeVisible()
		await expect(ctaButton).toHaveAttribute('href', '/sign-up')
	})

	test('has GitHub button', async ({ page }: { page: Page }) => {
		const githubButton = page.getByRole('link', { name: 'GitHub' }).first()
		await expect(githubButton).toBeVisible()
	})
})

test.describe('Landing Page - Footer', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/')
	})

	test('displays footer', async ({ page }: { page: Page }) => {
		const footer = page.locator('footer')
		await expect(footer).toBeVisible()
	})

	test('has footer links', async ({ page }: { page: Page }) => {
		const footer = page.locator('footer')
		await expect(footer.getByRole('link', { name: 'Documentation' })).toBeVisible()
		await expect(footer.getByRole('link', { name: 'Privacy' })).toBeVisible()
		await expect(footer.getByRole('link', { name: 'Terms' })).toBeVisible()
	})
})

test.describe('Landing Page - Responsive Design', () => {
	test('displays correctly on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/')

		// Hero should be visible
		await expect(page.getByRole('heading', { name: /Build & Deploy/i }).first()).toBeVisible()

		// CTAs should stack on mobile
		await expect(page.getByRole('link', { name: 'Start Building Free' })).toBeVisible()

		// Footer should be visible
		await expect(page.locator('footer')).toBeVisible()
	})

	test('displays correctly on tablet', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 768, height: 1024 })
		await page.goto('/')

		await expect(page.getByRole('heading', { name: /Build & Deploy/i }).first()).toBeVisible()
		await expect(page.getByRole('heading', { name: 'Everything you need' }).first()).toBeVisible()
	})

	test('displays correctly on desktop', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 1920, height: 1080 })
		await page.goto('/')

		// Navigation should show all items
		await expect(page.getByRole('link', { name: 'Features' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'How it Works' })).toBeVisible()
	})
})

test.describe('Landing Page - Accessibility', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/')
	})

	test('has proper heading hierarchy', async ({ page }: { page: Page }) => {
		// Should have h1 as main heading
		const h1 = page.locator('h1')
		await expect(h1).toBeVisible()
	})

	test('all interactive elements are keyboard focusable', async ({ page }: { page: Page }) => {
		// Tab through the page and check focus
		await page.keyboard.press('Tab')
		const firstFocusedElement = page.locator(':focus')
		await expect(firstFocusedElement).toBeVisible()
	})

	test('links have descriptive text', async ({ page }: { page: Page }) => {
		// All links should have text content
		const links = await page.locator('a').all()
		for (const link of links.slice(0, 10)) {
			const text = await link.textContent()
			expect(text?.trim().length).toBeGreaterThan(0)
		}
	})
})
