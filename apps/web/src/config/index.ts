/**
 * Web-specific configuration
 *
 * Re-exports from @hare/config and adds web-specific env.
 */

export * from '@hare/config'
export { type ClientEnv, clientEnv } from 'web-app/lib/env/client'
export { type ServerEnv, serverEnv } from 'web-app/lib/env/server'
