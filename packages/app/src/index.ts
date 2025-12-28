/**
 * @hare/app - Feature-Sliced Design Frontend Package
 *
 * This package organizes frontend code following Feature-Sliced Design (FSD) methodology.
 * FSD splits the app into responsibility-based layers:
 *
 * - app/     - Application-level setup (providers, routing)
 * - pages/   - Page-level UI components
 * - widgets/ - Large self-contained UI blocks (sidebar, header)
 * - features/ - User-facing functionality (auth, chat, billing)
 * - entities/ - Business domain models (agent, workspace, tool)
 * - shared/  - Reusable infrastructure (api, config, lib, ui)
 *
 * Import rules:
 * - Each layer can only depend on layers below it
 * - app -> pages -> widgets -> features -> entities -> shared
 */

// App layer - Application providers and setup
export * from './app'

// Pages layer - Page components (route-specific, kept in apps/web)
// export * from './pages'

// Widgets layer - Self-contained UI blocks
export * from './widgets'

// Features layer - User interactions
export * from './features'

// Entities layer - Business domain models
export * from './entities'

// Shared layer - Reusable code
export * from './shared'
