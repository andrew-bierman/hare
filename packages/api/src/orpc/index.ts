/**
 * oRPC Main Entry Point
 *
 * Exports the router, types, and Hono integration.
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
} from './routers'
