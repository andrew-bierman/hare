CREATE TABLE `guardrail_violations` (
	`id` text PRIMARY KEY NOT NULL,
	`guardrailId` text NOT NULL,
	`agentId` text NOT NULL,
	`workspaceId` text NOT NULL,
	`direction` text NOT NULL,
	`actionTaken` text NOT NULL,
	`triggerContent` text,
	`details` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`guardrailId`) REFERENCES `guardrails`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `violations_guardrail_idx` ON `guardrail_violations` (`guardrailId`);--> statement-breakpoint
CREATE INDEX `violations_agent_idx` ON `guardrail_violations` (`agentId`);--> statement-breakpoint
CREATE INDEX `violations_workspace_idx` ON `guardrail_violations` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `violations_created_at_idx` ON `guardrail_violations` (`createdAt`);--> statement-breakpoint
CREATE TABLE `guardrails` (
	`id` text PRIMARY KEY NOT NULL,
	`agentId` text NOT NULL,
	`workspaceId` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`action` text DEFAULT 'block' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`config` text,
	`message` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `guardrails_agent_idx` ON `guardrails` (`agentId`);--> statement-breakpoint
CREATE INDEX `guardrails_workspace_idx` ON `guardrails` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `guardrails_type_idx` ON `guardrails` (`type`);--> statement-breakpoint
CREATE TABLE `agent_knowledge_bases` (
	`id` text PRIMARY KEY NOT NULL,
	`agentId` text NOT NULL,
	`knowledgeBaseId` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`knowledgeBaseId`) REFERENCES `knowledge_bases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `agent_kb_agent_idx` ON `agent_knowledge_bases` (`agentId`);--> statement-breakpoint
CREATE INDEX `agent_kb_kb_idx` ON `agent_knowledge_bases` (`knowledgeBaseId`);--> statement-breakpoint
CREATE TABLE `document_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`documentId` text NOT NULL,
	`knowledgeBaseId` text NOT NULL,
	`chunkIndex` integer NOT NULL,
	`content` text NOT NULL,
	`tokenCount` integer,
	`vectorId` text,
	`metadata` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`knowledgeBaseId`) REFERENCES `knowledge_bases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chunks_document_idx` ON `document_chunks` (`documentId`);--> statement-breakpoint
CREATE INDEX `chunks_kb_idx` ON `document_chunks` (`knowledgeBaseId`);--> statement-breakpoint
CREATE INDEX `chunks_document_index_idx` ON `document_chunks` (`documentId`,`chunkIndex`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`knowledgeBaseId` text NOT NULL,
	`workspaceId` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`r2Key` text,
	`sourceUrl` text,
	`sizeBytes` integer,
	`chunkCount` integer DEFAULT 0,
	`tokenCount` integer DEFAULT 0,
	`error` text,
	`metadata` text,
	`uploadedBy` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`knowledgeBaseId`) REFERENCES `knowledge_bases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploadedBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `docs_kb_idx` ON `documents` (`knowledgeBaseId`);--> statement-breakpoint
CREATE INDEX `docs_workspace_idx` ON `documents` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `docs_status_idx` ON `documents` (`status`);--> statement-breakpoint
CREATE INDEX `docs_kb_status_idx` ON `documents` (`knowledgeBaseId`,`status`);--> statement-breakpoint
CREATE TABLE `knowledge_bases` (
	`id` text PRIMARY KEY NOT NULL,
	`workspaceId` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`createdBy` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `kb_workspace_idx` ON `knowledge_bases` (`workspaceId`);--> statement-breakpoint
CREATE TABLE `message_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`messageId` text NOT NULL,
	`conversationId` text NOT NULL,
	`agentId` text NOT NULL,
	`workspaceId` text NOT NULL,
	`userId` text,
	`rating` text NOT NULL,
	`comment` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`messageId`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `feedback_message_idx` ON `message_feedback` (`messageId`);--> statement-breakpoint
CREATE INDEX `feedback_agent_idx` ON `message_feedback` (`agentId`);--> statement-breakpoint
CREATE INDEX `feedback_workspace_idx` ON `message_feedback` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `feedback_workspace_agent_idx` ON `message_feedback` (`workspaceId`,`agentId`);--> statement-breakpoint
CREATE INDEX `feedback_created_at_idx` ON `message_feedback` (`createdAt`);--> statement-breakpoint
ALTER TABLE `agents` ADD `conversationStarters` text;--> statement-breakpoint
ALTER TABLE `agents` ADD `guardrailsEnabled` integer DEFAULT false NOT NULL;