/**
 * Pages Layer
 *
 * Page-level UI components.
 * Following Feature-Sliced Design, pages compose widgets and features.
 */

// Dashboard pages (router-agnostic, use renderLink prop)
// These are for use in non-TanStack Router environments (e.g., Tauri app)
export {
	DashboardPage,
	DashboardHome,
	type DashboardHomeProps,
} from './dashboard'
export {
	AgentsPage as GenericAgentsPage,
	type AgentsPageProps,
	ToolsPage as GenericToolsPage,
	type ToolsPageProps,
	SettingsPage as GenericSettingsPage,
	type SettingsPageProps,
} from './dashboard'

// Agent pages (router-specific, use TanStack Router)
export { AgentsListPage, AgentCreatePage } from './agents'

// Settings pages (router-specific, use TanStack Router)
export { SettingsPage, ApiKeysPage, BillingPage, type BillingPageProps, TeamPage } from './settings'

// Tools pages (router-specific, use TanStack Router)
export { ToolsListPage } from './tools'

// Auth pages
export * from './auth'
