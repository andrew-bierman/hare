// Re-export CloudflareEnv for vitest pool workers
import type { CloudflareEnv } from '@hare/types'

// Type declaration for cloudflare:test module used by @cloudflare/vitest-pool-workers
declare module 'cloudflare:test' {
	export const env: CloudflareEnv
}

export {}
