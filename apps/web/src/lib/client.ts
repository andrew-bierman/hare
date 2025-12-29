import type { AppType } from '@hare/api'
import { clientEnv } from '@hare/config'
import { hc } from 'hono/client'

/**
 * Type-safe Hono RPC client
 */
export const client = hc<AppType>(typeof window !== 'undefined' ? '' : clientEnv.VITE_APP_URL)

export type Client = typeof client
