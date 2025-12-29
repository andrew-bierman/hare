/**
 * Shared API
 *
 * Central export point for all API types, schemas, and client.
 * Following Feature-Sliced Design, this is the public API for the api segment.
 */

// All types and schemas - re-exported from @hare/types
export * from '@hare/types'

// API Client
export * from './client'

// API Hooks
export * from './hooks'
