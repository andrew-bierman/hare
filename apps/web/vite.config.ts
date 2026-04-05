import path from 'node:path'
import { cloudflare } from '@cloudflare/vite-plugin'
import mdx from '@mdx-js/rollup'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import rehypeHighlight from 'rehype-highlight'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// Resolve paths to workspace packages
const packagesPath = path.resolve(__dirname, '../../packages')
const appPackagePath = path.join(packagesPath, 'app')

export default defineConfig({
	server: {
		port: Number(process.env.PORT) || 3000,
	},
	ssr: {
		optimizeDeps: {
			// Pre-bundle these deps for SSR to avoid mid-reload issues
			include: ['agents', 'agents/mcp', 'ai', '@modelcontextprotocol/sdk/server/mcp.js'],
			// Wait for full dependency discovery before serving to avoid mid-request rebuilds
			holdUntilCrawlEnd: true,
		},
	},
	optimizeDeps: {
		// Pre-bundle the same deps for client-side
		include: ['agents', 'agents/mcp', 'ai', '@modelcontextprotocol/sdk/server/mcp.js'],
	},
	resolve: {
		alias: {
			'web-app': path.resolve(__dirname, './src'),
			// Core packages - subpaths must come before main paths
			'@hare/db/schema': path.join(packagesPath, 'db/src/schema/index.ts'),
			'@hare/db': path.join(packagesPath, 'db/src/index.ts'),
			'@hare/agent/workers': path.join(packagesPath, 'agent/src/workers.ts'),
			'@hare/agent': path.join(packagesPath, 'agent/src/index.ts'),
			'@hare/config': path.join(packagesPath, 'config/src/index.ts'),
			'@hare/tools': path.join(packagesPath, 'tools/src/index.ts'),
			'@hare/types': path.join(packagesPath, 'types/src/index.ts'),
			'@hare/api': path.join(packagesPath, 'api/src/index.ts'),
			'@hare/auth/client': path.join(packagesPath, 'auth/src/client.ts'),
			'@hare/auth/server': path.join(packagesPath, 'auth/src/server.ts'),
			'@hare/auth': path.join(packagesPath, 'auth/src/index.ts'),
			'@hare/ui': path.join(packagesPath, 'ui/src'),
			// @hare/app package aliases - specific subpaths must come before wildcards
			'@hare/app/widgets/agent-builder': path.join(
				appPackagePath,
				'widgets/agent-builder/index.ts',
			),
			'@hare/app/widgets/chat-interface': path.join(
				appPackagePath,
				'widgets/chat-interface/index.ts',
			),
			'@hare/app/widgets/memory-viewer': path.join(
				appPackagePath,
				'widgets/memory-viewer/index.ts',
			),
			'@hare/app/widgets/scheduled-tasks': path.join(
				appPackagePath,
				'widgets/scheduled-tasks/index.ts',
			),
			'@hare/app/widgets/tool-picker': path.join(appPackagePath, 'widgets/tool-picker/index.ts'),
			'@hare/app/widgets/workspace-switcher': path.join(
				appPackagePath,
				'widgets/workspace-switcher/index.ts',
			),
			'@hare/app/widgets/user-nav': path.join(appPackagePath, 'widgets/user-nav/index.ts'),
			'@hare/app/widgets/router-components': path.join(
				appPackagePath,
				'widgets/router-components/index.ts',
			),
			'@hare/app/widgets': path.join(appPackagePath, 'widgets/index.ts'),
			'@hare/app/shared/api': path.join(appPackagePath, 'shared/api/index.ts'),
			'@hare/app/shared/config': path.join(appPackagePath, 'shared/config/index.ts'),
			'@hare/app/shared/lib': path.join(appPackagePath, 'shared/lib/index.ts'),
			'@hare/app/shared': path.join(appPackagePath, 'shared/index.ts'),
			'@hare/app/pages': path.join(appPackagePath, 'pages/index.ts'),
			'@hare/app/app': path.join(appPackagePath, 'app/index.ts'),
			'@hare/app/providers': path.join(appPackagePath, 'app/providers/index.ts'),
		},
	},
	plugins: [
		tsconfigPaths(),
		// MDX support with frontmatter extraction
		mdx({
			remarkPlugins: [remarkGfm, remarkFrontmatter, remarkMdxFrontmatter],
			rehypePlugins: [rehypeHighlight],
			providerImportSource: '@mdx-js/react',
		}),
		// Cloudflare plugin - use local config only for E2E tests (not deploy)
		cloudflare({
			viteEnvironment: { name: 'ssr' },
			...(process.env.CI === 'true' &&
				process.env.E2E === 'true' && {
					configPath: './wrangler.e2e.jsonc',
					persist: false,
					remoteBindings: false,
				}),
		}),
		tanstackStart(),
		react(),
		tailwindcss(),
	],
})
