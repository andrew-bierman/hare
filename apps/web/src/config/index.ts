/**
 * Centralized application configuration
 *
 * Re-export all configuration from @hare/app package.
 * This file exists for backward compatibility.
 */

// Re-export everything from the shared config
export * from '@hare/app/shared'
export { type ClientEnv, clientEnv } from 'web-app/lib/env/client'
// Re-export the env from local paths since they depend on server-only code
export { type ServerEnv, serverEnv } from 'web-app/lib/env/server'
