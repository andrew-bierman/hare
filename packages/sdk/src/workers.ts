/**
 * hare/workers - Workers-only agent exports
 *
 * These exports can ONLY be used in Cloudflare Workers context because they
 * depend on the 'cloudflare:workers' module for Durable Objects support.
 *
 * @example
 * ```ts
 * import { HareAgent, HareMcpAgent } from 'hare/workers'
 *
 * // Export the Durable Object classes in your worker
 * export { HareAgent, HareMcpAgent }
 *
 * export default {
 *   async fetch(request: Request, env: Env) {
 *     // Route to HareAgent
 *     const id = env.HARE_AGENT.idFromName('default')
 *     return env.HARE_AGENT.get(id).fetch(request)
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

// Re-export everything from main index (universal exports)
export * from './index'

// Workers-only agent classes
export { HareAgent, HareMcpAgent } from '@hare/agent/workers'
export type { HareAgentEnv, McpAgentEnv } from '@hare/agent/workers'
