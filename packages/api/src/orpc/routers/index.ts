/**
 * oRPC Routers Index
 *
 * Combines all oRPC routers into a single app router.
 */

import { activityRouter } from './activity'
import { agentsRouter } from './agents'
import { analyticsRouter } from './analytics'
import { apiKeysRouter } from './api-keys'
import { auditLogsRouter } from './audit-logs'
import { billingRouter } from './billing'
import { chatRouter } from './chat'
import { embedRouter } from './embed'
import { healthRouter } from './health'
import { logsRouter } from './logs'
import { memoryRouter } from './memory'
import { schedulesRouter } from './schedules'
import { toolsRouter } from './tools'
import { usageRouter } from './usage'
import { userSettingsRouter } from './user-settings'
import { webhooksRouter } from './webhooks'
import { workspaceMembersRouter } from './workspace-members'
import { workspacesRouter } from './workspaces'

// Re-export individual routers
export {
	activityRouter,
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
	auditLogsRouter,
}

// Combined router for the app
export const appRouter = {
	activity: activityRouter,
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
	auditLogs: auditLogsRouter,
}

export type AppRouter = typeof appRouter
