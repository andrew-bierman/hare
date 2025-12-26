CREATE TABLE `schedule_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`scheduleId` text NOT NULL,
	`agentId` text NOT NULL,
	`status` text NOT NULL,
	`startedAt` integer NOT NULL,
	`completedAt` integer,
	`durationMs` integer,
	`result` text,
	`error` text,
	FOREIGN KEY (`scheduleId`) REFERENCES `scheduled_tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scheduled_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`agentId` text NOT NULL,
	`type` text NOT NULL,
	`executeAt` integer,
	`cron` text,
	`action` text NOT NULL,
	`payload` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`lastExecutedAt` integer,
	`nextExecuteAt` integer,
	`executionCount` integer DEFAULT 0 NOT NULL,
	`createdBy` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `webhook_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`webhookId` text NOT NULL,
	`event` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`responseStatus` integer,
	`responseBody` text,
	`attempts` integer DEFAULT 1 NOT NULL,
	`error` text,
	`createdAt` integer NOT NULL,
	`completedAt` integer,
	FOREIGN KEY (`webhookId`) REFERENCES `webhooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`agentId` text NOT NULL,
	`url` text NOT NULL,
	`secret` text NOT NULL,
	`events` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`description` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `workspace_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspaceId` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`token` text NOT NULL,
	`invitedBy` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invitedBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_invitations_token_unique` ON `workspace_invitations` (`token`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`workspaceId` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`instructions` text,
	`model` text DEFAULT 'llama-3.3-70b' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`config` text,
	`createdBy` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_agents`("id", "workspaceId", "name", "description", "instructions", "model", "status", "config", "createdBy", "createdAt", "updatedAt") SELECT "id", "workspaceId", "name", "description", "instructions", "model", "status", "config", "createdBy", "createdAt", "updatedAt" FROM `agents`;--> statement-breakpoint
DROP TABLE `agents`;--> statement-breakpoint
ALTER TABLE `__new_agents` RENAME TO `agents`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `tools` ADD `inputSchema` text;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `stripeCustomerId` text;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `stripeSubscriptionId` text;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `planId` text DEFAULT 'free';--> statement-breakpoint
ALTER TABLE `workspaces` ADD `currentPeriodEnd` integer;