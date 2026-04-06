CREATE TABLE `workflow_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`workflowId` text NOT NULL,
	`sourceNodeId` text NOT NULL,
	`targetNodeId` text NOT NULL,
	`label` text,
	`config` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`workflowId`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sourceNodeId`) REFERENCES `workflow_nodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`targetNodeId`) REFERENCES `workflow_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workflow_edges_workflow_idx` ON `workflow_edges` (`workflowId`);--> statement-breakpoint
CREATE INDEX `workflow_edges_source_idx` ON `workflow_edges` (`sourceNodeId`);--> statement-breakpoint
CREATE INDEX `workflow_edges_target_idx` ON `workflow_edges` (`targetNodeId`);--> statement-breakpoint
CREATE TABLE `workflow_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`workflowId` text NOT NULL,
	`workspaceId` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`input` text,
	`output` text,
	`triggeredBy` text,
	`startedAt` integer NOT NULL,
	`completedAt` integer,
	`durationMs` integer,
	`error` text,
	FOREIGN KEY (`workflowId`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`triggeredBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workflow_exec_workflow_idx` ON `workflow_executions` (`workflowId`);--> statement-breakpoint
CREATE INDEX `workflow_exec_workspace_idx` ON `workflow_executions` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `workflow_exec_status_idx` ON `workflow_executions` (`status`);--> statement-breakpoint
CREATE INDEX `workflow_exec_started_at_idx` ON `workflow_executions` (`startedAt`);--> statement-breakpoint
CREATE TABLE `workflow_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`workflowId` text NOT NULL,
	`type` text NOT NULL,
	`agentId` text,
	`label` text NOT NULL,
	`config` text,
	`positionX` integer DEFAULT 0 NOT NULL,
	`positionY` integer DEFAULT 0 NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`workflowId`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workflow_nodes_workflow_idx` ON `workflow_nodes` (`workflowId`);--> statement-breakpoint
CREATE INDEX `workflow_nodes_agent_idx` ON `workflow_nodes` (`agentId`);--> statement-breakpoint
CREATE TABLE `workflow_step_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`executionId` text NOT NULL,
	`nodeId` text NOT NULL,
	`agentId` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`input` text,
	`output` text,
	`startedAt` integer,
	`completedAt` integer,
	`durationMs` integer,
	`error` text,
	FOREIGN KEY (`executionId`) REFERENCES `workflow_executions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`nodeId`) REFERENCES `workflow_nodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `step_exec_execution_idx` ON `workflow_step_executions` (`executionId`);--> statement-breakpoint
CREATE INDEX `step_exec_node_idx` ON `workflow_step_executions` (`nodeId`);--> statement-breakpoint
CREATE INDEX `step_exec_status_idx` ON `workflow_step_executions` (`status`);--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`workspaceId` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`canvasLayout` text,
	`createdBy` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workflows_workspace_idx` ON `workflows` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `workflows_status_idx` ON `workflows` (`status`);