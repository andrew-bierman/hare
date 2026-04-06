ALTER TABLE `workspaces` ADD `creditsBalance` integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `freeCreditsResetAt` integer;