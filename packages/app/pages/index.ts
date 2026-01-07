/**
 * Pages Layer
 *
 * Page-level UI components using TanStack Router.
 * All pages use TanStack Router directly (Link, useNavigate, etc.)
 */

// Dashboard
export { DashboardPage, UsagePage, AnalyticsPage } from './dashboard'

// Agents
export {
	AgentsListPage,
	AgentCreatePage,
	AgentTemplatesPage,
	AgentPlaygroundPage,
	type AgentPlaygroundPageProps,
	AgentWebhooksPage,
	type AgentWebhooksPageProps,
	AgentDetailPage,
	type AgentDetailPageProps,
} from './agents'

// Tools
export { ToolsListPage, ToolCreatePage, ToolDetailPage, type ToolDetailPageProps } from './tools'

// Settings
export { SettingsPage, ApiKeysPage, BillingPage, type BillingPageProps, TeamPage } from './settings'

// Auth
export * from './auth'
