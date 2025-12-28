/**
 * Tool Entity
 *
 * Business entity for agent tools.
 * Following Feature-Sliced Design, this is the public API for the tool entity.
 */

// API hooks
export * from './api/hooks'

// Re-export types from shared for convenience
export type { CreateToolInput, Tool, ToolType } from '@shared/api'
