/**
 * @hare/agent/workers - Workers-only agent exports
 *
 * These exports can ONLY be used in Cloudflare Workers context because they
 * depend on the 'cloudflare:workers' module for Durable Objects support.
 *
 * @example
 * ```ts
 * import { HareAgent, HareMcpAgent } from '@hare/agent/workers'
 *
 * // Export the Durable Object classes
 * export { HareAgent, HareMcpAgent }
 *
 * export default {
 *   async fetch(request: Request, env: Env) {
 *     const id = env.HARE_AGENT.idFromName('default')
 *     return env.HARE_AGENT.get(id).fetch(request)
 *   }
 * }
 * ```
 */

// Re-export everything from main index
export * from './index'

// Workers-only exports
export { HareAgent, type HareAgentEnv } from './hare-agent'
export { HareMcpAgent, type McpAgentEnv } from './mcp-agent'
