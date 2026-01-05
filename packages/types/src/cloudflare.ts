/**
 * Cloudflare Environment Bindings
 *
 * Type definitions for Cloudflare Workers bindings.
 * Keep in sync with wrangler.jsonc bindings.
 */

import type { RateLimitBinding } from '@elithrar/workers-hono-rate-limit'

/**
 * Cloudflare environment bindings interface.
 * Defines all bindings available in the Workers runtime.
 */
export interface CloudflareEnv {
	// KV Namespace
	KV: KVNamespace
	// R2 Bucket
	R2: R2Bucket
	// D1 Database
	DB: D1Database
	// Workers AI
	AI: Ai
	// Vectorize for semantic search / vector memory
	VECTORIZE: VectorizeIndex
	// Static assets
	ASSETS: Fetcher
	// Self-reference for caching
	WORKER_SELF_REFERENCE: Fetcher
	// Durable Objects for CF Agents
	HARE_AGENT: DurableObjectNamespace
	MCP_AGENT: DurableObjectNamespace
	// Rate Limiters
	RATE_LIMITER: RateLimitBinding
	RATE_LIMITER_STRICT: RateLimitBinding
	RATE_LIMITER_CHAT: RateLimitBinding
	// Environment variables
	ENVIRONMENT: string
	NODE_ENV?: string
	APP_URL?: string
	// Auth
	BETTER_AUTH_SECRET: string
	BETTER_AUTH_URL: string
	// Stripe billing
	STRIPE_SECRET_KEY: string
	STRIPE_WEBHOOK_SECRET: string
}
