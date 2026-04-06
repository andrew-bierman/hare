/**
 * Shared API
 *
 * Central export point for all API types, schemas, and client.
 * Following Feature-Sliced Design, this is the public API for the api segment.
 */

// Eden Treaty Client - type-safe API client
export { type App, api, getWorkspaceId, setWorkspaceId } from '@hare/api/client'
// All types and schemas from @hare/types
export * from '@hare/types'
// API Hooks - all hooks and their types
export * from './hooks'
