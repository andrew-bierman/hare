CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspaceId` text NOT NULL,
	`userId` text NOT NULL,
	`action` text NOT NULL,
	`resourceType` text NOT NULL,
	`resourceId` text,
	`details` text,
	`ipAddress` text,
	`userAgent` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `audit_logs_workspace_id_idx` ON `audit_logs` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `audit_logs_workspace_created_idx` ON `audit_logs` (`workspaceId`,`createdAt`);