/**
 * @hare/app - Feature-Sliced Design Frontend Package
 *
 * This package organizes frontend code following Feature-Sliced Design (FSD) methodology.
 * FSD splits the app into responsibility-based layers:
 *
 * - app/     - Application-level setup (providers, routing)
 * - pages/   - Page-level UI components
 * - widgets/ - Large self-contained UI blocks (sidebar, header)
 * - shared/  - Reusable infrastructure (api, config, lib, ui)
 *
 * Import rules:
 * - Each layer can only depend on layers below it
 * - app -> pages -> widgets -> shared
 *
 * Note: Feature-specific hooks are implemented in apps/web/src/lib/api/hooks
 * and use the centralized API client from @hare/api.
 */

// App layer - Application providers and setup
export * from './app'

// Pages layer - Page components
export * from './pages'

// Widgets layer - Self-contained UI blocks
export * from './widgets'

// Features layer - Feature modules
export * from './features/auth'
export * from './features/create-agent'
export * from './features/create-tool'
// Note: memory hooks are exported from shared/api/hooks

// Shared layer - Reusable code
export * from './shared'
