import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

// Resolve the path to @hare/app package for FSD aliases
const appPackagePath = path.resolve(__dirname, '../../packages/app/src')

export default defineConfig({
	plugins: [react(), tailwindcss(), TanStackRouterVite()],
	resolve: {
		alias: {
			'@': '/src',
			// FSD path aliases for @hare/app package
			'@app': path.join(appPackagePath, 'app'),
			'@pages': path.join(appPackagePath, 'pages'),
			'@widgets': path.join(appPackagePath, 'widgets'),
			'@features': path.join(appPackagePath, 'features'),
			'@entities': path.join(appPackagePath, 'entities'),
			'@shared': path.join(appPackagePath, 'shared'),
			// UI package aliases - order matters, more specific first
			'@workspace/ui/': path.resolve(__dirname, '../../packages/ui/src') + '/',
			'@workspace/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
		},
	},
	// Tauri expects a fixed port during development
	server: {
		port: 1420,
		strictPort: true,
	},
	// Build output for Tauri
	build: {
		outDir: 'dist',
		emptyOutDir: true,
	},
	// Environment variables
	envPrefix: ['VITE_'],
})
