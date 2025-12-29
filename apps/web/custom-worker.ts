/**
 * Custom Cloudflare Worker Entry Point
 *
 * This file wraps the OpenNext-generated worker and exports custom Durable Objects.
 * See: https://opennext.js.org/cloudflare/howtos/custom-worker
 *
 * The custom Durable Objects are bundled separately by wrangler, which natively
 * handles the `cloudflare:workers` import.
 */

// @ts-expect-error - .open-next/worker.js is generated at build time
import handler from './.open-next/worker.js'

// Re-export the default handler
export default handler

// Export custom Durable Objects for Cloudflare Agents
export { HareAgent, HareMcpAgent } from '@hare/agent/workers'
// Re-export OpenNext's internal Durable Objects (required for caching)
// @ts-expect-error - .open-next/worker.js is generated at build time
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from './.open-next/worker.js'
