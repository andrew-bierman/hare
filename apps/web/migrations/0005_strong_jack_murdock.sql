CREATE TABLE `agent_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`agentId` text NOT NULL,
	`version` integer NOT NULL,
	`instructions` text,
	`model` text NOT NULL,
	`config` text,
	`toolIds` text,
	`createdAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`workspaceId` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`instructions` text,
	`model` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`systemToolsEnabled` integer DEFAULT true NOT NULL,
	`config` text,
	`createdBy` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_agents`("id", "workspaceId", "name", "description", "instructions", "model", "status", "systemToolsEnabled", "config", "createdBy", "createdAt", "updatedAt") SELECT "id", "workspaceId", "name", "description", "instructions", "model", "status", "systemToolsEnabled", "config", "createdBy", "createdAt", "updatedAt" FROM `agents`;--> statement-breakpoint
DROP TABLE `agents`;--> statement-breakpoint
ALTER TABLE `__new_agents` RENAME TO `agents`;--> statement-breakpoint
PRAGMA foreign_keys=ON;