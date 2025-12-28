import path from 'node:path'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'

// Resolve the path to @hare/app package for FSD aliases
const appPackagePath = path.resolve(__dirname, '../../packages/app/src')

export default defineConfig({
	server: {
		port: 3000,
	},
	resolve: {
		alias: {
			'web-app': path.resolve(__dirname, './src'),
			'@workspace/ui': path.resolve(__dirname, '../../packages/ui/src'),
			// @hare/app package aliases
			'@hare/app/pages': path.join(appPackagePath, 'pages/index.ts'),
			'@hare/app/app': path.join(appPackagePath, 'app/index.ts'),
			'@hare/app/entities': path.join(appPackagePath, 'entities/index.ts'),
			'@hare/app/features': path.join(appPackagePath, 'features/index.ts'),
			'@hare/app/widgets': path.join(appPackagePath, 'widgets/index.ts'),
			'@hare/app/shared': path.join(appPackagePath, 'shared/index.ts'),
			// FSD path aliases for @hare/app internal imports
			'@app': path.join(appPackagePath, 'app'),
			'@pages': path.join(appPackagePath, 'pages'),
			'@widgets': path.join(appPackagePath, 'widgets'),
			'@features': path.join(appPackagePath, 'features'),
			'@entities': path.join(appPackagePath, 'entities'),
			'@shared': path.join(appPackagePath, 'shared'),
		},
	},
	plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }), tailwindcss(), tanstackStart()],
})
