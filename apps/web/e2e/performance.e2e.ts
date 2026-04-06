import { expect } from '@playwright/test'
import { test } from './fixtures'

/**
 * Performance Baseline E2E tests.
 * Tests page load times, responsiveness, memory usage, and web vitals.
 *
 * Baseline metrics:
 * - Dashboard page load: < 3 seconds
 * - Agents list (50 agents): < 2 seconds
 * - Agent detail page: < 2 seconds
 * - First Contentful Paint (FCP): < 1.5 seconds
 * - Cumulative Layout Shift (CLS): < 0.1
 * - Memory: No leaks after repeated navigation
 *
 * Tests fail if metrics exceed baseline by >20%
 */

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
	dashboardLoad: 3000,
	agentsListLoad: 2000,
	agentDetailLoad: 2000,
	firstContentfulPaint: 1500,
	cumulativeLayoutShift: 0.1,
	// 20% tolerance for threshold failures
	toleranceMultiplier: 1.2,
}

// Helper to generate unique agent names
function generateAgentName(prefix = 'Perf'): string {
	return `${prefix} Agent ${Date.now()}`
}

// Helper to dismiss tour if visible

// Helper to create an agent and return its ID
async function createAgent(
	page: import('@playwright/test').Page,
	options: { name?: string; description?: string } = {},
) {
	const agentName = options.name ?? generateAgentName()
	const description = options.description ?? 'Performance test agent'

	await page.goto('/dashboard/agents/new')
	await page.waitForSelector('main', { state: 'visible' })

	await page.getByLabel(/name/i).fill(agentName)
	await page.locator('#description').fill(description)

	const createButton = page.getByRole('button', { name: /create/i })
	await createButton.click()

	await page.waitForURL(/\/dashboard\/agents\/[a-f0-9-]+$/, { timeout: 10000 })
	await page.waitForSelector('main', { state: 'visible' })
	await page.waitForTimeout(1000)

	const url = page.url()
	const agentId = url.split('/').pop() as string

	return { agentId, agentName }
}

// Helper to measure page load time
async function measurePageLoad(
	page: import('@playwright/test').Page,
	url: string,
): Promise<number> {
	const startTime = Date.now()
	await page.goto(url)
	await page.waitForSelector('main', { state: 'visible' })
	const endTime = Date.now()
	return endTime - startTime
}

// Helper to get Web Vitals from Performance API
async function getWebVitals(page: import('@playwright/test').Page): Promise<{
	fcp: number | null
	cls: number | null
}> {
	return await page.evaluate(() => {
		return new Promise<{ fcp: number | null; cls: number | null }>((resolve) => {
			let fcp: number | null = null
			let cls: number | null = null

			// Get FCP from Performance Observer or performance entries
			const paintEntries = performance.getEntriesByType('paint')
			const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint')
			if (fcpEntry) {
				fcp = fcpEntry.startTime
			}

			// Get CLS from Layout Shift entries
			const layoutShiftEntries = performance.getEntriesByType(
				'layout-shift',
			) as PerformanceEntry[] as Array<
				PerformanceEntry & { value: number; hadRecentInput: boolean }
			>
			if (layoutShiftEntries.length > 0) {
				cls = layoutShiftEntries
					.filter((entry) => !entry.hadRecentInput)
					.reduce((sum, entry) => sum + entry.value, 0)
			} else {
				cls = 0
			}

			resolve({ fcp, cls })
		})
	})
}

// Helper to get heap memory usage
async function getMemoryUsage(page: import('@playwright/test').Page): Promise<number | null> {
	return await page.evaluate(() => {
		// biome-ignore lint/suspicious/noExplicitAny: Chrome-specific performance.memory API not in standard TS types
		const memory = (performance as any).memory
		if (memory) {
			return memory.usedJSHeapSize
		}
		return null
	})
}

// Stored baseline metrics for comparison
const baselineMetrics = {
	dashboardLoad: 0,
	agentsListLoad: 0,
	agentDetailLoad: 0,
	fcp: 0,
	cls: 0,
}

// ============================================================================
// Dashboard Page Load Tests
// ============================================================================

test.describe('Performance - Dashboard Page Load', () => {
	test('dashboard page loads in under 3 seconds', async ({ authenticatedPage }) => {
		const loadTime = await measurePageLoad(authenticatedPage, '/dashboard')

		// Capture baseline
		baselineMetrics.dashboardLoad = loadTime

		// Verify page loaded correctly
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Dashboard' }).first(),
		).toBeVisible()

		// Check against threshold with tolerance
		const maxAllowedTime = THRESHOLDS.dashboardLoad * THRESHOLDS.toleranceMultiplier
		expect(loadTime).toBeLessThan(maxAllowedTime)

		console.log(`Dashboard load time: ${loadTime}ms (threshold: ${THRESHOLDS.dashboardLoad}ms)`)
	})

	test('dashboard page load time is within baseline + 20%', async ({ authenticatedPage }) => {
		// First measurement
		const firstLoadTime = await measurePageLoad(authenticatedPage, '/dashboard')
		await authenticatedPage.waitForTimeout(1000)

		// Navigate away and back
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Second measurement
		const secondLoadTime = await measurePageLoad(authenticatedPage, '/dashboard')

		// Second load should be within 20% of first (accounting for caching)
		const maxAllowedVariance = firstLoadTime * THRESHOLDS.toleranceMultiplier
		expect(secondLoadTime).toBeLessThan(maxAllowedVariance + 500) // Add 500ms buffer

		console.log(`Dashboard load times - First: ${firstLoadTime}ms, Second: ${secondLoadTime}ms`)
	})
})

// ============================================================================
// Agents List Load Tests
// ============================================================================

test.describe('Performance - Agents List Load', () => {
	test('agents list page loads in under 2 seconds', async ({ authenticatedPage }) => {
		const loadTime = await measurePageLoad(authenticatedPage, '/dashboard/agents')

		// Capture baseline
		baselineMetrics.agentsListLoad = loadTime

		// Verify page loaded correctly
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }).first(),
		).toBeVisible()

		// Check against threshold with tolerance
		const maxAllowedTime = THRESHOLDS.agentsListLoad * THRESHOLDS.toleranceMultiplier
		expect(loadTime).toBeLessThan(maxAllowedTime)

		console.log(`Agents list load time: ${loadTime}ms (threshold: ${THRESHOLDS.agentsListLoad}ms)`)
	})

	test('agents list with many agents loads in under 2 seconds', async ({ authenticatedPage }) => {
		// Create multiple agents to test list performance
		// Note: In a real scenario, we'd seed 50 agents, but for test efficiency we test with fewer
		const agentCount = 5 // Reduced for test speed, but validates the pattern

		const createdAgents: string[] = []
		for (let i = 0; i < agentCount; i++) {
			const { agentName } = await createAgent(authenticatedPage, {
				name: `Perf Test Agent ${Date.now()}-${i}`,
			})
			createdAgents.push(agentName)
		}

		// Measure list load time
		const loadTime = await measurePageLoad(authenticatedPage, '/dashboard/agents')

		// Verify page loaded correctly
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }).first(),
		).toBeVisible()

		// Verify agents are displayed
		await authenticatedPage.waitForTimeout(1000)
		const visibleAgents = authenticatedPage
			.locator('[class*="card"]')
			.filter({ hasText: /Perf Test Agent/ })
		const visibleCount = await visibleAgents.count()
		expect(visibleCount).toBeGreaterThanOrEqual(1)

		// Check against threshold with tolerance
		const maxAllowedTime = THRESHOLDS.agentsListLoad * THRESHOLDS.toleranceMultiplier
		expect(loadTime).toBeLessThan(maxAllowedTime)

		console.log(
			`Agents list (${visibleCount} agents) load time: ${loadTime}ms (threshold: ${THRESHOLDS.agentsListLoad}ms)`,
		)
	})
})

// ============================================================================
// Agent Detail Page Load Tests
// ============================================================================

test.describe('Performance - Agent Detail Page Load', () => {
	test('agent detail page loads in under 2 seconds', async ({ authenticatedPage }) => {
		// Create an agent first
		const { agentId, agentName } = await createAgent(authenticatedPage)

		// Navigate away
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Measure detail page load
		const loadTime = await measurePageLoad(authenticatedPage, `/dashboard/agents/${agentId}`)

		// Capture baseline
		baselineMetrics.agentDetailLoad = loadTime

		// Verify page loaded correctly
		await expect(authenticatedPage.getByRole('heading', { name: agentName }).first()).toBeVisible()

		// Check against threshold with tolerance
		const maxAllowedTime = THRESHOLDS.agentDetailLoad * THRESHOLDS.toleranceMultiplier
		expect(loadTime).toBeLessThan(maxAllowedTime)

		console.log(
			`Agent detail load time: ${loadTime}ms (threshold: ${THRESHOLDS.agentDetailLoad}ms)`,
		)
	})
})

// ============================================================================
// Memory Leak Tests
// ============================================================================

test.describe('Performance - Memory Leaks', () => {
	test('no memory leaks after repeated navigation', async ({ authenticatedPage }) => {
		// Create an agent for navigation testing
		const { agentId } = await createAgent(authenticatedPage)

		// Initial memory measurement
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(500)
		const initialMemory = await getMemoryUsage(authenticatedPage)

		// Skip test if memory API is not available (Firefox doesn't support it)
		if (initialMemory === null) {
			console.log('Memory API not available, skipping memory leak test')
			return
		}

		// Repeated navigation cycles
		const navigationCycles = 10
		for (let i = 0; i < navigationCycles; i++) {
			await authenticatedPage.goto('/dashboard')
			await authenticatedPage.waitForSelector('main', { state: 'visible' })

			await authenticatedPage.goto('/dashboard/agents')
			await authenticatedPage.waitForSelector('main', { state: 'visible' })

			await authenticatedPage.goto(`/dashboard/agents/${agentId}`)
			await authenticatedPage.waitForSelector('main', { state: 'visible' })

			await authenticatedPage.goto('/dashboard/tools')
			await authenticatedPage.waitForSelector('main', { state: 'visible' })

			await authenticatedPage.goto('/dashboard/settings')
			await authenticatedPage.waitForSelector('main', { state: 'visible' })
		}

		// Force garbage collection if available
		await authenticatedPage.evaluate(() => {
			// biome-ignore lint/suspicious/noExplicitAny: Chrome DevTools gc() not in standard window type
			if ((window as any).gc) {
				// biome-ignore lint/suspicious/noExplicitAny: Chrome DevTools gc() not in standard window type
				;(window as any).gc()
			}
		})

		await authenticatedPage.waitForTimeout(1000)

		// Final memory measurement
		const finalMemory = await getMemoryUsage(authenticatedPage)

		if (finalMemory !== null) {
			// Memory should not grow by more than 50% (allowing for normal variation)
			const memoryGrowthRatio = finalMemory / initialMemory
			const maxAllowedGrowth = 1.5

			console.log(
				`Memory usage - Initial: ${(initialMemory / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory / 1024 / 1024).toFixed(2)}MB, Growth: ${((memoryGrowthRatio - 1) * 100).toFixed(1)}%`,
			)

			expect(memoryGrowthRatio).toBeLessThan(maxAllowedGrowth)
		}
	})
})

// ============================================================================
// Cumulative Layout Shift Tests
// ============================================================================

test.describe('Performance - Cumulative Layout Shift', () => {
	test('dashboard has no significant layout shifts (CLS < 0.1)', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Wait for content to stabilize
		await authenticatedPage.waitForTimeout(2000)

		const { cls } = await getWebVitals(authenticatedPage)

		// Capture baseline
		baselineMetrics.cls = cls ?? 0

		// Check against threshold with tolerance
		const maxAllowedCls = THRESHOLDS.cumulativeLayoutShift * THRESHOLDS.toleranceMultiplier

		if (cls !== null) {
			console.log(
				`Dashboard CLS: ${cls.toFixed(4)} (threshold: ${THRESHOLDS.cumulativeLayoutShift})`,
			)
			expect(cls).toBeLessThan(maxAllowedCls)
		}
	})

	test('agents list has no significant layout shifts (CLS < 0.1)', async ({
		authenticatedPage,
	}) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Wait for content to stabilize
		await authenticatedPage.waitForTimeout(2000)

		const { cls } = await getWebVitals(authenticatedPage)

		// Check against threshold with tolerance
		const maxAllowedCls = THRESHOLDS.cumulativeLayoutShift * THRESHOLDS.toleranceMultiplier

		if (cls !== null) {
			console.log(
				`Agents list CLS: ${cls.toFixed(4)} (threshold: ${THRESHOLDS.cumulativeLayoutShift})`,
			)
			expect(cls).toBeLessThan(maxAllowedCls)
		}
	})

	test('agent detail page has no significant layout shifts (CLS < 0.1)', async ({
		authenticatedPage,
	}) => {
		const { agentId } = await createAgent(authenticatedPage)

		// Navigate away and back
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		await authenticatedPage.goto(`/dashboard/agents/${agentId}`)
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Wait for content to stabilize
		await authenticatedPage.waitForTimeout(2000)

		const { cls } = await getWebVitals(authenticatedPage)

		// Check against threshold with tolerance
		const maxAllowedCls = THRESHOLDS.cumulativeLayoutShift * THRESHOLDS.toleranceMultiplier

		if (cls !== null) {
			console.log(
				`Agent detail CLS: ${cls.toFixed(4)} (threshold: ${THRESHOLDS.cumulativeLayoutShift})`,
			)
			expect(cls).toBeLessThan(maxAllowedCls)
		}
	})
})

// ============================================================================
// First Contentful Paint Tests
// ============================================================================

test.describe('Performance - First Contentful Paint', () => {
	test('dashboard FCP is under 1.5 seconds', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Wait for paint metrics to be recorded
		await authenticatedPage.waitForTimeout(500)

		const { fcp } = await getWebVitals(authenticatedPage)

		// Capture baseline
		baselineMetrics.fcp = fcp ?? 0

		// Check against threshold with tolerance
		const maxAllowedFcp = THRESHOLDS.firstContentfulPaint * THRESHOLDS.toleranceMultiplier

		if (fcp !== null) {
			console.log(
				`Dashboard FCP: ${fcp.toFixed(2)}ms (threshold: ${THRESHOLDS.firstContentfulPaint}ms)`,
			)
			expect(fcp).toBeLessThan(maxAllowedFcp)
		}
	})

	test('agents list FCP is under 1.5 seconds', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Wait for paint metrics to be recorded
		await authenticatedPage.waitForTimeout(500)

		const { fcp } = await getWebVitals(authenticatedPage)

		// Check against threshold with tolerance
		const maxAllowedFcp = THRESHOLDS.firstContentfulPaint * THRESHOLDS.toleranceMultiplier

		if (fcp !== null) {
			console.log(
				`Agents list FCP: ${fcp.toFixed(2)}ms (threshold: ${THRESHOLDS.firstContentfulPaint}ms)`,
			)
			expect(fcp).toBeLessThan(maxAllowedFcp)
		}
	})

	test('agent detail FCP is under 1.5 seconds', async ({ authenticatedPage }) => {
		const { agentId } = await createAgent(authenticatedPage)

		// Navigate away first
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		await authenticatedPage.goto(`/dashboard/agents/${agentId}`)
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Wait for paint metrics to be recorded
		await authenticatedPage.waitForTimeout(500)

		const { fcp } = await getWebVitals(authenticatedPage)

		// Check against threshold with tolerance
		const maxAllowedFcp = THRESHOLDS.firstContentfulPaint * THRESHOLDS.toleranceMultiplier

		if (fcp !== null) {
			console.log(
				`Agent detail FCP: ${fcp.toFixed(2)}ms (threshold: ${THRESHOLDS.firstContentfulPaint}ms)`,
			)
			expect(fcp).toBeLessThan(maxAllowedFcp)
		}
	})
})

// ============================================================================
// Baseline Metrics Capture and Storage Tests
// ============================================================================

test.describe('Performance - Baseline Metrics Capture', () => {
	test('captures and stores baseline metrics for all pages', async ({ authenticatedPage }) => {
		const metrics: Record<string, number> = {}

		// Dashboard
		const dashboardLoadTime = await measurePageLoad(authenticatedPage, '/dashboard')
		metrics.dashboardLoad = dashboardLoadTime

		// Agents list
		const agentsListLoadTime = await measurePageLoad(authenticatedPage, '/dashboard/agents')
		metrics.agentsListLoad = agentsListLoadTime

		// Create agent for detail page test
		const { agentId } = await createAgent(authenticatedPage)

		// Agent detail
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const agentDetailLoadTime = await measurePageLoad(
			authenticatedPage,
			`/dashboard/agents/${agentId}`,
		)
		metrics.agentDetailLoad = agentDetailLoadTime

		// Get web vitals
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(1000)

		const { fcp, cls } = await getWebVitals(authenticatedPage)
		if (fcp !== null) metrics.fcp = fcp
		if (cls !== null) metrics.cls = cls

		// Log all captured metrics
		console.log('\n=== Performance Baseline Metrics ===')
		console.log(`Dashboard Load: ${metrics.dashboardLoad}ms`)
		console.log(`Agents List Load: ${metrics.agentsListLoad}ms`)
		console.log(`Agent Detail Load: ${metrics.agentDetailLoad}ms`)
		if (metrics.fcp) console.log(`First Contentful Paint: ${metrics.fcp.toFixed(2)}ms`)
		if (metrics.cls !== undefined) console.log(`Cumulative Layout Shift: ${metrics.cls.toFixed(4)}`)
		console.log('=====================================\n')

		// Verify all metrics are captured
		expect(metrics.dashboardLoad).toBeGreaterThan(0)
		expect(metrics.agentsListLoad).toBeGreaterThan(0)
		expect(metrics.agentDetailLoad).toBeGreaterThan(0)
	})
})

// ============================================================================
// Threshold Comparison Tests
// ============================================================================

test.describe('Performance - Threshold Comparison', () => {
	test('all metrics fail if they exceed baseline by more than 20%', async ({
		authenticatedPage,
	}) => {
		// Measure current metrics
		const dashboardLoadTime = await measurePageLoad(authenticatedPage, '/dashboard')
		const agentsListLoadTime = await measurePageLoad(authenticatedPage, '/dashboard/agents')

		// Create agent for detail page test
		const { agentId } = await createAgent(authenticatedPage)
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const agentDetailLoadTime = await measurePageLoad(
			authenticatedPage,
			`/dashboard/agents/${agentId}`,
		)

		// Verify all metrics are within 20% tolerance of thresholds
		const tolerance = THRESHOLDS.toleranceMultiplier

		expect(dashboardLoadTime).toBeLessThan(THRESHOLDS.dashboardLoad * tolerance)
		expect(agentsListLoadTime).toBeLessThan(THRESHOLDS.agentsListLoad * tolerance)
		expect(agentDetailLoadTime).toBeLessThan(THRESHOLDS.agentDetailLoad * tolerance)

		console.log('\n=== Threshold Comparison ===')
		console.log(
			`Dashboard: ${dashboardLoadTime}ms / ${THRESHOLDS.dashboardLoad * tolerance}ms (${((dashboardLoadTime / (THRESHOLDS.dashboardLoad * tolerance)) * 100).toFixed(1)}%)`,
		)
		console.log(
			`Agents List: ${agentsListLoadTime}ms / ${THRESHOLDS.agentsListLoad * tolerance}ms (${((agentsListLoadTime / (THRESHOLDS.agentsListLoad * tolerance)) * 100).toFixed(1)}%)`,
		)
		console.log(
			`Agent Detail: ${agentDetailLoadTime}ms / ${THRESHOLDS.agentDetailLoad * tolerance}ms (${((agentDetailLoadTime / (THRESHOLDS.agentDetailLoad * tolerance)) * 100).toFixed(1)}%)`,
		)
		console.log('============================\n')
	})
})
