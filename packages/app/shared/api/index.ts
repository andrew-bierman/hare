/**
 * Shared API
 *
 * Central export point for all API types, schemas, and client.
 * Following Feature-Sliced Design, this is the public API for the api segment.
 */

// API Client - re-exported from @hare/api-client
export * from '@hare/api-client'

// API Hooks - all hooks and their types
// Note: hooks/use-api-keys.ts defines local ApiKey/ApiKeyWithSecret types that extend the base types
// These are used internally by the hooks but not re-exported to avoid conflicts with @hare/types
export * from './hooks'

// All types and schemas from @hare/types
// The @hare/types versions are the canonical API schema types
export * from '@hare/types'
