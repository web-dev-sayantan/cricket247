CREATE TABLE `organizations` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL,
	`short_name` text,
	`slug` text NOT NULL,
	`code` text,
	`type` text DEFAULT 'association' NOT NULL,
	`scope` text DEFAULT 'local' NOT NULL,
	`country` text,
	`website` text,
	`logo` text,
	`description` text,
	`is_system` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`parent_organization_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_organizations_parent_organization` FOREIGN KEY (`parent_organization_id`) REFERENCES `organizations`(`id`)
);
--> statement-breakpoint
ALTER TABLE `team_players` ADD `tournament_id` integer NOT NULL REFERENCES tournaments(id);--> statement-breakpoint
ALTER TABLE `tournaments` ADD `category` text DEFAULT 'competitive' NOT NULL;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `organization_id` integer NOT NULL REFERENCES organizations(id);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_matches` (
	`id` integer PRIMARY KEY,
	`tournament_id` integer NOT NULL,
	`match_date` integer NOT NULL,
	`toss_winner_id` integer NOT NULL,
	`toss_decision` text NOT NULL,
	`team1_id` integer NOT NULL,
	`team2_id` integer NOT NULL,
	`innings_per_side` integer DEFAULT 1 NOT NULL,
	`overs_per_side` integer DEFAULT 20 NOT NULL,
	`max_over_per_bowler` integer DEFAULT 4 NOT NULL,
	`players_per_side` integer DEFAULT 11 NOT NULL,
	`has_super_sub` integer DEFAULT false NOT NULL,
	`substitutes_per_side` integer DEFAULT 0 NOT NULL,
	`result` text,
	`winner_id` integer,
	`ranked` integer DEFAULT false NOT NULL,
	`is_live` integer DEFAULT true,
	`is_completed` integer DEFAULT false NOT NULL,
	`is_abandoned` integer DEFAULT false NOT NULL,
	`is_tied` integer DEFAULT false NOT NULL,
	`margin` text,
	`player_of_the_match_id` integer,
	`has_lbw` integer DEFAULT false NOT NULL,
	`has_bye` integer DEFAULT true NOT NULL,
	`has_leg_bye` integer DEFAULT false NOT NULL,
	`has_boundary_out` integer DEFAULT false NOT NULL,
	`has_wides` integer DEFAULT true NOT NULL,
	`has_no_balls` integer DEFAULT true NOT NULL,
	`has_penalty_runs` integer DEFAULT false NOT NULL,
	`has_super_over` integer DEFAULT false NOT NULL,
	`venue_id` integer,
	`format` text DEFAULT 'T20' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_matches_tournament_id_tournaments_id_fk` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`),
	CONSTRAINT `fk_matches_toss_winner_id_teams_id_fk` FOREIGN KEY (`toss_winner_id`) REFERENCES `teams`(`id`),
	CONSTRAINT `fk_matches_team1_id_teams_id_fk` FOREIGN KEY (`team1_id`) REFERENCES `teams`(`id`),
	CONSTRAINT `fk_matches_team2_id_teams_id_fk` FOREIGN KEY (`team2_id`) REFERENCES `teams`(`id`),
	CONSTRAINT `fk_matches_winner_id_teams_id_fk` FOREIGN KEY (`winner_id`) REFERENCES `teams`(`id`),
	CONSTRAINT `fk_matches_player_of_the_match_id_players_id_fk` FOREIGN KEY (`player_of_the_match_id`) REFERENCES `players`(`id`),
	CONSTRAINT `fk_matches_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_matches`(`id`, `tournament_id`, `match_date`, `toss_winner_id`, `toss_decision`, `team1_id`, `team2_id`, `innings_per_side`, `overs_per_side`, `max_over_per_bowler`, `players_per_side`, `has_super_sub`, `substitutes_per_side`, `result`, `winner_id`, `ranked`, `is_live`, `is_completed`, `is_abandoned`, `is_tied`, `margin`, `player_of_the_match_id`, `has_lbw`, `has_bye`, `has_leg_bye`, `has_boundary_out`, `has_wides`, `has_no_balls`, `has_penalty_runs`, `has_super_over`, `venue_id`, `format`, `notes`, `created_at`, `updated_at`) SELECT `id`, `tournament_id`, `match_date`, `toss_winner_id`, `toss_decision`, `team1_id`, `team2_id`, `innings_per_side`, `overs_per_side`, `max_over_per_bowler`, `players_per_side`, `has_super_sub`, `substitutes_per_side`, `result`, `winner_id`, `ranked`, `is_live`, `is_completed`, `is_abandoned`, `is_tied`, `margin`, `player_of_the_match_id`, `has_lbw`, `has_bye`, `has_leg_bye`, `has_boundary_out`, `has_wides`, `has_no_balls`, `has_penalty_runs`, `has_super_over`, `venue_id`, `format`, `notes`, `created_at`, `updated_at` FROM `matches`;--> statement-breakpoint
DROP TABLE `matches`;--> statement-breakpoint
ALTER TABLE `__new_matches` RENAME TO `matches`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `unique_team_player`;--> statement-breakpoint
CREATE INDEX `rank_idx` ON `matches` (`winner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_code_unique` ON `organizations` (`code`);--> statement-breakpoint
CREATE INDEX `organizations_parent_idx` ON `organizations` (`parent_organization_id`);--> statement-breakpoint
CREATE INDEX `organizations_active_idx` ON `organizations` (`is_active`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_tournament_player` ON `team_players` (`tournament_id`,`player_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_tournament_team` ON `tournament_teams` (`tournament_id`,`team_id`);--> statement-breakpoint
CREATE INDEX `tournament_organization_idx` ON `tournaments` (`organization_id`);