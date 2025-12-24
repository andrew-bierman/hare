/**
 * Custom Worker Entry Point
 *
 * This file serves as the main entry point for the Cloudflare Worker.
 * It re-exports the OpenNext handler and Durable Object classes.
 *
 * Wrangler will bundle this file directly, which properly handles
 * the cloudflare:workers imports used by the agents package.
 */

// Re-export the OpenNext fetch handler
// @ts-expect-error - OpenNext generates this file at build time
export { default } from './.open-next/worker.js'

// Re-export Durable Object classes for Cloudflare Agents
// These must be exported from the main worker entry for wrangler to find them
export { HareAgent } from './src/lib/agents/hare-agent'
export { HareMcpAgent } from './src/lib/agents/mcp-agent'
