/**
 * Zod schemas generated from Drizzle ORM table definitions using drizzle-zod.
 * These schemas provide runtime validation that stays in sync with the database schema.
 *
 * Usage:
 * - Use `select` schemas for validating data from database queries
 * - Use `insert` schemas for validating data before inserting into the database
 * - Use `z.infer<typeof Schema>` to get TypeScript types from schemas
 */

import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

// Import all table definitions
import { agents } from './agents'
import { accounts, sessions, users, verifications } from './auth'
import { conversations, messages } from './conversations'
import { deployments } from './deployments'
import { agentTools, tools } from './tools'
import { apiKeys, usage } from './usage'
import { WEBHOOK_EVENT_TYPES, WEBHOOK_STATUSES, webhookLogs, webhooks } from './webhooks'
import { workspaceMembers, workspaces } from './workspaces'

// =============================================================================
// AUTH SCHEMAS
// =============================================================================

/** Schema for selecting users from the database */
export const selectUserSchema = createSelectSchema(users)
/** Schema for inserting users into the database */
export const insertUserSchema = createInsertSchema(users, {
	email: z.string().email(),
	name: z.string().min(1).max(100),
})

export type SelectUser = z.infer<typeof selectUserSchema>
export type InsertUser = z.infer<typeof insertUserSchema>

/** Schema for selecting sessions from the database */
export const selectSessionSchema = createSelectSchema(sessions)
/** Schema for inserting sessions into the database */
export const insertSessionSchema = createInsertSchema(sessions)

export type SelectSession = z.infer<typeof selectSessionSchema>
export type InsertSession = z.infer<typeof insertSessionSchema>

/** Schema for selecting accounts from the database */
export const selectAccountSchema = createSelectSchema(accounts)
/** Schema for inserting accounts into the database */
export const insertAccountSchema = createInsertSchema(accounts)

export type SelectAccount = z.infer<typeof selectAccountSchema>
export type InsertAccount = z.infer<typeof insertAccountSchema>

/** Schema for selecting verifications from the database */
export const selectVerificationSchema = createSelectSchema(verifications)
/** Schema for inserting verifications into the database */
export const insertVerificationSchema = createInsertSchema(verifications)

export type SelectVerification = z.infer<typeof selectVerificationSchema>
export type InsertVerification = z.infer<typeof insertVerificationSchema>

// =============================================================================
// WORKSPACE SCHEMAS
// =============================================================================

/** Schema for selecting workspaces from the database */
export const selectWorkspaceSchema = createSelectSchema(workspaces)
/** Schema for inserting workspaces into the database */
export const insertWorkspaceSchema = createInsertSchema(workspaces, {
	name: z.string().min(1).max(100),
	slug: z.string().min(1).max(50),
})

export type SelectWorkspace = z.infer<typeof selectWorkspaceSchema>
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>

/** Schema for selecting workspace members from the database */
export const selectWorkspaceMemberSchema = createSelectSchema(workspaceMembers)
/** Schema for inserting workspace members into the database */
export const insertWorkspaceMemberSchema = createInsertSchema(workspaceMembers)

export type SelectWorkspaceMember = z.infer<typeof selectWorkspaceMemberSchema>
export type InsertWorkspaceMember = z.infer<typeof insertWorkspaceMemberSchema>

// =============================================================================
// AGENT SCHEMAS
// =============================================================================

/** Agent config JSON schema */
export const AgentConfigJsonSchema = z.object({
	temperature: z.number().min(0).max(2).optional(),
	maxTokens: z.number().min(1).max(100000).optional(),
	topP: z.number().min(0).max(1).optional(),
	topK: z.number().min(0).optional(),
	stopSequences: z.array(z.string()).optional(),
})

export type AgentConfigJson = z.infer<typeof AgentConfigJsonSchema>

/** Schema for selecting agents from the database */
export const selectAgentSchema = createSelectSchema(agents, {
	config: AgentConfigJsonSchema.nullable(),
})
/** Schema for inserting agents into the database */
export const insertAgentSchema = createInsertSchema(agents, {
	name: z.string().min(1).max(100),
	config: AgentConfigJsonSchema.optional(),
})

export type SelectAgent = z.infer<typeof selectAgentSchema>
export type InsertAgent = z.infer<typeof insertAgentSchema>

// =============================================================================
// TOOL SCHEMAS
// =============================================================================

/** Tool config JSON schema */
export const ToolConfigJsonSchema = z
	.object({
		// HTTP/Webhook config
		url: z.string().url().optional(),
		method: z.string().optional(),
		headers: z.record(z.string(), z.string()).optional(),
		body: z.string().optional(),
		// SQL config
		query: z.string().optional(),
		database: z.string().optional(),
		// Search config
		searchEngine: z.string().optional(),
		// Integration configs
		webhookUrl: z.string().url().optional(),
		apiKey: z.string().optional(),
		apiEndpoint: z.string().optional(),
		channel: z.string().optional(),
		from: z.string().optional(),
		// Custom code
		customCode: z.string().optional(),
	})
	.passthrough()

export type ToolConfigJson = z.infer<typeof ToolConfigJsonSchema>

/** Schema for selecting tools from the database */
export const selectToolSchema = createSelectSchema(tools, {
	config: ToolConfigJsonSchema.nullable(),
})
/** Schema for inserting tools into the database */
export const insertToolSchema = createInsertSchema(tools, {
	name: z.string().min(1).max(100),
	config: ToolConfigJsonSchema.optional(),
})

export type SelectTool = z.infer<typeof selectToolSchema>
export type InsertTool = z.infer<typeof insertToolSchema>

/** Schema for selecting agent-tool relationships from the database */
export const selectAgentToolSchema = createSelectSchema(agentTools)
/** Schema for inserting agent-tool relationships into the database */
export const insertAgentToolSchema = createInsertSchema(agentTools)

export type SelectAgentTool = z.infer<typeof selectAgentToolSchema>
export type InsertAgentTool = z.infer<typeof insertAgentToolSchema>

// =============================================================================
// CONVERSATION SCHEMAS
// =============================================================================

/** Schema for selecting conversations from the database */
export const selectConversationSchema = createSelectSchema(conversations)
/** Schema for inserting conversations into the database */
export const insertConversationSchema = createInsertSchema(conversations, {
	title: z.string().max(200).optional(),
})

export type SelectConversation = z.infer<typeof selectConversationSchema>
export type InsertConversation = z.infer<typeof insertConversationSchema>

/** Schema for selecting messages from the database */
export const selectMessageSchema = createSelectSchema(messages)
/** Schema for inserting messages into the database */
export const insertMessageSchema = createInsertSchema(messages, {
	content: z.string().min(1),
})

export type SelectMessage = z.infer<typeof selectMessageSchema>
export type InsertMessage = z.infer<typeof insertMessageSchema>

// =============================================================================
// DEPLOYMENT SCHEMAS
// =============================================================================

/** Deployment metadata JSON schema */
export const DeploymentMetadataJsonSchema = z
	.object({
		buildTime: z.number().optional(),
		commitHash: z.string().optional(),
		config: z.record(z.string(), z.unknown()).optional(),
	})
	.passthrough()

export type DeploymentMetadataJson = z.infer<typeof DeploymentMetadataJsonSchema>

/** Schema for selecting deployments from the database */
export const selectDeploymentSchema = createSelectSchema(deployments, {
	metadata: DeploymentMetadataJsonSchema.nullable(),
})
/** Schema for inserting deployments into the database */
export const insertDeploymentSchema = createInsertSchema(deployments, {
	version: z.string().min(1),
	metadata: DeploymentMetadataJsonSchema.optional(),
})

export type SelectDeployment = z.infer<typeof selectDeploymentSchema>
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>

// =============================================================================
// USAGE SCHEMAS
// =============================================================================

/** Usage metadata JSON schema */
export const UsageMetadataJsonSchema = z
	.object({
		model: z.string().optional(),
		endpoint: z.string().optional(),
		duration: z.number().optional(),
		statusCode: z.number().optional(),
	})
	.passthrough()

export type UsageMetadataJson = z.infer<typeof UsageMetadataJsonSchema>

/** Schema for selecting usage records from the database */
export const selectUsageSchema = createSelectSchema(usage, {
	metadata: UsageMetadataJsonSchema.nullable(),
})
/** Schema for inserting usage records into the database */
export const insertUsageSchema = createInsertSchema(usage, {
	type: z.string().min(1),
	metadata: UsageMetadataJsonSchema.optional(),
})

export type SelectUsage = z.infer<typeof selectUsageSchema>
export type InsertUsage = z.infer<typeof insertUsageSchema>

/** API key permissions JSON schema */
export const ApiKeyPermissionsJsonSchema = z
	.object({
		scopes: z.array(z.string()).optional(),
		agentIds: z.array(z.string()).optional(),
	})
	.passthrough()

export type ApiKeyPermissionsJson = z.infer<typeof ApiKeyPermissionsJsonSchema>

/** Schema for selecting API keys from the database */
export const selectApiKeySchema = createSelectSchema(apiKeys, {
	permissions: ApiKeyPermissionsJsonSchema.nullable(),
})
/** Schema for inserting API keys into the database */
export const insertApiKeySchema = createInsertSchema(apiKeys, {
	name: z.string().min(1).max(100),
	permissions: ApiKeyPermissionsJsonSchema.optional(),
})

export type SelectApiKey = z.infer<typeof selectApiKeySchema>
export type InsertApiKey = z.infer<typeof insertApiKeySchema>

// =============================================================================
// WEBHOOK SCHEMAS
// =============================================================================

/** Webhook event type schema */
export const WebhookEventTypeSchema = z.enum(WEBHOOK_EVENT_TYPES)

export type WebhookEventTypeZod = z.infer<typeof WebhookEventTypeSchema>

/** Webhook status schema */
export const WebhookStatusSchema = z.enum(WEBHOOK_STATUSES)

export type WebhookStatusZod = z.infer<typeof WebhookStatusSchema>

/** Schema for selecting webhooks from the database */
export const selectWebhookSchema = createSelectSchema(webhooks, {
	events: z.array(WebhookEventTypeSchema),
})
/** Schema for inserting webhooks into the database */
export const insertWebhookSchema = createInsertSchema(webhooks, {
	url: z.string().url(),
	events: z.array(WebhookEventTypeSchema).min(1),
})

export type SelectWebhook = z.infer<typeof selectWebhookSchema>
export type InsertWebhook = z.infer<typeof insertWebhookSchema>

/** Webhook log payload schema */
export const WebhookLogPayloadSchema = z.record(z.string(), z.unknown())

export type WebhookLogPayload = z.infer<typeof WebhookLogPayloadSchema>

/** Schema for selecting webhook logs from the database */
export const selectWebhookLogSchema = createSelectSchema(webhookLogs, {
	payload: WebhookLogPayloadSchema,
})
/** Schema for inserting webhook logs into the database */
export const insertWebhookLogSchema = createInsertSchema(webhookLogs, {
	payload: WebhookLogPayloadSchema,
})

export type SelectWebhookLog = z.infer<typeof selectWebhookLogSchema>
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>
