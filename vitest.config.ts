import path from 'node:path'
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
	resolve: {
		alias: {
			'web-app': path.resolve(__dirname, './apps/web/src'),
			'@workspace/ui': path.resolve(__dirname, './packages/ui/src'),
		},
	},
	test: {
		globals: true,
		include: ['apps/**/*.test.ts', 'packages/**/*.test.ts'],
		exclude: [
			'node_modules/**',
			'**/node_modules/**',
			'e2e/**',
			'.next/**',
			'**/e2e/**',
			'**/*.spec.ts',
		],
		poolOptions: {
			workers: {
				miniflare: {
					// Add minimal test bindings for Cloudflare Workers
					bindings: {
						ENVIRONMENT: 'test',
						BETTER_AUTH_SECRET: 'test-secret-for-tests-min-32-chars-long',
						BETTER_AUTH_URL: 'http://localhost:3000',
						NEXTJS_ENV: 'test',
					},
					// Configure D1 database for tests
					d1Databases: ['DB'],
					// Configure KV namespace for tests
					kvNamespaces: ['KV'],
				},
			},
		},
	},
})
