import { chromium, type FullConfig } from '@playwright/test'

/**
 * Global setup that warms up all routes before running tests.
 * This ensures Next.js/Vite has compiled all pages and APIs are ready.
 */

// All routes to warm up
const ROUTES_TO_WARM = [
	// Auth pages
	'/sign-in',
	'/sign-up',
	// Dashboard pages
	'/dashboard',
	'/dashboard/agents',
	'/dashboard/agents/new',
	'/dashboard/agents/templates',
	'/dashboard/tools',
	'/dashboard/tools/new',
	'/dashboard/settings',
	'/dashboard/settings/api-keys',
	'/dashboard/analytics',
	// Landing page
	'/',
]

// API endpoints to warm up
const API_ENDPOINTS = ['/api/auth/session', '/api/rpc/workspaces/list', '/api/rpc/agents/list']

async function warmupRoutes(baseURL: string): Promise<void> {
	console.log('\n[Global Setup] Warming up routes...')
	const startTime = Date.now()

	const browser = await chromium.launch()
	const context = await browser.newContext()
	const page = await context.newPage()

	// Warm up each route
	for (const route of ROUTES_TO_WARM) {
		try {
			const url = `${baseURL}${route}`
			await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
			console.log(`  [OK] ${route}`)
		} catch (error) {
			console.log(`  [SKIP] ${route} - ${(error as Error).message.slice(0, 50)}`)
		}
	}

	// Warm up API endpoints with fetch
	for (const endpoint of API_ENDPOINTS) {
		try {
			const url = `${baseURL}${endpoint}`
			const response = await page.request.get(url, { timeout: 10000 })
			console.log(`  [API] ${endpoint} - ${response.status()}`)
		} catch (error) {
			console.log(`  [SKIP] ${endpoint} - ${(error as Error).message.slice(0, 50)}`)
		}
	}

	await browser.close()

	const duration = ((Date.now() - startTime) / 1000).toFixed(1)
	console.log(`[Global Setup] Route warmup complete in ${duration}s\n`)
}

export default async function globalSetup(config: FullConfig): Promise<void> {
	const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000'

	// Wait a bit for server to be fully ready
	await new Promise((resolve) => setTimeout(resolve, 2000))

	await warmupRoutes(baseURL)
}
