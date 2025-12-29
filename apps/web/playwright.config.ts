import { defineConfig, devices } from '@playwright/test'

// Port configuration - use PORT env var or default to 3000
const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000

export default defineConfig({
	testDir: './e2e',
	testMatch: '**/*.e2e.ts',
	fullyParallel: false, // Run tests sequentially to avoid race conditions
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 1,
	workers: 1, // Single worker to avoid SQLite database locking issues
	reporter: 'html',
	timeout: 120000, // 120 second timeout per test (fixture setup can take time)
	use: {
		baseURL: process.env.BASE_URL || `http://localhost:${DEFAULT_PORT}`,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		actionTimeout: 15000, // 15 second timeout for actions
		navigationTimeout: 30000, // 30 second timeout for navigation
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: {
		command: 'bun run dev',
		url: `http://localhost:${DEFAULT_PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
		// Ignore HTTPS certificate errors during tests
		ignoreHTTPSErrors: true,
	},
})
