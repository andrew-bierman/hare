import { defineConfig } from 'tsup'

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		tools: 'src/tools.ts',
		types: 'src/types.ts',
		workers: 'src/workers.ts',
	},
	format: ['esm'],
	dts: true,
	clean: true,
	external: [
		'ai',
		'@ai-sdk/react',
		'@ai-sdk/provider-utils',
		'zod',
		'agents',
		'agents/mcp',
		'@modelcontextprotocol/sdk/server/mcp.js',
		'workers-ai-provider',
		'@cloudflare/workers-types',
	],
	platform: 'neutral',
	target: 'es2022',
})
