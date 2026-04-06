/**
 * Shared API
 *
 * Central export point for all API types, schemas, and client.
 * Following Feature-Sliced Design, this is the public API for the api segment.
 */

// oRPC Client - type-safe API client
export { type AppRouterClient, orpc } from '@hare/api'
// All types and schemas from @hare/types
export * from '@hare/types'
// API Hooks - all hooks and their types
export * from './hooks'
