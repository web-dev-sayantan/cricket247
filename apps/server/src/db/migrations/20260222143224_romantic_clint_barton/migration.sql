CREATE TABLE `team_career_stats` (
	`id` integer PRIMARY KEY,
	`team_id` integer NOT NULL,
	`matches_played` integer DEFAULT 0 NOT NULL,
	`matches_won` integer DEFAULT 0 NOT NULL,
	`matches_lost` integer DEFAULT 0 NOT NULL,
	`matches_tied` integer DEFAULT 0 NOT NULL,
	`matches_drawn` integer DEFAULT 0 NOT NULL,
	`matches_abandoned` integer DEFAULT 0 NOT NULL,
	`points` integer DEFAULT 0 NOT NULL,
	`win_percentage` real DEFAULT 0 NOT NULL,
	`runs_scored` integer DEFAULT 0 NOT NULL,
	`runs_conceded` integer DEFAULT 0 NOT NULL,
	`balls_faced` integer DEFAULT 0 NOT NULL,
	`balls_bowled` integer DEFAULT 0 NOT NULL,
	`net_run_rate` real DEFAULT 0 NOT NULL,
	`trophies_won` integer DEFAULT 0 NOT NULL,
	`recent_form` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_team_career_stats_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_tournament_stats` (
	`id` integer PRIMARY KEY,
	`tournament_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`matches_played` integer DEFAULT 0 NOT NULL,
	`matches_won` integer DEFAULT 0 NOT NULL,
	`matches_lost` integer DEFAULT 0 NOT NULL,
	`matches_tied` integer DEFAULT 0 NOT NULL,
	`matches_drawn` integer DEFAULT 0 NOT NULL,
	`matches_abandoned` integer DEFAULT 0 NOT NULL,
	`points` integer DEFAULT 0 NOT NULL,
	`win_percentage` real DEFAULT 0 NOT NULL,
	`runs_scored` integer DEFAULT 0 NOT NULL,
	`runs_conceded` integer DEFAULT 0 NOT NULL,
	`balls_faced` integer DEFAULT 0 NOT NULL,
	`balls_bowled` integer DEFAULT 0 NOT NULL,
	`net_run_rate` real DEFAULT 0 NOT NULL,
	`recent_form` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_team_tournament_stats_tournament_id_tournaments_id_fk` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`),
	CONSTRAINT `fk_team_tournament_stats_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`)
);
--> statement-breakpoint
ALTER TABLE `teams` ADD `logo` text;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `champion_team_id` integer REFERENCES teams(id);--> statement-breakpoint
CREATE UNIQUE INDEX `team_career_stats_team_unique` ON `team_career_stats` (`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_tournament_stats_unique` ON `team_tournament_stats` (`tournament_id`,`team_id`);--> statement-breakpoint
CREATE INDEX `team_tournament_stats_team_idx` ON `team_tournament_stats` (`team_id`);--> statement-breakpoint
CREATE INDEX `team_tournament_stats_tournament_idx` ON `team_tournament_stats` (`tournament_id`);