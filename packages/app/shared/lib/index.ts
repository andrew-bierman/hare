/**
 * Shared Library
 *
 * Central export point for all shared utilities.
 * Following Feature-Sliced Design, this is the public API for the lib segment.
 */

// Hooks
export { useDebouncedCallback, useDebouncedValue } from './hooks'

// Utilities (from shared @hare/utilities)
export { generateUniqueSlug, nameToSlug } from '@hare/utilities'
export { exportToCSV, exportToJSON } from './export'

// TanStack utilities
export * from './tanstack'
