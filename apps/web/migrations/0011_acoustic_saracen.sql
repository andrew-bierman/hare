CREATE TABLE `agent_test_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`agentId` text NOT NULL,
	`workspaceId` text NOT NULL,
	`name` text NOT NULL,
	`input` text NOT NULL,
	`expectedOutput` text NOT NULL,
	`evaluationType` text DEFAULT 'contains' NOT NULL,
	`tags` text,
	`enabled` integer DEFAULT true NOT NULL,
	`createdBy` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `test_cases_agent_idx` ON `agent_test_cases` (`agentId`);--> statement-breakpoint
CREATE INDEX `test_cases_workspace_idx` ON `agent_test_cases` (`workspaceId`);--> statement-breakpoint
CREATE TABLE `agent_test_results` (
	`id` text PRIMARY KEY NOT NULL,
	`testRunId` text NOT NULL,
	`testCaseId` text NOT NULL,
	`status` text NOT NULL,
	`actualOutput` text,
	`score` integer,
	`evaluationDetails` text,
	`durationMs` integer,
	`error` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`testRunId`) REFERENCES `agent_test_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`testCaseId`) REFERENCES `agent_test_cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `test_results_run_idx` ON `agent_test_results` (`testRunId`);--> statement-breakpoint
CREATE INDEX `test_results_case_idx` ON `agent_test_results` (`testCaseId`);--> statement-breakpoint
CREATE INDEX `test_results_status_idx` ON `agent_test_results` (`status`);--> statement-breakpoint
CREATE TABLE `agent_test_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`agentId` text NOT NULL,
	`workspaceId` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`totalCases` integer DEFAULT 0 NOT NULL,
	`passedCases` integer DEFAULT 0 NOT NULL,
	`failedCases` integer DEFAULT 0 NOT NULL,
	`errorCases` integer DEFAULT 0 NOT NULL,
	`score` integer,
	`triggeredBy` text NOT NULL,
	`startedAt` integer NOT NULL,
	`completedAt` integer,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`triggeredBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `test_runs_agent_idx` ON `agent_test_runs` (`agentId`);--> statement-breakpoint
CREATE INDEX `test_runs_workspace_idx` ON `agent_test_runs` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `test_runs_status_idx` ON `agent_test_runs` (`status`);--> statement-breakpoint
CREATE INDEX `test_runs_started_at_idx` ON `agent_test_runs` (`startedAt`);--> statement-breakpoint
CREATE TABLE `agent_triggers` (
	`id` text PRIMARY KEY NOT NULL,
	`agentId` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`config` text,
	`enabled` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`webhookPath` text,
	`lastTriggeredAt` integer,
	`triggerCount` integer DEFAULT 0 NOT NULL,
	`createdBy` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_triggers_webhookPath_unique` ON `agent_triggers` (`webhookPath`);--> statement-breakpoint
CREATE INDEX `agent_triggers_agent_idx` ON `agent_triggers` (`agentId`);--> statement-breakpoint
CREATE INDEX `agent_triggers_type_idx` ON `agent_triggers` (`type`);--> statement-breakpoint
CREATE INDEX `agent_triggers_status_idx` ON `agent_triggers` (`status`);--> statement-breakpoint
CREATE INDEX `agent_triggers_webhook_path_idx` ON `agent_triggers` (`webhookPath`);--> statement-breakpoint
CREATE TABLE `trigger_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`triggerId` text NOT NULL,
	`agentId` text NOT NULL,
	`status` text NOT NULL,
	`input` text,
	`output` text,
	`startedAt` integer NOT NULL,
	`completedAt` integer,
	`durationMs` integer,
	`error` text,
	FOREIGN KEY (`triggerId`) REFERENCES `agent_triggers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trigger_executions_trigger_idx` ON `trigger_executions` (`triggerId`);--> statement-breakpoint
CREATE INDEX `trigger_executions_agent_idx` ON `trigger_executions` (`agentId`);--> statement-breakpoint
CREATE INDEX `trigger_executions_status_idx` ON `trigger_executions` (`status`);--> statement-breakpoint
CREATE INDEX `trigger_executions_started_at_idx` ON `trigger_executions` (`startedAt`);