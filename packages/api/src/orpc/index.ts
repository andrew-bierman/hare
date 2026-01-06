/**
 * oRPC Main Entry Point
 *
 * Exports the router, types, and Hono integration.
 */

import type { RouterClient } from '@orpc/server'

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

// Pre-computed client type for cross-package type safety
import type { AppRouter } from './routers'

/**
 * Type-safe client type derived from the app router.
 * Use this type when creating the oRPC client in other packages.
 */
export type AppRouterClient = RouterClient<AppRouter>
