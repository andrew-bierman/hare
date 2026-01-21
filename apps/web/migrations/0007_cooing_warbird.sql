CREATE TABLE `webhook_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`webhookId` text NOT NULL,
	`event` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`statusCode` integer,
	`responseBody` text,
	`attemptCount` integer DEFAULT 0 NOT NULL,
	`nextRetryAt` integer,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`webhookId`) REFERENCES `webhooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhook_deliveries_webhook_id_idx` ON `webhook_deliveries` (`webhookId`);--> statement-breakpoint
CREATE INDEX `webhook_deliveries_created_at_idx` ON `webhook_deliveries` (`createdAt`);