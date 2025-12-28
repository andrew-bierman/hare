/**
 * Dashboard Pages
 *
 * Main dashboard page components.
 */

export * from './DashboardPage'
export * from './dashboard-home'

// Router-agnostic page components (use renderLink prop)
// These are the proper exports for use with any router
export { AgentsPage, type AgentsPageProps } from './agents-page'
export { ToolsPage, type ToolsPageProps } from './tools-page'
export { SettingsPage, type SettingsPageProps } from './settings-page'
