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
import { memoryRouter } from './memory'
import { chatRouter } from './chat'
import { billingRouter } from './billing'
import { healthRouter } from './health'
import { webhooksRouter } from './webhooks'
import { embedRouter } from './embed'

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
	memoryRouter,
	chatRouter,
	billingRouter,
	healthRouter,
	webhooksRouter,
	embedRouter,
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
	memory: memoryRouter,
	chat: chatRouter,
	billing: billingRouter,
	health: healthRouter,
	webhooks: webhooksRouter,
	embed: embedRouter,
}

export type AppRouter = typeof appRouter
