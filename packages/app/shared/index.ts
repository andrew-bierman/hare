/**
 * Shared Layer
 *
 * The shared layer contains reusable code that is used across the application.
 * This includes API types and utilities.
 *
 * Following Feature-Sliced Design, segments are organized by technical purpose:
 * - api: API types, schemas, and client utilities
 * - lib: Shared utilities and hooks
 *
 * Note: UI components should be imported directly from @hare/ui
 * Note: Configuration should be imported directly from @hare/config
 */

// API types and schemas
export * from './api'

// Library utilities
export * from './lib'
