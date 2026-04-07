ALTER TABLE `workspaces` ADD `creditsBalance` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `freeCreditsResetAt` integer;