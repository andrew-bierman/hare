import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Read port from worktree config if available
function getWorktreePort(): number | null {
	const configPath = resolve(__dirname, '../../.worktree-config')
	if (existsSync(configPath)) {
		const content = readFileSync(configPath, 'utf-8')
		const match = content.match(/^PORT=(\d+)/m)
		if (match?.[1]) return Number.parseInt(match[1], 10)
	}
	return null
}

// Port configuration - prioritize: PORT env var > worktree config > default 3000
const DEFAULT_PORT = process.env.PORT
	? Number.parseInt(process.env.PORT, 10)
	: (getWorktreePort() ?? 3000)

export default defineConfig({
	testDir: './e2e',
	testMatch: '**/*.e2e.ts',
	// Global setup warms up all routes before tests run to avoid cold start timeouts
	globalSetup: './e2e/global-setup.ts',
	fullyParallel: false, // Run tests sequentially to avoid race conditions
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 1,
	workers: 1, // Single worker to avoid SQLite database locking issues
	reporter: 'html',
	timeout: 60000, // 60 second timeout per test (reduced since routes are warmed up)
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
		// Pass PORT and E2E/CI vars to dev server to use local-only wrangler config
		command: process.env.CI
			? `E2E=true CI=true CLOUDFLARE_ENVIRONMENT=local PORT=${DEFAULT_PORT} bun run dev`
			: `E2E=true CI=true PORT=${DEFAULT_PORT} bun run dev`,
		url: `http://localhost:${DEFAULT_PORT}`,
		// Reuse existing server locally; in CI always start fresh
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
		// Ignore HTTPS certificate errors during tests
		ignoreHTTPSErrors: true,
	},
})
