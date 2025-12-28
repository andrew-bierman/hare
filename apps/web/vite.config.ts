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
			// @hare/app package aliases - specific subpaths must come before wildcards
			'@hare/app/widgets/agent-builder': path.join(appPackagePath, 'widgets/agent-builder/index.ts'),
			'@hare/app/widgets/chat-interface': path.join(appPackagePath, 'widgets/chat-interface/index.ts'),
			'@hare/app/widgets/memory-viewer': path.join(appPackagePath, 'widgets/memory-viewer/index.ts'),
			'@hare/app/widgets/scheduled-tasks': path.join(appPackagePath, 'widgets/scheduled-tasks/index.ts'),
			'@hare/app/widgets/tool-picker': path.join(appPackagePath, 'widgets/tool-picker/index.ts'),
			'@hare/app/widgets/workspace-switcher': path.join(appPackagePath, 'widgets/workspace-switcher/index.ts'),
			'@hare/app/widgets/user-nav': path.join(appPackagePath, 'widgets/user-nav/index.ts'),
			'@hare/app/widgets': path.join(appPackagePath, 'widgets/index.ts'),
			'@hare/app/shared/api': path.join(appPackagePath, 'shared/api/index.ts'),
			'@hare/app/shared/config': path.join(appPackagePath, 'shared/config/index.ts'),
			'@hare/app/shared/lib': path.join(appPackagePath, 'shared/lib/index.ts'),
			'@hare/app/shared': path.join(appPackagePath, 'shared/index.ts'),
			'@hare/app/pages': path.join(appPackagePath, 'pages/index.ts'),
			'@hare/app/app': path.join(appPackagePath, 'app/index.ts'),
			'@hare/app/providers': path.join(appPackagePath, 'app/providers/index.ts'),
			// FSD path aliases for @hare/app internal imports
			'@app': path.join(appPackagePath, 'app'),
			'@pages': path.join(appPackagePath, 'pages'),
			'@widgets': path.join(appPackagePath, 'widgets'),
			'@shared': path.join(appPackagePath, 'shared'),
		},
	},
	plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }), tailwindcss(), tanstackStart()],
})
