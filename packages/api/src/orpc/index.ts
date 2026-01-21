/**
 * oRPC Main Entry Point
 *
 * Exports the router, types, client, and Hono integration.
 */

// Base exports
export {
	publicProcedure,
	authedProcedure,
	workspaceProcedure,
	requireViewer,
	requireMember,
	requireWrite,
	requireAdmin,
	requireOwner,
	notFound,
	badRequest,
	serverError,
	type BaseContext,
	type AuthContext,
	type WorkspaceContext,
} from './base'

// Note: Schemas are exported from ../schemas, not re-exported here to avoid conflicts

// Router exports
export { appRouter, type AppRouter } from './routers'
export {
	agentsRouter,
	toolsRouter,
	apiKeysRouter,
	workspacesRouter,
	schedulesRouter,
	auditLogsRouter,
} from './routers'

// Client exports - the main way to use oRPC from the frontend
export {
	orpc,
	setOrpcWorkspaceId,
	getOrpcWorkspaceId,
	type AppRouterClient,
	type AgentsClient,
	type ToolsClient,
	type ApiKeysClient,
	type WorkspacesClient,
	type SchedulesClient,
	type UsageClient,
	type AnalyticsClient,
	type LogsClient,
	type MemoryClient,
	type ChatClient,
	type BillingClient,
	type UserSettingsClient,
	type WorkspaceMembersClient,
	type AuditLogsClient,
} from './client'

// Audit logging utility
export { logAudit, type LogAuditInput } from './audit'
