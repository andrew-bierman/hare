/**
 * Type declarations for cloudflare:test module
 * Used by @cloudflare/vitest-pool-workers
 */
import type { CloudflareEnv } from './cloudflare'

declare module 'cloudflare:test' {
	export const env: CloudflareEnv
}
