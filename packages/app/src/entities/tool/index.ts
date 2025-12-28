/**
 * Tool Entity
 *
 * Business entity for agent tools.
 * Following Feature-Sliced Design, this is the public API for the tool entity.
 */

// API hooks
export * from './api/hooks'

// Re-export types for convenience
export type { Tool, CreateToolInput } from '@shared/api'
