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
		include: ['apps/**/*.test.ts'],
		exclude: [
			'node_modules/**',
			'**/node_modules/**',
			'**/e2e/**',
			'**/*.spec.ts',
			'.next/**',
			'packages/**',
		],
		pool: '@cloudflare/vitest-pool-workers',
		poolOptions: {
			workers: {
				miniflare: {
					// Add test bindings for Cloudflare Workers
					bindings: {
						ENVIRONMENT: 'test',
						BETTER_AUTH_SECRET: 'test-secret-for-tests-min-32-chars-long',
						BETTER_AUTH_URL: 'http://localhost:3000',
						NEXTJS_ENV: 'test',
					},
					// Configure D1 databases for tests
					d1Databases: {
						DB: 'test-db',
					},
					// Configure KV namespaces for tests
					kvNamespaces: {
						KV: 'test-kv',
					},
				},
			},
		},
	},
})
