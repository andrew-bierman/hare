/**
 * oRPC Main Entry Point
 *
 * Exports the router, types, client, and Hono integration.
 */

// Base exports
export {
	type AuthContext,
	authedProcedure,
	type BaseContext,
	badRequest,
	notFound,
	publicProcedure,
	requireAdmin,
	requireMember,
	requireOwner,
	requireViewer,
	requireWrite,
	serverError,
	type WorkspaceContext,
	workspaceProcedure,
} from './base'

// Note: Schemas are exported from ../schemas, not re-exported here to avoid conflicts

// Audit logging utility
export { type LogAuditInput, logAudit } from './audit'
// Client exports - the main way to use oRPC from the frontend
export {
	type AgentsClient,
	type AnalyticsClient,
	type ApiKeysClient,
	type AppRouterClient,
	type AuditLogsClient,
	type BillingClient,
	type ChatClient,
	getOrpcWorkspaceId,
	type LogsClient,
	type MemoryClient,
	orpc,
	type SchedulesClient,
	setOrpcWorkspaceId,
	type ToolsClient,
	type UsageClient,
	type UserSettingsClient,
	type WorkspaceMembersClient,
	type WorkspacesClient,
} from './client'
// Router exports
export {
	type AppRouter,
	agentsRouter,
	apiKeysRouter,
	appRouter,
	auditLogsRouter,
	schedulesRouter,
	toolsRouter,
	workspacesRouter,
} from './routers'
