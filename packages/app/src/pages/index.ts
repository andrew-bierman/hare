/**
 * Pages Layer
 *
 * Page-level components for routing.
 * Following Feature-Sliced Design, this layer contains full page components.
 *
 * These are framework-agnostic page components that can be used by any app.
 * Each app wraps them with their own route definitions.
 */

// Dashboard pages
export { DashboardHome, type DashboardHomeProps } from './dashboard/dashboard-home'
export { AgentsPage, type AgentsPageProps } from './dashboard/agents-page'
export { ToolsPage, type ToolsPageProps } from './dashboard/tools-page'
export { SettingsPage, type SettingsPageProps } from './dashboard/settings-page'
