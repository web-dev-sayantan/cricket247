CREATE TABLE `tournament_stages` (
	`id` integer PRIMARY KEY NOT NULL,
	`tournament_id` integer NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`stage_type` text DEFAULT 'league' NOT NULL,
	`format` text DEFAULT 'single_round_robin' NOT NULL,
	`sequence` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'upcoming' NOT NULL,
	`parent_stage_id` integer,
	`qualification_slots` integer DEFAULT 0 NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_stage_id`) REFERENCES `tournament_stages`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `tournament_stages_tournament_idx` ON `tournament_stages` (`tournament_id`);--> statement-breakpoint
CREATE INDEX `tournament_stages_sequence_idx` ON `tournament_stages` (`tournament_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_stages_tournament_sequence_unique` ON `tournament_stages` (`tournament_id`,`sequence`);--> statement-breakpoint

CREATE TABLE `tournament_stage_groups` (
	`id` integer PRIMARY KEY NOT NULL,
	`stage_id` integer NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`sequence` integer DEFAULT 1 NOT NULL,
	`advancing_slots` integer DEFAULT 0 NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`stage_id`) REFERENCES `tournament_stages`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `tournament_stage_groups_stage_idx` ON `tournament_stage_groups` (`stage_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_stage_groups_stage_sequence_unique` ON `tournament_stage_groups` (`stage_id`,`sequence`);--> statement-breakpoint

CREATE TABLE `tournament_stage_team_entries` (
	`id` integer PRIMARY KEY NOT NULL,
	`tournament_id` integer NOT NULL,
	`stage_id` integer NOT NULL,
	`stage_group_id` integer,
	`team_id` integer NOT NULL,
	`seed` integer,
	`entry_source` text DEFAULT 'direct' NOT NULL,
	`is_qualified` integer DEFAULT false NOT NULL,
	`is_eliminated` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stage_id`) REFERENCES `tournament_stages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stage_group_id`) REFERENCES `tournament_stage_groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_stage_team_entries_stage_team_unique` ON `tournament_stage_team_entries` (`stage_id`,`team_id`);--> statement-breakpoint
CREATE INDEX `tournament_stage_team_entries_tournament_idx` ON `tournament_stage_team_entries` (`tournament_id`);--> statement-breakpoint
CREATE INDEX `tournament_stage_team_entries_group_idx` ON `tournament_stage_team_entries` (`stage_group_id`);--> statement-breakpoint

CREATE TABLE `tournament_stage_advancements` (
	`id` integer PRIMARY KEY NOT NULL,
	`from_stage_id` integer NOT NULL,
	`from_stage_group_id` integer,
	`position_from` integer NOT NULL,
	`to_stage_id` integer NOT NULL,
	`to_slot` integer NOT NULL,
	`qualification_type` text DEFAULT 'position' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`from_stage_id`) REFERENCES `tournament_stages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_stage_group_id`) REFERENCES `tournament_stage_groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_stage_id`) REFERENCES `tournament_stages`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_stage_advancements_from_position_unique` ON `tournament_stage_advancements` (`from_stage_id`,`from_stage_group_id`,`position_from`);--> statement-breakpoint
CREATE INDEX `tournament_stage_advancements_to_stage_idx` ON `tournament_stage_advancements` (`to_stage_id`);--> statement-breakpoint

ALTER TABLE `matches` ADD `stage_id` integer REFERENCES `tournament_stages`(`id`);--> statement-breakpoint
ALTER TABLE `matches` ADD `stage_group_id` integer REFERENCES `tournament_stage_groups`(`id`);--> statement-breakpoint
ALTER TABLE `matches` ADD `stage_round` integer;--> statement-breakpoint
ALTER TABLE `matches` ADD `stage_sequence` integer;--> statement-breakpoint
ALTER TABLE `matches` ADD `knockout_leg` integer DEFAULT 1 NOT NULL;--> statement-breakpoint

CREATE TABLE `match_participant_sources` (
	`id` integer PRIMARY KEY NOT NULL,
	`match_id` integer NOT NULL,
	`team_slot` integer DEFAULT 1 NOT NULL,
	`source_type` text DEFAULT 'team' NOT NULL,
	`source_team_id` integer,
	`source_match_id` integer,
	`source_stage_id` integer,
	`source_stage_group_id` integer,
	`source_position` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_stage_id`) REFERENCES `tournament_stages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_stage_group_id`) REFERENCES `tournament_stage_groups`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX `match_participant_sources_match_slot_unique` ON `match_participant_sources` (`match_id`,`team_slot`);--> statement-breakpoint
CREATE INDEX `match_participant_sources_source_match_idx` ON `match_participant_sources` (`source_match_id`);--> statement-breakpoint
CREATE INDEX `match_participant_sources_source_stage_idx` ON `match_participant_sources` (`source_stage_id`);