import type { AppType } from '@hare/api'
import { hc } from 'hono/client'
import { clientEnv } from 'web-app/lib/env/client'

/**
 * Type-safe Hono RPC client
 */
export const client = hc<AppType>(typeof window !== 'undefined' ? '' : clientEnv.VITE_APP_URL)

export type Client = typeof client
