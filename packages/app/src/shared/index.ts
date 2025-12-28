/**
 * Shared Layer
 *
 * The shared layer contains reusable code that is used across the application.
 * This includes API types, configuration, utilities, and UI components.
 *
 * Following Feature-Sliced Design, segments are organized by technical purpose:
 * - api: API types, schemas, and client utilities
 * - config: Application configuration and constants
 * - lib: Shared utilities and hooks
 * - ui: Shared UI components (re-exported from @workspace/ui)
 */

// API types and schemas
export * from './api'

// Configuration
export * from './config'

// Library utilities
export * from './lib'

// UI components (re-exported from @workspace/ui)
export * from './ui'
