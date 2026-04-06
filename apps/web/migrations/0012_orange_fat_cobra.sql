CREATE TABLE `conversation_outcomes` (
	`id` text PRIMARY KEY NOT NULL,
	`conversationId` text NOT NULL,
	`agentId` text NOT NULL,
	`workspaceId` text NOT NULL,
	`outcome` text NOT NULL,
	`messageCount` integer DEFAULT 0 NOT NULL,
	`durationSeconds` integer,
	`avgResponseTimeMs` integer,
	`toolCallCount` integer DEFAULT 0 NOT NULL,
	`tags` text,
	`notes` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conv_outcomes_conversation_unique` ON `conversation_outcomes` (`conversationId`);--> statement-breakpoint
CREATE INDEX `conv_outcomes_conversation_idx` ON `conversation_outcomes` (`conversationId`);--> statement-breakpoint
CREATE INDEX `conv_outcomes_agent_idx` ON `conversation_outcomes` (`agentId`);--> statement-breakpoint
CREATE INDEX `conv_outcomes_workspace_idx` ON `conversation_outcomes` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `conv_outcomes_outcome_idx` ON `conversation_outcomes` (`outcome`);--> statement-breakpoint
CREATE INDEX `conv_outcomes_workspace_agent_idx` ON `conversation_outcomes` (`workspaceId`,`agentId`);--> statement-breakpoint
CREATE INDEX `conv_outcomes_created_at_idx` ON `conversation_outcomes` (`createdAt`);