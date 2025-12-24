import { defineConfig, devices } from '@playwright/test'

// Detect which port the dev server is running on
async function detectPort(): Promise<number> {
	const ports = [3000, 3001]

	for (const port of ports) {
		try {
			const response = await fetch(`http://localhost:${port}`)
			if (response.ok || response.status < 500) {
				console.log(`Detected dev server on port ${port}`)
				return port
			}
		} catch {
			// Port not available, try next
		}
	}

	// Default to 3000 if no server detected
	return 3000
}

// Try to detect the port synchronously for web server config
const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000

export default defineConfig({
	testDir: './e2e',
	testMatch: '**/*.e2e.ts',
	fullyParallel: false, // Run tests sequentially to avoid race conditions
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 1,
	workers: 1, // Single worker to avoid SQLite database locking issues
	reporter: 'html',
	timeout: 60000, // 60 second timeout per test
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
		// Try multiple ports if the default fails
		ignoreHTTPSErrors: true,
	},
})
