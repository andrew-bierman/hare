/**
 * API module re-exports from @hare/api package.
 *
 * The actual API implementation lives in packages/hare-api.
 * This file provides backward compatibility for existing imports.
 */

// Re-export everything from @hare/api
export * from '@hare/api'

// Re-export the app (for backward compatibility with existing imports)
export { type AppType, app } from '@hare/api'
