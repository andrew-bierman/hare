/**
 * Shared Library
 *
 * Central export point for all shared utilities.
 * Following Feature-Sliced Design, this is the public API for the lib segment.
 */

// Hooks
export { useDebouncedCallback, useDebouncedValue } from './hooks'

// Utilities (from shared @hare/utils)
export { generateUniqueSlug, nameToSlug } from '@hare/utils'
export { exportToCSV, exportToJSON } from './export'

// TanStack utilities
export * from './tanstack'
