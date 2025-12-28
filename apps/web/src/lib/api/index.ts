/**
 * API Re-exports
 *
 * This module re-exports the API from @hare/api package.
 * The API implementation has been moved to packages/api for better code organization.
 */

// Re-export everything from @hare/api
export * from '@hare/api'

// Also export the app directly for backwards compatibility
export { app, type AppType } from '@hare/api'
