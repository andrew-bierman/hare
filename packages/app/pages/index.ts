/**
 * Pages Layer
 *
 * Page-level UI components using TanStack Router.
 * All pages use TanStack Router directly (Link, useNavigate, etc.)
 */

// Agents
export {
	AgentConversationsPage,
	type AgentConversationsPageProps,
	AgentCreatePage,
	AgentDetailPage,
	type AgentDetailPageProps,
	AgentPlaygroundPage,
	type AgentPlaygroundPageProps,
	AgentsListPage,
	AgentTemplatesPage,
	AgentWebhooksPage,
	type AgentWebhooksPageProps,
} from './agents'
// Auth
export * from './auth'
// Dashboard
export { AnalyticsPage, DashboardPage, UsagePage } from './dashboard'

// Settings
export {
	ApiKeysPage,
	AuditLogsPage,
	BillingPage,
	type BillingPageProps,
	SettingsPage,
	TeamPage,
} from './settings'
// Tools
export { ToolCreatePage, ToolDetailPage, type ToolDetailPageProps, ToolsListPage } from './tools'
