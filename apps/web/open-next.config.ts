import { defineCloudflareConfig } from '@opennextjs/cloudflare'

export default defineCloudflareConfig({
	// Uncomment to enable R2 cache,
	// It should be imported as:
	// `import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";`
	// See https://opennext.js.org/cloudflare/caching for more details
	// incrementalCache: r2IncrementalCache,
})

// NOTE: Durable Object classes are exported from worker.ts instead
// This avoids the "Could not resolve cloudflare:workers" error during OpenNext bundling
// See: https://opennext.js.org/cloudflare/howtos/custom-worker
