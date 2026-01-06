/**
 * oRPC Routers Index
 *
 * Combines all oRPC routers into a single app router.
 */

import { agentsRouter } from './agents'
import { toolsRouter } from './tools'
import { apiKeysRouter } from './api-keys'
import { workspacesRouter } from './workspaces'
import { schedulesRouter } from './schedules'

// Re-export individual routers
export { agentsRouter, toolsRouter, apiKeysRouter, workspacesRouter, schedulesRouter }

// Combined router for the app
export const appRouter = {
	agents: agentsRouter,
	tools: toolsRouter,
	apiKeys: apiKeysRouter,
	workspaces: workspacesRouter,
	schedules: schedulesRouter,
}

export type AppRouter = typeof appRouter
