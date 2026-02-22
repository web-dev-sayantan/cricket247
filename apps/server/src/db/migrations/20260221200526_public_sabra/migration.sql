CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY,
	`user_id` integer NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`id_token` text,
	`password` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `deliveries` (
	`id` integer PRIMARY KEY,
	`innings_id` integer NOT NULL,
	`sequence_no` integer NOT NULL,
	`over_number` integer NOT NULL,
	`ball_in_over` integer NOT NULL,
	`is_legal_delivery` integer DEFAULT true NOT NULL,
	`striker_id` integer NOT NULL,
	`non_striker_id` integer NOT NULL,
	`bowler_id` integer NOT NULL,
	`batter_runs` integer DEFAULT 0 NOT NULL,
	`wide_runs` integer DEFAULT 0 NOT NULL,
	`no_ball_runs` integer DEFAULT 0 NOT NULL,
	`bye_runs` integer DEFAULT 0 NOT NULL,
	`leg_bye_runs` integer DEFAULT 0 NOT NULL,
	`penalty_runs` integer DEFAULT 0 NOT NULL,
	`total_runs` integer DEFAULT 0 NOT NULL,
	`is_wicket` integer DEFAULT false NOT NULL,
	`wicket_type` text,
	`dismissed_player_id` integer,
	`dismissed_by_id` integer,
	`assisted_by_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_deliveries_innings_id_innings_id_fk` FOREIGN KEY (`innings_id`) REFERENCES `innings`(`id`),
	CONSTRAINT `fk_deliveries_striker_id_players_id_fk` FOREIGN KEY (`striker_id`) REFERENCES `players`(`id`),
	CONSTRAINT `fk_deliveries_non_striker_id_players_id_fk` FOREIGN KEY (`non_striker_id`) REFERENCES `players`(`id`),
	CONSTRAINT `fk_deliveries_bowler_id_players_id_fk` FOREIGN KEY (`bowler_id`) REFERENCES `players`(`id`),
	CONSTRAINT `fk_deliveries_dismissed_player_id_players_id_fk` FOREIGN KEY (`dismissed_player_id`) REFERENCES `players`(`id`),
	CONSTRAINT `fk_deliveries_dismissed_by_id_players_id_fk` FOREIGN KEY (`dismissed_by_id`) REFERENCES `players`(`id`),
	CONSTRAINT `fk_deliveries_assisted_by_id_players_id_fk` FOREIGN KEY (`assisted_by_id`) REFERENCES `players`(`id`)
);
--> statement-breakpoint
CREATE TABLE `innings` (
	`id` integer PRIMARY KEY,
	`match_id` integer NOT NULL,
	`batting_team_id` integer NOT NULL,
	`bowling_team_id` integer NOT NULL,
	`innings_number` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`total_score` integer DEFAULT 0 NOT NULL,
	`wickets` integer DEFAULT 0 NOT NULL,
	`balls_bowled` integer DEFAULT 0 NOT NULL,
	`wides` integer DEFAULT 0 NOT NULL,
	`no_balls` integer DEFAULT 0 NOT NULL,
	`byes` integer DEFAULT 0 NOT NULL,
	`leg_byes` integer DEFAULT 0 NOT NULL,
	`penalty_runs` integer DEFAULT 0 NOT NULL,
	`others` integer DEFAULT 0 NOT NULL,
	`target_runs` integer,
	`is_completed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_innings_match_id_matches_id_fk` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`),
	CONSTRAINT `fk_innings_batting_team_id_teams_id_fk` FOREIGN KEY (`batting_team_id`) REFERENCES `teams`(`id`),
	CONSTRAINT `fk_innings_bowling_team_id_teams_id_fk` FOREIGN KEY (`bowling_team_id`) REFERENCES `teams`(`id`)
);
--> statement-breakpoint
CREATE TABLE `match_lineup` (
	`id` integer PRIMARY KEY,
	`match_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`batting_order` integer,
	`is_captain` integer DEFAULT false NOT NULL,
	`is_vice_captain` integer DEFAULT false NOT NULL,
	`is_wicket_keeper` integer DEFAULT false NOT NULL,
	`is_substitute` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_match_lineup_match_id_matches_id_fk` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`),
	CONSTRAINT `fk_match_lineup_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`),
	CONSTRAINT `fk_match_lineup_player_id_players_id_fk` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` integer PRIMARY KEY,
	`tournament_id` integer,
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
CREATE TABLE `passkeys` (
	`id` integer PRIMARY KEY,
	`name` text,
	`public_key` text NOT NULL,
	`user_id` integer NOT NULL,
	`credential_id` text NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`device_type` text NOT NULL,
	`backed_up` integer DEFAULT false NOT NULL,
	`transports` text NOT NULL,
	`aaguid` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_passkeys_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `player_career_stats` (
	`id` integer PRIMARY KEY,
	`player_id` integer NOT NULL,
	`format` text NOT NULL,
	`matches_played` integer DEFAULT 0 NOT NULL,
	`runs_scored` integer DEFAULT 0 NOT NULL,
	`balls_faced` integer DEFAULT 0 NOT NULL,
	`fours` integer DEFAULT 0 NOT NULL,
	`sixes` integer DEFAULT 0 NOT NULL,
	`avg_strike_rate` real DEFAULT 0 NOT NULL,
	`highest_score` integer DEFAULT 0 NOT NULL,
	`fifties` integer DEFAULT 0 NOT NULL,
	`hundreds` integer DEFAULT 0 NOT NULL,
	`balls_bowled` integer DEFAULT 0 NOT NULL,
	`runs_conceded` integer DEFAULT 0 NOT NULL,
	`wickets_taken` integer DEFAULT 0 NOT NULL,
	`avg_economy` real DEFAULT 0 NOT NULL,
	`best_bowling` text,
	`fifers` integer DEFAULT 0 NOT NULL,
	`catches` integer DEFAULT 0 NOT NULL,
	`run_outs` integer DEFAULT 0 NOT NULL,
	`stumpings` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_player_career_stats_player_id_players_id_fk` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`)
);
--> statement-breakpoint
CREATE TABLE `player_innings_stats` (
	`id` integer PRIMARY KEY,
	`innings_id` integer NOT NULL,
	`match_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`batting_order` integer,
	`runs_scored` integer DEFAULT 0 NOT NULL,
	`balls_faced` integer DEFAULT 0 NOT NULL,
	`fours` integer DEFAULT 0 NOT NULL,
	`sixes` integer DEFAULT 0 NOT NULL,
	`is_dismissed` integer DEFAULT false NOT NULL,
	`dismissal_type` text,
	`dismissed_by_id` integer,
	`assisted_by_id` integer,
	`balls_bowled` integer DEFAULT 0 NOT NULL,
	`maidens` integer DEFAULT 0 NOT NULL,
	`runs_conceded` integer DEFAULT 0 NOT NULL,
	`wickets_taken` integer DEFAULT 0 NOT NULL,
	`wides` integer DEFAULT 0 NOT NULL,
	`no_balls` integer DEFAULT 0 NOT NULL,
	`dot_balls` integer DEFAULT 0 NOT NULL,
	`catches` integer DEFAULT 0 NOT NULL,
	`run_outs` integer DEFAULT 0 NOT NULL,
	`stumpings` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_player_innings_stats_innings_id_innings_id_fk` FOREIGN KEY (`innings_id`) REFERENCES `innings`(`id`),
	CONSTRAINT `fk_player_innings_stats_match_id_matches_id_fk` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`),
	CONSTRAINT `fk_player_innings_stats_player_id_players_id_fk` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`),
	CONSTRAINT `fk_player_innings_stats_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`),
	CONSTRAINT `fk_player_innings_stats_dismissed_by_id_players_id_fk` FOREIGN KEY (`dismissed_by_id`) REFERENCES `players`(`id`),
	CONSTRAINT `fk_player_innings_stats_assisted_by_id_players_id_fk` FOREIGN KEY (`assisted_by_id`) REFERENCES `players`(`id`)
);
--> statement-breakpoint
CREATE TABLE `player_tournament_stats` (
	`id` integer PRIMARY KEY,
	`player_id` integer NOT NULL,
	`tournament_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`matches_played` integer DEFAULT 0 NOT NULL,
	`runs_scored` integer DEFAULT 0 NOT NULL,
	`balls_faced` integer DEFAULT 0 NOT NULL,
	`fours` integer DEFAULT 0 NOT NULL,
	`sixes` integer DEFAULT 0 NOT NULL,
	`avg_strike_rate` real DEFAULT 0 NOT NULL,
	`highest_score` integer DEFAULT 0 NOT NULL,
	`fifties` integer DEFAULT 0 NOT NULL,
	`hundreds` integer DEFAULT 0 NOT NULL,
	`balls_bowled` integer DEFAULT 0 NOT NULL,
	`runs_conceded` integer DEFAULT 0 NOT NULL,
	`wickets_taken` integer DEFAULT 0 NOT NULL,
	`avg_economy` real DEFAULT 0 NOT NULL,
	`best_bowling` text,
	`fifers` integer DEFAULT 0 NOT NULL,
	`catches` integer DEFAULT 0 NOT NULL,
	`run_outs` integer DEFAULT 0 NOT NULL,
	`stumpings` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_player_tournament_stats_player_id_players_id_fk` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`),
	CONSTRAINT `fk_player_tournament_stats_tournament_id_tournaments_id_fk` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`),
	CONSTRAINT `fk_player_tournament_stats_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`)
);
--> statement-breakpoint
CREATE TABLE `player_verification` (
	`id` integer PRIMARY KEY,
	`player_id` integer NOT NULL,
	`verification_type` text NOT NULL,
	`verification_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_player_verification_player_id_players_id_fk` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`)
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL,
	`age` integer DEFAULT 0 NOT NULL,
	`dob` integer DEFAULT (unixepoch()) NOT NULL,
	`sex` text DEFAULT 'unknown' NOT NULL,
	`nationality` text,
	`height` integer,
	`weight` integer,
	`image` text,
	`role` text DEFAULT 'Batter' NOT NULL,
	`batting_stance` text DEFAULT 'Right handed' NOT NULL,
	`bowling_stance` text,
	`is_wicket_keeper` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY,
	`user_id` integer NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`factors` text,
	`last_active_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_players` (
	`id` integer PRIMARY KEY,
	`team_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`is_captain` integer DEFAULT false NOT NULL,
	`is_vice_captain` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_team_players_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`),
	CONSTRAINT `fk_team_players_player_id_players_id_fk` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`base_location` text,
	`country` text DEFAULT 'Unknown' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tournament_teams` (
	`id` integer PRIMARY KEY,
	`tournament_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`points` integer DEFAULT 0,
	`matches_played` integer DEFAULT 0,
	`matches_won` integer DEFAULT 0,
	`matches_lost` integer DEFAULT 0,
	`matches_tied` integer DEFAULT 0,
	`matches_drawn` integer DEFAULT 0,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_tournament_teams_tournament_id_tournaments_id_fk` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`),
	CONSTRAINT `fk_tournament_teams_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`format` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL,
	`username` text UNIQUE,
	`display_username` text UNIQUE,
	`email` text NOT NULL UNIQUE,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`phone_number` text UNIQUE,
	`phone_number_verified` integer DEFAULT false NOT NULL,
	`auth_provider` text,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `venues` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL,
	`location` text,
	`street` text,
	`city` text,
	`state` text,
	`country` text,
	`pincode` text,
	`capacity` integer DEFAULT 0,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` integer PRIMARY KEY,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_innings_sequence` ON `deliveries` (`innings_id`,`sequence_no`);--> statement-breakpoint
CREATE INDEX `delivery_over_idx` ON `deliveries` (`innings_id`,`over_number`,`ball_in_over`);--> statement-breakpoint
CREATE INDEX `delivery_bowler_idx` ON `deliveries` (`innings_id`,`bowler_id`);--> statement-breakpoint
CREATE INDEX `delivery_striker_idx` ON `deliveries` (`innings_id`,`striker_id`);--> statement-breakpoint
CREATE INDEX `delivery_innings_idx` ON `deliveries` (`innings_id`);--> statement-breakpoint
CREATE INDEX `innings_match_idx` ON `innings` (`match_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_match_innings_number` ON `innings` (`match_id`,`innings_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_match_lineup_player` ON `match_lineup` (`match_id`,`team_id`,`player_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_match_lineup_batting_order` ON `match_lineup` (`match_id`,`team_id`,`batting_order`);--> statement-breakpoint
CREATE INDEX `match_lineup_match_idx` ON `match_lineup` (`match_id`);--> statement-breakpoint
CREATE INDEX `match_lineup_team_idx` ON `match_lineup` (`team_id`);--> statement-breakpoint
CREATE INDEX `rank_idx` ON `matches` (`winner_id`);--> statement-breakpoint
CREATE INDEX `passkey_user_idx` ON `passkeys` (`user_id`);--> statement-breakpoint
CREATE INDEX `passkey_credential_idx` ON `passkeys` (`credential_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_player_innings_stats` ON `player_innings_stats` (`innings_id`,`player_id`);--> statement-breakpoint
CREATE INDEX `player_innings_stats_match_idx` ON `player_innings_stats` (`match_id`);--> statement-breakpoint
CREATE INDEX `player_innings_stats_team_idx` ON `player_innings_stats` (`team_id`);--> statement-breakpoint
CREATE INDEX `player_innings_stats_player_idx` ON `player_innings_stats` (`player_id`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_expires_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_team_player` ON `team_players` (`team_id`,`player_id`);