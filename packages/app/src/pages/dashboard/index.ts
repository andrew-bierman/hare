/**
 * Dashboard Pages
 *
 * Main dashboard page components.
 */

export * from './DashboardPage'
export * from './dashboard-home'

// Router-agnostic page components (use renderLink prop)
// Export with "Generic" suffix to avoid conflicts with router-specific pages
export { AgentsPage as GenericAgentsPage, type AgentsPageProps } from './agents-page'
export { ToolsPage as GenericToolsPage, type ToolsPageProps } from './tools-page'
export { SettingsPage as GenericSettingsPage, type SettingsPageProps } from './settings-page'
