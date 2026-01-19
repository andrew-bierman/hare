/**
 * Test setup for API routes
 *
 * Applies D1 migrations before tests run.
 * This is required because the auth middleware queries the database.
 */

/**
 * Individual SQL statements for setting up test database.
 * Using an array of statements instead of a multiline string for better D1 compatibility.
 */
const MIGRATION_STATEMENTS = [
	// Users table (required for auth)
	`CREATE TABLE IF NOT EXISTS "user" ("id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "email" text NOT NULL, "emailVerified" integer DEFAULT false NOT NULL, "image" text, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Sessions table (required for auth)
	`CREATE TABLE IF NOT EXISTS "session" ("id" text PRIMARY KEY NOT NULL, "expiresAt" integer NOT NULL, "token" text NOT NULL, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL, "ipAddress" text, "userAgent" text, "userId" text NOT NULL)`,

	// Accounts table (required for OAuth)
	`CREATE TABLE IF NOT EXISTS "account" ("id" text PRIMARY KEY NOT NULL, "accountId" text NOT NULL, "providerId" text NOT NULL, "userId" text NOT NULL, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" integer, "refreshTokenExpiresAt" integer, "scope" text, "password" text, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Verification table (required for auth)
	`CREATE TABLE IF NOT EXISTS "verification" ("id" text PRIMARY KEY NOT NULL, "identifier" text NOT NULL, "value" text NOT NULL, "expiresAt" integer NOT NULL, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Workspaces table
	`CREATE TABLE IF NOT EXISTS "workspaces" ("id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "slug" text NOT NULL, "description" text, "ownerId" text NOT NULL, "stripeCustomerId" text, "stripeSubscriptionId" text, "planId" text DEFAULT 'free', "currentPeriodEnd" integer, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Workspace members table
	`CREATE TABLE IF NOT EXISTS "workspace_members" ("id" text PRIMARY KEY NOT NULL, "workspaceId" text NOT NULL, "userId" text NOT NULL, "role" text DEFAULT 'member' NOT NULL, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Workspace invitations table
	`CREATE TABLE IF NOT EXISTS "workspace_invitations" ("id" text PRIMARY KEY NOT NULL, "workspaceId" text NOT NULL, "email" text NOT NULL, "role" text DEFAULT 'member' NOT NULL, "token" text NOT NULL UNIQUE, "invitedBy" text NOT NULL, "status" text DEFAULT 'pending' NOT NULL, "expiresAt" integer NOT NULL, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Agents table
	`CREATE TABLE IF NOT EXISTS "agents" ("id" text PRIMARY KEY NOT NULL, "workspaceId" text NOT NULL, "name" text NOT NULL, "description" text, "instructions" text, "model" text DEFAULT 'llama-3.3-70b' NOT NULL, "status" text DEFAULT 'draft' NOT NULL, "systemToolsEnabled" integer DEFAULT true NOT NULL, "config" text, "createdBy" text NOT NULL, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Tools table
	`CREATE TABLE IF NOT EXISTS "tools" ("id" text PRIMARY KEY NOT NULL, "workspaceId" text NOT NULL, "name" text NOT NULL, "description" text, "type" text NOT NULL, "config" text, "inputSchema" text, "createdBy" text NOT NULL, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// API Keys table
	`CREATE TABLE IF NOT EXISTS "api_keys" ("id" text PRIMARY KEY NOT NULL, "workspaceId" text NOT NULL, "name" text NOT NULL, "key" text NOT NULL, "hashedKey" text NOT NULL, "prefix" text NOT NULL, "lastUsedAt" integer, "expiresAt" integer, "permissions" text, "createdBy" text NOT NULL, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Usage table
	`CREATE TABLE IF NOT EXISTS "usage" ("id" text PRIMARY KEY NOT NULL, "workspaceId" text NOT NULL, "agentId" text, "userId" text, "type" text NOT NULL, "inputTokens" integer DEFAULT 0, "outputTokens" integer DEFAULT 0, "totalTokens" integer DEFAULT 0, "cost" integer DEFAULT 0, "metadata" text, "createdAt" integer NOT NULL)`,

	// Conversations table
	`CREATE TABLE IF NOT EXISTS "conversations" ("id" text PRIMARY KEY NOT NULL, "workspaceId" text NOT NULL, "agentId" text NOT NULL, "userId" text NOT NULL, "title" text, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Messages table
	`CREATE TABLE IF NOT EXISTS "messages" ("id" text PRIMARY KEY NOT NULL, "conversationId" text NOT NULL, "role" text NOT NULL, "content" text NOT NULL, "metadata" text, "createdAt" integer NOT NULL)`,

	// Webhooks table
	`CREATE TABLE IF NOT EXISTS "webhooks" ("id" text PRIMARY KEY NOT NULL, "agentId" text NOT NULL, "url" text NOT NULL, "secret" text NOT NULL, "events" text NOT NULL, "status" text DEFAULT 'active' NOT NULL, "description" text, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Webhook logs table
	`CREATE TABLE IF NOT EXISTS "webhook_logs" ("id" text PRIMARY KEY NOT NULL, "webhookId" text NOT NULL, "event" text NOT NULL, "payload" text NOT NULL, "status" text DEFAULT 'pending' NOT NULL, "responseStatus" integer, "responseBody" text, "attempts" integer DEFAULT 0 NOT NULL, "error" text, "createdAt" integer NOT NULL, "completedAt" integer)`,

	// Scheduled tasks table
	`CREATE TABLE IF NOT EXISTS "scheduled_tasks" ("id" text PRIMARY KEY NOT NULL, "agentId" text NOT NULL, "type" text NOT NULL, "executeAt" integer, "cron" text, "action" text NOT NULL, "payload" text, "status" text DEFAULT 'pending' NOT NULL, "lastExecutedAt" integer, "nextExecuteAt" integer, "executionCount" integer DEFAULT 0 NOT NULL, "createdBy" text NOT NULL, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Schedule executions table
	`CREATE TABLE IF NOT EXISTS "schedule_executions" ("id" text PRIMARY KEY NOT NULL, "scheduleId" text NOT NULL, "agentId" text NOT NULL, "status" text NOT NULL, "startedAt" integer NOT NULL, "completedAt" integer, "durationMs" integer, "result" text, "error" text)`,

	// User preferences table
	`CREATE TABLE IF NOT EXISTS "user_preferences" ("id" text PRIMARY KEY NOT NULL, "userId" text NOT NULL, "emailNotifications" integer DEFAULT true NOT NULL, "usageAlerts" integer DEFAULT true NOT NULL, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Deployments table
	`CREATE TABLE IF NOT EXISTS "deployments" ("id" text PRIMARY KEY NOT NULL, "agentId" text NOT NULL, "version" text NOT NULL, "environment" text DEFAULT 'production' NOT NULL, "status" text DEFAULT 'pending' NOT NULL, "url" text, "metadata" text, "deployedBy" text NOT NULL, "deployedAt" integer NOT NULL, "createdAt" integer NOT NULL)`,

	// Agent tools junction table
	`CREATE TABLE IF NOT EXISTS "agent_tools" ("id" text PRIMARY KEY NOT NULL, "agentId" text NOT NULL, "toolId" text NOT NULL, "createdAt" integer NOT NULL)`,
]

/**
 * Apply migrations to the D1 database.
 * Uses batch() with prepared statements for D1 compatibility.
 */
export async function applyMigrations(db: D1Database): Promise<void> {
	const statements = MIGRATION_STATEMENTS.map((sql) => db.prepare(sql))
	await db.batch(statements)
}
