import { hc } from 'hono/client'
import type { AppType } from './api'

/**
 * Type-safe Hono RPC client
 */
export const client = hc<AppType>(
	typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
)

export type Client = typeof client
