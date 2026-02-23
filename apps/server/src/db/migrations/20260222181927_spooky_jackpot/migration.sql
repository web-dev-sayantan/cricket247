ALTER TABLE `tournaments` ADD `type` text DEFAULT 'league' NOT NULL;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `gender_allowed` text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `age_limit` integer DEFAULT 100;