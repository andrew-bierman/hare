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
import { workspaceMembersRouter } from './workspace-members'
import { userSettingsRouter } from './user-settings'
import { usageRouter } from './usage'
import { analyticsRouter } from './analytics'
import { logsRouter } from './logs'

// Re-export individual routers
export {
	agentsRouter,
	toolsRouter,
	apiKeysRouter,
	workspacesRouter,
	schedulesRouter,
	workspaceMembersRouter,
	userSettingsRouter,
	usageRouter,
	analyticsRouter,
	logsRouter,
}

// Combined router for the app
export const appRouter = {
	agents: agentsRouter,
	tools: toolsRouter,
	apiKeys: apiKeysRouter,
	workspaces: workspacesRouter,
	schedules: schedulesRouter,
	workspaceMembers: workspaceMembersRouter,
	userSettings: userSettingsRouter,
	usage: usageRouter,
	analytics: analyticsRouter,
	logs: logsRouter,
}

export type AppRouter = typeof appRouter
