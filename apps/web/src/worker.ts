/**
 * Cloudflare Worker Entry Point
 *
 * NOTE: This file is NOT the actual worker entry point.
 * OpenNext generates the worker at `.open-next/worker.js`.
 *
 * Durable Object classes are exported from `open-next.config.ts`
 * which OpenNext uses to include them in the generated worker.
 *
 * This file exists for local development reference only.
 * @see open-next.config.ts for the actual Durable Object exports
 */

// Re-export for type checking and development reference
export type { HareAgent, HareMcpAgent } from '@hare/agent/workers'
