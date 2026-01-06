/**
 * Shared API
 *
 * Central export point for all API types, schemas, and client.
 * Following Feature-Sliced Design, this is the public API for the api segment.
 */

// oRPC Client - type-safe API client
export { orpc, type AppRouterClient } from '@hare/api'

// API Hooks - all hooks and their types
export * from './hooks'

// All types and schemas from @hare/types
export * from '@hare/types'
