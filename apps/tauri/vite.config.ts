import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'

// Resolve the path to @hare/app package for FSD aliases
const appPackagePath = path.resolve(__dirname, '../../packages/app/src')

export default defineConfig({
	plugins: [
		tailwindcss(),
		tanstackStart({
			// SPA mode for Tauri - no SSR needed
			spa: {
				enabled: true,
			},
			// Static target for desktop app
			target: 'static',
		}),
	],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			// @hare/app package aliases
			'@hare/app/pages': path.join(appPackagePath, 'pages/index.ts'),
			'@hare/app/app': path.join(appPackagePath, 'app/index.ts'),
			'@hare/app/widgets': path.join(appPackagePath, 'widgets/index.ts'),
			'@hare/app/shared': path.join(appPackagePath, 'shared/index.ts'),
			// FSD path aliases for @hare/app internal imports
			'@app': path.join(appPackagePath, 'app'),
			'@pages': path.join(appPackagePath, 'pages'),
			'@widgets': path.join(appPackagePath, 'widgets'),
			'@shared': path.join(appPackagePath, 'shared'),
			// UI package aliases
			'@workspace/ui/': `${path.resolve(__dirname, '../../packages/ui/src')}/`,
			'@workspace/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
		},
	},
	// Tauri expects a fixed port during development
	server: {
		port: 1420,
		strictPort: true,
	},
	// Environment variables
	envPrefix: ['VITE_'],
})
