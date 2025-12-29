/**
 * Pages Layer
 *
 * Page-level UI components using TanStack Router.
 * All pages use TanStack Router directly (Link, useNavigate, etc.)
 */

// Dashboard
export { DashboardPage } from './dashboard'

// Agents
export { AgentsListPage, AgentCreatePage, AgentsPage } from './agents'

// Tools
export { ToolsListPage, ToolsPage } from './tools'

// Settings
export { SettingsPage, ApiKeysPage, BillingPage, type BillingPageProps, TeamPage } from './settings'

// Auth
export * from './auth'
