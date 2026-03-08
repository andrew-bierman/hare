CREATE TABLE `activity_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspaceId` text NOT NULL,
	`agentId` text,
	`eventType` text NOT NULL,
	`agentName` text,
	`summary` text NOT NULL,
	`details` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activity_events_workspace_id_idx` ON `activity_events` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `activity_events_agent_id_idx` ON `activity_events` (`agentId`);--> statement-breakpoint
CREATE INDEX `activity_events_created_at_idx` ON `activity_events` (`createdAt`);--> statement-breakpoint
CREATE INDEX `activity_events_workspace_created_idx` ON `activity_events` (`workspaceId`,`createdAt`);--> statement-breakpoint
DROP INDEX `api_keys_key_unique`;--> statement-breakpoint
CREATE INDEX `api_keys_hashed_key_idx` ON `api_keys` (`hashedKey`);--> statement-breakpoint
CREATE INDEX `api_keys_workspace_idx` ON `api_keys` (`workspaceId`);--> statement-breakpoint
ALTER TABLE `api_keys` DROP COLUMN `key`;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `tourCompleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `agents_workspace_idx` ON `agents` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `agents_status_idx` ON `agents` (`status`);--> statement-breakpoint
CREATE INDEX `agents_created_by_idx` ON `agents` (`createdBy`);--> statement-breakpoint
CREATE INDEX `agents_workspace_status_idx` ON `agents` (`workspaceId`,`status`);--> statement-breakpoint
CREATE INDEX `conversations_agent_idx` ON `conversations` (`agentId`);--> statement-breakpoint
CREATE INDEX `conversations_workspace_idx` ON `conversations` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `conversations_user_idx` ON `conversations` (`userId`);--> statement-breakpoint
CREATE INDEX `conversations_workspace_agent_idx` ON `conversations` (`workspaceId`,`agentId`);--> statement-breakpoint
CREATE INDEX `messages_conversation_idx` ON `messages` (`conversationId`);--> statement-breakpoint
CREATE INDEX `messages_conversation_created_idx` ON `messages` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `messages_created_at_idx` ON `messages` (`createdAt`);--> statement-breakpoint
CREATE INDEX `schedule_executions_schedule_idx` ON `schedule_executions` (`scheduleId`);--> statement-breakpoint
CREATE INDEX `schedule_executions_agent_idx` ON `schedule_executions` (`agentId`);--> statement-breakpoint
CREATE INDEX `schedule_executions_status_idx` ON `schedule_executions` (`status`);--> statement-breakpoint
CREATE INDEX `schedule_executions_started_at_idx` ON `schedule_executions` (`startedAt`);--> statement-breakpoint
CREATE INDEX `scheduled_tasks_agent_idx` ON `scheduled_tasks` (`agentId`);--> statement-breakpoint
CREATE INDEX `scheduled_tasks_status_idx` ON `scheduled_tasks` (`status`);--> statement-breakpoint
CREATE INDEX `scheduled_tasks_next_execute_at_idx` ON `scheduled_tasks` (`nextExecuteAt`);--> statement-breakpoint
CREATE INDEX `agent_tools_agent_idx` ON `agent_tools` (`agentId`);--> statement-breakpoint
CREATE INDEX `agent_tools_tool_idx` ON `agent_tools` (`toolId`);--> statement-breakpoint
CREATE UNIQUE INDEX `agent_tools_unique` ON `agent_tools` (`agentId`,`toolId`);--> statement-breakpoint
CREATE INDEX `tools_workspace_idx` ON `tools` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `tools_type_idx` ON `tools` (`type`);--> statement-breakpoint
CREATE INDEX `usage_workspace_created_idx` ON `usage` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `usage_agent_idx` ON `usage` (`agentId`);--> statement-breakpoint
CREATE INDEX `usage_type_idx` ON `usage` (`type`);--> statement-breakpoint
CREATE INDEX `usage_created_at_idx` ON `usage` (`createdAt`);--> statement-breakpoint
CREATE INDEX `webhook_logs_webhook_idx` ON `webhook_logs` (`webhookId`);--> statement-breakpoint
CREATE INDEX `webhook_logs_status_idx` ON `webhook_logs` (`status`);--> statement-breakpoint
CREATE INDEX `webhook_logs_created_at_idx` ON `webhook_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `webhooks_agent_idx` ON `webhooks` (`agentId`);--> statement-breakpoint
CREATE INDEX `webhooks_status_idx` ON `webhooks` (`status`);--> statement-breakpoint
CREATE INDEX `workspace_invitations_workspace_idx` ON `workspace_invitations` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `workspace_invitations_email_idx` ON `workspace_invitations` (`email`);--> statement-breakpoint
CREATE INDEX `workspace_invitations_status_idx` ON `workspace_invitations` (`status`);--> statement-breakpoint
CREATE INDEX `workspace_members_workspace_idx` ON `workspace_members` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `workspace_members_user_idx` ON `workspace_members` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_members_unique` ON `workspace_members` (`workspaceId`,`userId`);--> statement-breakpoint
CREATE INDEX `workspaces_owner_idx` ON `workspaces` (`ownerId`);