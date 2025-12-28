/**
 * Shared UI
 *
 * Re-exports UI components from @workspace/ui package.
 * Following Feature-Sliced Design, this provides a consistent import path.
 */

// Re-export all UI components from the shared UI package
export * from '@workspace/ui'

// Tables - Reusable table components built on TanStack Table
export * from './tables'

// Forms - Reusable form components built on TanStack Form
export * from './forms'
