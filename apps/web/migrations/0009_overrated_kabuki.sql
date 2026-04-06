CREATE TABLE `subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`plan` text NOT NULL,
	`referenceId` text NOT NULL,
	`stripeCustomerId` text,
	`stripeSubscriptionId` text,
	`status` text,
	`periodStart` integer,
	`periodEnd` integer,
	`cancelAtPeriodEnd` integer,
	`seats` integer,
	`trialStart` integer,
	`trialEnd` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `user` ADD `stripeCustomerId` text;