import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [react(), tailwindcss(), TanStackRouterVite()],
	resolve: {
		alias: {
			'@': '/src',
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
