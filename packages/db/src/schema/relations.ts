/**
 * Drizzle Relations
 *
 * Defines relationships between tables for type-safe relational queries.
 * Use with Drizzle's query API for automatic joins.
 */

import { relations } from 'drizzle-orm'
import { agents } from './agents'
import { accounts, sessions, users } from './auth'
import { conversations, messages } from './conversations'
import { deployments } from './deployments'
import { scheduleExecutions, scheduledTasks } from './schedules'
import { agentTools, tools } from './tools'
import { apiKeys, usage } from './usage'
import { webhookLogs, webhooks } from './webhooks'
import { workspaceInvitations, workspaceMembers, workspaces } from './workspaces'

// =============================================================================
// User Relations
// =============================================================================

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	accounts: many(accounts),
	workspacesOwned: many(workspaces),
	workspaceMemberships: many(workspaceMembers),
	invitationsSent: many(workspaceInvitations),
	agentsCreated: many(agents),
	toolsCreated: many(tools),
	apiKeysCreated: many(apiKeys),
	conversations: many(conversations),
	scheduledTasksCreated: many(scheduledTasks),
	deploymentsCreated: many(deployments),
	usage: many(usage),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id],
	}),
}))

// =============================================================================
// Workspace Relations
// =============================================================================

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
	owner: one(users, {
		fields: [workspaces.ownerId],
		references: [users.id],
	}),
	members: many(workspaceMembers),
	invitations: many(workspaceInvitations),
	agents: many(agents),
	tools: many(tools),
	conversations: many(conversations),
	apiKeys: many(apiKeys),
	usage: many(usage),
}))

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
	workspace: one(workspaces, {
		fields: [workspaceMembers.workspaceId],
		references: [workspaces.id],
	}),
	user: one(users, {
		fields: [workspaceMembers.userId],
		references: [users.id],
	}),
}))

export const workspaceInvitationsRelations = relations(workspaceInvitations, ({ one }) => ({
	workspace: one(workspaces, {
		fields: [workspaceInvitations.workspaceId],
		references: [workspaces.id],
	}),
	invitedBy: one(users, {
		fields: [workspaceInvitations.invitedBy],
		references: [users.id],
	}),
}))

// =============================================================================
// Agent Relations
// =============================================================================

export const agentsRelations = relations(agents, ({ one, many }) => ({
	workspace: one(workspaces, {
		fields: [agents.workspaceId],
		references: [workspaces.id],
	}),
	createdBy: one(users, {
		fields: [agents.createdBy],
		references: [users.id],
	}),
	agentTools: many(agentTools),
	conversations: many(conversations),
	webhooks: many(webhooks),
	scheduledTasks: many(scheduledTasks),
	scheduleExecutions: many(scheduleExecutions),
	deployments: many(deployments),
	usage: many(usage),
}))

// =============================================================================
// Tool Relations
// =============================================================================

export const toolsRelations = relations(tools, ({ one, many }) => ({
	workspace: one(workspaces, {
		fields: [tools.workspaceId],
		references: [workspaces.id],
	}),
	createdBy: one(users, {
		fields: [tools.createdBy],
		references: [users.id],
	}),
	agentTools: many(agentTools),
}))

export const agentToolsRelations = relations(agentTools, ({ one }) => ({
	agent: one(agents, {
		fields: [agentTools.agentId],
		references: [agents.id],
	}),
	tool: one(tools, {
		fields: [agentTools.toolId],
		references: [tools.id],
	}),
}))

// =============================================================================
// Conversation Relations
// =============================================================================

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
	workspace: one(workspaces, {
		fields: [conversations.workspaceId],
		references: [workspaces.id],
	}),
	agent: one(agents, {
		fields: [conversations.agentId],
		references: [agents.id],
	}),
	user: one(users, {
		fields: [conversations.userId],
		references: [users.id],
	}),
	messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id],
	}),
}))

// =============================================================================
// Webhook Relations
// =============================================================================

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
	agent: one(agents, {
		fields: [webhooks.agentId],
		references: [agents.id],
	}),
	logs: many(webhookLogs),
}))

export const webhookLogsRelations = relations(webhookLogs, ({ one }) => ({
	webhook: one(webhooks, {
		fields: [webhookLogs.webhookId],
		references: [webhooks.id],
	}),
}))

// =============================================================================
// Schedule Relations
// =============================================================================

export const scheduledTasksRelations = relations(scheduledTasks, ({ one, many }) => ({
	agent: one(agents, {
		fields: [scheduledTasks.agentId],
		references: [agents.id],
	}),
	createdBy: one(users, {
		fields: [scheduledTasks.createdBy],
		references: [users.id],
	}),
	executions: many(scheduleExecutions),
}))

export const scheduleExecutionsRelations = relations(scheduleExecutions, ({ one }) => ({
	schedule: one(scheduledTasks, {
		fields: [scheduleExecutions.scheduleId],
		references: [scheduledTasks.id],
	}),
	agent: one(agents, {
		fields: [scheduleExecutions.agentId],
		references: [agents.id],
	}),
}))

// =============================================================================
// Deployment Relations
// =============================================================================

export const deploymentsRelations = relations(deployments, ({ one }) => ({
	agent: one(agents, {
		fields: [deployments.agentId],
		references: [agents.id],
	}),
	deployedBy: one(users, {
		fields: [deployments.deployedBy],
		references: [users.id],
	}),
}))

// =============================================================================
// Usage & API Key Relations
// =============================================================================

export const usageRelations = relations(usage, ({ one }) => ({
	workspace: one(workspaces, {
		fields: [usage.workspaceId],
		references: [workspaces.id],
	}),
	agent: one(agents, {
		fields: [usage.agentId],
		references: [agents.id],
	}),
	user: one(users, {
		fields: [usage.userId],
		references: [users.id],
	}),
}))

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
	workspace: one(workspaces, {
		fields: [apiKeys.workspaceId],
		references: [workspaces.id],
	}),
	createdBy: one(users, {
		fields: [apiKeys.createdBy],
		references: [users.id],
	}),
}))
