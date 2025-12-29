import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'

// Resolve paths to workspace packages
const appPackagePath = path.resolve(__dirname, '../../packages/app')

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
			// @hare/app package aliases - directory aliases with trailing slash for deep imports
			'@hare/app/widgets/': `${path.join(appPackagePath, 'widgets')}/`,
			'@hare/app/pages/': `${path.join(appPackagePath, 'pages')}/`,
			'@hare/app/shared/': `${path.join(appPackagePath, 'shared')}/`,
			'@hare/app/app/': `${path.join(appPackagePath, 'app')}/`,
			// @hare/app package aliases - index exports
			'@hare/app/shared/api': path.join(appPackagePath, 'shared/api/index.ts'),
			'@hare/app/shared/lib': path.join(appPackagePath, 'shared/lib/index.ts'),
			'@hare/app/shared': path.join(appPackagePath, 'shared/index.ts'),
			'@hare/app/providers': path.join(appPackagePath, 'app/providers/index.ts'),
			'@hare/app/pages': path.join(appPackagePath, 'pages/index.ts'),
			'@hare/app/app': path.join(appPackagePath, 'app/index.ts'),
			'@hare/app/widgets': path.join(appPackagePath, 'widgets/index.ts'),
			'@hare/app': path.join(appPackagePath, 'index.ts'),
			// @hare/config package alias
			'@hare/config': path.resolve(__dirname, '../../packages/hare-config/src/index.ts'),
			// UI package aliases
			'@hare/ui/': `${path.resolve(__dirname, '../../packages/ui/src')}/`,
			'@hare/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
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
