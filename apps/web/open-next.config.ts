import { defineCloudflareConfig } from '@opennextjs/cloudflare'

export default defineCloudflareConfig({
	// Uncomment to enable R2 cache,
	// It should be imported as:
	// `import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";`
	// See https://opennext.js.org/cloudflare/caching for more details
	// incrementalCache: r2IncrementalCache,
})

// Re-export Durable Object classes for Cloudflare Agents
// These are required for the wrangler.jsonc durable_objects configuration
export { HareAgent } from './src/lib/agents/hare-agent'
export { HareMcpAgent } from './src/lib/agents/mcp-agent'
