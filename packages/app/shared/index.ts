/**
 * Shared Layer
 *
 * The shared layer contains reusable code that is used across the application.
 * This includes API types, configuration, and utilities.
 *
 * Following Feature-Sliced Design, segments are organized by technical purpose:
 * - api: API types, schemas, and client utilities
 * - config: Application configuration and constants
 * - lib: Shared utilities and hooks
 *
 * Note: UI components should be imported directly from @hare/ui
 */

// API types and schemas
export * from './api'

// Configuration
export * from './config'

// Library utilities
export * from './lib'
