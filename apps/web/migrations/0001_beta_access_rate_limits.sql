-- Add beta access and rate limiting tables
CREATE TABLE `beta_access` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`email` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text,
	`grantedBy` text,
	`grantedAt` integer NOT NULL,
	`lastAccessAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`grantedBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `beta_access_userId_unique` ON `beta_access` (`userId`);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`endpoint` text NOT NULL,
	`requestCount` integer DEFAULT 0 NOT NULL,
	`tokenCount` integer DEFAULT 0 NOT NULL,
	`windowStart` integer NOT NULL,
	`windowEnd` integer NOT NULL,
	`metadata` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rate_limits_userId_endpoint_idx` ON `rate_limits` (`userId`, `endpoint`);
--> statement-breakpoint
CREATE INDEX `rate_limits_windowEnd_idx` ON `rate_limits` (`windowEnd`);
