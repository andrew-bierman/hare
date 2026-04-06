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
import { feedbackRouter } from './feedback'
import { guardrailsRouter } from './guardrails'
import { healthRouter } from './health'
import { knowledgeBaseRouter } from './knowledge-base'
import { logsRouter } from './logs'
import { memoryRouter } from './memory'
import { schedulesRouter } from './schedules'
import { toolsRouter } from './tools'
import { usageRouter } from './usage'
import { userSettingsRouter } from './user-settings'
import { webhooksRouter } from './webhooks'
import { workflowsRouter } from './workflows'
import { workspaceMembersRouter } from './workspace-members'
import { workspacesRouter } from './workspaces'

// Re-export individual routers
export {
	activityRouter,
	agentsRouter,
	analyticsRouter,
	apiKeysRouter,
	auditLogsRouter,
	billingRouter,
	chatRouter,
	embedRouter,
	healthRouter,
	logsRouter,
	memoryRouter,
	schedulesRouter,
	toolsRouter,
	usageRouter,
	userSettingsRouter,
	webhooksRouter,
	workspaceMembersRouter,
	workspacesRouter,
	feedbackRouter,
	guardrailsRouter,
	knowledgeBaseRouter,
	workflowsRouter,
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
	feedback: feedbackRouter,
	guardrails: guardrailsRouter,
	knowledgeBases: knowledgeBaseRouter,
	workflows: workflowsRouter,
}

export type AppRouter = typeof appRouter
