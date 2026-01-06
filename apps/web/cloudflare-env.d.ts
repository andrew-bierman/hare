/// <reference types="@cloudflare/workers-types" />

import type { CloudflareEnv } from '@hare/types'

// Type declaration for cloudflare:test module used by @cloudflare/vitest-pool-workers
declare module 'cloudflare:test' {
	export const env: CloudflareEnv
}
