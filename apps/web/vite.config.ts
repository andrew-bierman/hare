import path from 'node:path'
import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	server: {
		port: 3000,
	},
	resolve: {
		alias: {
			'web-app': path.resolve(__dirname, './src'),
			'@workspace/ui': path.resolve(__dirname, '../../packages/ui/src'),
		},
	},
	plugins: [
		cloudflare({ viteEnvironment: { name: 'ssr' } }),
		tailwindcss(),
		tanstackStart(),
	],
})
