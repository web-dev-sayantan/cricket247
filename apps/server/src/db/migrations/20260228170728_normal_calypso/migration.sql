CREATE TABLE `account` (
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
	CONSTRAINT `fk_account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
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
CREATE TABLE `fixture_change_log` (
	`id` integer PRIMARY KEY,
	`tournament_id` integer NOT NULL,
	`stage_id` integer,
	`fixture_version_id` integer,
	`fixture_round_id` integer,
	`match_id` integer,
	`action` text DEFAULT 'updated' NOT NULL,
	`reason` text,
	`payload` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_fixture_change_log_tournament_id_tournaments_id_fk` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`),
	CONSTRAINT `fk_fixture_change_log_stage_id_tournament_stages_id_fk` FOREIGN KEY (`stage_id`) REFERENCES `tournament_stages`(`id`),
	CONSTRAINT `fk_fixture_change_log_fixture_version_id_fixture_versions_id_fk` FOREIGN KEY (`fixture_version_id`) REFERENCES `fixture_versions`(`id`),
	CONSTRAINT `fk_fixture_change_log_fixture_round_id_fixture_rounds_id_fk` FOREIGN KEY (`fixture_round_id`) REFERENCES `fixture_rounds`(`id`),
	CONSTRAINT `fk_fixture_change_log_match_id_matches_id_fk` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`)
);
--> statement-breakpoint
CREATE TABLE `fixture_constraints` (
	`id` integer PRIMARY KEY,
	`tournament_id` integer NOT NULL,
	`stage_id` integer,
	`team_id` integer,
	`venue_id` integer,
	`constraint_type` text NOT NULL,
	`rule` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_fixture_constraints_tournament_id_tournaments_id_fk` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`),
	CONSTRAINT `fk_fixture_constraints_stage_id_tournament_stages_id_fk` FOREIGN KEY (`stage_id`) REFERENCES `tournament_stages`(`id`),
	CONSTRAINT `fk_fixture_constraints_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`),
	CONSTRAINT `fk_fixture_constraints_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`)
);
--> statement-breakpoint
CREATE TABLE `fixture_rounds` (
	`id` integer PRIMARY KEY,
	`tournament_id` integer NOT NULL,
	`stage_id` integer NOT NULL,
	`stage_group_id` integer,
	`fixture_version_id` integer,
	`round_number` integer NOT NULL,
	`round_name` text,
	`pairing_method` text DEFAULT 'manual' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`scheduled_start_at` integer,
	`scheduled_end_at` integer,
	`lock_at` integer,
	`published_at` integer,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_fixture_rounds_tournament_id_tournaments_id_fk` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`),
	CONSTRAINT `fk_fixture_rounds_stage_id_tournament_stages_id_fk` FOREIGN KEY (`stage_id`) REFERENCES `tournament_stages`(`id`),
	CONSTRAINT `fk_fixture_rounds_stage_group_id_tournament_stage_groups_id_fk` FOREIGN KEY (`stage_group_id`) REFERENCES `tournament_stage_groups`(`id`),
	CONSTRAINT `fk_fixture_rounds_fixture_version_id_fixture_versions_id_fk` FOREIGN KEY (`fixture_version_id`) REFERENCES `fixture_versions`(`id`)
);
--> statement-breakpoint
CREATE TABLE `fixture_version_matches` (
	`id` integer PRIMARY KEY,
	`fixture_version_id` integer NOT NULL,
	`match_id` integer NOT NULL,
	`sequence` integer DEFAULT 1 NOT NULL,
	`snapshot` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_fixture_version_matches_fixture_version_id_fixture_versions_id_fk` FOREIGN KEY (`fixture_version_id`) REFERENCES `fixture_versions`(`id`),
	CONSTRAINT `fk_fixture_version_matches_match_id_matches_id_fk` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`)
);
--> statement-breakpoint
CREATE TABLE `fixture_versions` (
	`id` integer PRIMARY KEY,
	`tournament_id` integer NOT NULL,
	`stage_id` integer,
	`version_number` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`label` text,
	`published_at` integer,
	`archived_at` integer,
	`checksum` text,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_fixture_versions_tournament_id_tournaments_id_fk` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`),
	CONSTRAINT `fk_fixture_versions_stage_id_tournament_stages_id_fk` FOREIGN KEY (`stage_id`) REFERENCES `tournament_stages`(`id`)
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
CREATE TABLE `match_formats` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL,
	`description` text,
	`no_of_innings` integer DEFAULT 2 NOT NULL,
	`no_of_overs` integer DEFAULT 20 NOT NULL,
	`balls_per_over` integer DEFAULT 6 NOT NULL,
	`max_legal_balls_per_innings` integer,
	`max_overs_per_bowler` integer DEFAULT 4 NOT NULL,
	`players_per_side` integer DEFAULT 11 NOT NULL,
	`is_draw_allowed` integer DEFAULT false NOT NULL,
	`is_super_over_allowed` integer DEFAULT false NOT NULL,
	`minutes_per_innings` integer,
	`innings_break_minutes` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
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
CREATE TABLE `match_participant_sources` (
	`id` integer PRIMARY KEY,
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
	CONSTRAINT `fk_match_participant_sources_match_id_matches_id_fk` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`),
	CONSTRAINT `fk_match_participant_sources_source_team_id_teams_id_fk` FOREIGN KEY (`source_team_id`) REFERENCES `teams`(`id`),
	CONSTRAINT `fk_match_participant_sources_source_match_id_matches_id_fk` FOREIGN KEY (`source_match_id`) REFERENCES `matches`(`id`),
	CONSTRAINT `fk_match_participant_sources_source_stage_id_tournament_stages_id_fk` FOREIGN KEY (`source_stage_id`) REFERENCES `tournament_stages`(`id`),
	CONSTRAINT `fk_match_participant_sources_source_stage_group_id_tournament_stage_groups_id_fk` FOREIGN KEY (`source_stage_group_id`) REFERENCES `tournament_stage_groups`(`id`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` integer PRIMARY KEY,
	`tournament_id` integer NOT NULL,
	`match_format_id` integer,
	`match_date` integer NOT NULL,
	`toss_winner_id` integer NOT NULL,
	`toss_decision` text NOT NULL,
	`team1_id` integer NOT NULL,
	`team2_id` integer NOT NULL,
	`innings_per_side` integer DEFAULT 1 NOT NULL,
	`overs_per_side` integer DEFAULT 20 NOT NULL,
	`max_over_per_bowler` integer DEFAULT 4 NOT NULL,
	`balls_per_over_snapshot` integer DEFAULT 6 NOT NULL,
	`max_legal_balls_per_innings_snapshot` integer,
	`max_overs_per_bowler_snapshot` integer,
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
	`stage_id` integer,
	`stage_group_id` integer,
	`fixture_round_id` integer,
	`stage_round` integer,
	`stage_sequence` integer,
	`knockout_leg` integer DEFAULT 1 NOT NULL,
	`fixture_status` text DEFAULT 'draft' NOT NULL,
	`scheduled_start_at` integer,
	`scheduled_end_at` integer,
	`time_zone` text DEFAULT 'UTC' NOT NULL,
	`published_at` integer,
	`fixture_version` integer DEFAULT 1 NOT NULL,
	`previous_schedule_match_id` integer,
	`reschedule_reason` text,
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
	CONSTRAINT `fk_matches_match_format_id_match_formats_id_fk` FOREIGN KEY (`match_format_id`) REFERENCES `match_formats`(`id`),
	CONSTRAINT `fk_matches_toss_winner_id_teams_id_fk` FOREIGN KEY (`toss_winner_id`) REFERENCES `teams`(`id`),
	CONSTRAINT `fk_matches_team1_id_teams_id_fk` FOREIGN KEY (`team1_id`) REFERENCES `teams`(`id`),
	CONSTRAINT `fk_matches_team2_id_teams_id_fk` FOREIGN KEY (`team2_id`) REFERENCES `teams`(`id`),
	CONSTRAINT `fk_matches_winner_id_teams_id_fk` FOREIGN KEY (`winner_id`) REFERENCES `teams`(`id`),
	CONSTRAINT `fk_matches_player_of_the_match_id_players_id_fk` FOREIGN KEY (`player_of_the_match_id`) REFERENCES `players`(`id`),
	CONSTRAINT `fk_matches_stage_id_tournament_stages_id_fk` FOREIGN KEY (`stage_id`) REFERENCES `tournament_stages`(`id`),
	CONSTRAINT `fk_matches_stage_group_id_tournament_stage_groups_id_fk` FOREIGN KEY (`stage_group_id`) REFERENCES `tournament_stage_groups`(`id`),
	CONSTRAINT `fk_matches_fixture_round_id_fixture_rounds_id_fk` FOREIGN KEY (`fixture_round_id`) REFERENCES `fixture_rounds`(`id`),
	CONSTRAINT `fk_matches_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`),
	CONSTRAINT `fk_matches_previous_schedule_match` FOREIGN KEY (`previous_schedule_match_id`) REFERENCES `matches`(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_venues` (
	`id` integer PRIMARY KEY,
	`organization_id` integer NOT NULL,
	`venue_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_organization_venues_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`),
	CONSTRAINT `fk_organization_venues_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `passkey` (
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
	CONSTRAINT `fk_passkey_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
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
	`user_id` integer,
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
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_players_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
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
	CONSTRAINT `fk_session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
);
--> statement-breakpoint
CREATE TABLE `swiss_round_standings` (
	`id` integer PRIMARY KEY,
	`tournament_id` integer NOT NULL,
	`stage_id` integer NOT NULL,
	`fixture_round_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`position` integer,
	`points` real DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`ties` integer DEFAULT 0 NOT NULL,
	`byes` integer DEFAULT 0 NOT NULL,
	`tie_break1` real DEFAULT 0 NOT NULL,
	`tie_break2` real DEFAULT 0 NOT NULL,
	`tie_break3` real DEFAULT 0 NOT NULL,
	`opponent_team_ids` text DEFAULT '[]' NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_swiss_round_standings_tournament_id_tournaments_id_fk` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`),
	CONSTRAINT `fk_swiss_round_standings_stage_id_tournament_stages_id_fk` FOREIGN KEY (`stage_id`) REFERENCES `tournament_stages`(`id`),
	CONSTRAINT `fk_swiss_round_standings_fixture_round_id_fixture_rounds_id_fk` FOREIGN KEY (`fixture_round_id`) REFERENCES `fixture_rounds`(`id`),
	CONSTRAINT `fk_swiss_round_standings_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `team_players` (
	`id` integer PRIMARY KEY,
	`tournament_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`is_captain` integer DEFAULT false NOT NULL,
	`is_vice_captain` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_team_players_tournament_id_tournaments_id_fk` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`),
	CONSTRAINT `fk_team_players_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`),
	CONSTRAINT `fk_team_players_player_id_players_id_fk` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`),
	CONSTRAINT `fk_team_players_tournament_team` FOREIGN KEY (`tournament_id`,`team_id`) REFERENCES `tournament_teams`(`tournament_id`,`team_id`)
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
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`base_location` text,
	`country` text DEFAULT 'Unknown' NOT NULL,
	`logo` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tournament_stage_advancements` (
	`id` integer PRIMARY KEY,
	`from_stage_id` integer NOT NULL,
	`from_stage_group_id` integer,
	`position_from` integer NOT NULL,
	`to_stage_id` integer NOT NULL,
	`to_slot` integer NOT NULL,
	`qualification_type` text DEFAULT 'position' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_tournament_stage_advancements_from_stage_id_tournament_stages_id_fk` FOREIGN KEY (`from_stage_id`) REFERENCES `tournament_stages`(`id`),
	CONSTRAINT `fk_tournament_stage_advancements_from_stage_group_id_tournament_stage_groups_id_fk` FOREIGN KEY (`from_stage_group_id`) REFERENCES `tournament_stage_groups`(`id`),
	CONSTRAINT `fk_tournament_stage_advancements_to_stage_id_tournament_stages_id_fk` FOREIGN KEY (`to_stage_id`) REFERENCES `tournament_stages`(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournament_stage_groups` (
	`id` integer PRIMARY KEY,
	`stage_id` integer NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`sequence` integer DEFAULT 1 NOT NULL,
	`advancing_slots` integer DEFAULT 0 NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_tournament_stage_groups_stage_id_tournament_stages_id_fk` FOREIGN KEY (`stage_id`) REFERENCES `tournament_stages`(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournament_stage_team_entries` (
	`id` integer PRIMARY KEY,
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
	CONSTRAINT `fk_tournament_stage_team_entries_tournament_id_tournaments_id_fk` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`),
	CONSTRAINT `fk_tournament_stage_team_entries_stage_id_tournament_stages_id_fk` FOREIGN KEY (`stage_id`) REFERENCES `tournament_stages`(`id`),
	CONSTRAINT `fk_tournament_stage_team_entries_stage_group_id_tournament_stage_groups_id_fk` FOREIGN KEY (`stage_group_id`) REFERENCES `tournament_stage_groups`(`id`),
	CONSTRAINT `fk_tournament_stage_team_entries_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournament_stages` (
	`id` integer PRIMARY KEY,
	`tournament_id` integer NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`stage_type` text DEFAULT 'league' NOT NULL,
	`format` text DEFAULT 'single_round_robin' NOT NULL,
	`sequence` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'upcoming' NOT NULL,
	`fixture_status` text DEFAULT 'draft' NOT NULL,
	`parent_stage_id` integer,
	`qualification_slots` integer DEFAULT 0 NOT NULL,
	`scheduled_start_at` integer,
	`scheduled_end_at` integer,
	`lock_at` integer,
	`published_at` integer,
	`fixture_version` integer DEFAULT 1 NOT NULL,
	`match_format_id` integer NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_tournament_stages_tournament_id_tournaments_id_fk` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`),
	CONSTRAINT `fk_tournament_stages_match_format_id_match_formats_id_fk` FOREIGN KEY (`match_format_id`) REFERENCES `match_formats`(`id`),
	CONSTRAINT `fk_tournament_stages_parent_stage` FOREIGN KEY (`parent_stage_id`) REFERENCES `tournament_stages`(`id`)
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
CREATE TABLE `tournament_venues` (
	`id` integer PRIMARY KEY,
	`tournament_id` integer NOT NULL,
	`venue_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_tournament_venues_tournament_id_tournaments_id_fk` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`),
	CONSTRAINT `fk_tournament_venues_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL,
	`category` text DEFAULT 'competitive' NOT NULL,
	`season` text,
	`type` text DEFAULT 'league' NOT NULL,
	`gender_allowed` text DEFAULT 'open' NOT NULL,
	`age_limit` integer DEFAULT 100,
	`organization_id` integer NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`default_match_format_id` integer NOT NULL,
	`champion_team_id` integer,
	`fixture_published_at` integer,
	`active_fixture_version` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_tournaments_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`),
	CONSTRAINT `fk_tournaments_default_match_format_id_match_formats_id_fk` FOREIGN KEY (`default_match_format_id`) REFERENCES `match_formats`(`id`),
	CONSTRAINT `fk_tournaments_champion_team_id_teams_id_fk` FOREIGN KEY (`champion_team_id`) REFERENCES `teams`(`id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL,
	`username` text UNIQUE,
	`display_username` text UNIQUE,
	`email` text NOT NULL UNIQUE,
	`email_verified` integer DEFAULT false NOT NULL,
	`onboarding_seen_at` integer,
	`onboarding_completed_at` integer,
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
	`lights` integer DEFAULT false NOT NULL,
	`opening_time` integer DEFAULT 480 NOT NULL,
	`closing_time` integer DEFAULT 1080 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verification` (
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
CREATE INDEX `fixture_change_log_tournament_idx` ON `fixture_change_log` (`tournament_id`);--> statement-breakpoint
CREATE INDEX `fixture_change_log_stage_idx` ON `fixture_change_log` (`stage_id`);--> statement-breakpoint
CREATE INDEX `fixture_change_log_version_idx` ON `fixture_change_log` (`fixture_version_id`);--> statement-breakpoint
CREATE INDEX `fixture_change_log_round_idx` ON `fixture_change_log` (`fixture_round_id`);--> statement-breakpoint
CREATE INDEX `fixture_change_log_match_idx` ON `fixture_change_log` (`match_id`);--> statement-breakpoint
CREATE INDEX `fixture_constraints_tournament_idx` ON `fixture_constraints` (`tournament_id`);--> statement-breakpoint
CREATE INDEX `fixture_constraints_stage_idx` ON `fixture_constraints` (`stage_id`);--> statement-breakpoint
CREATE INDEX `fixture_constraints_team_idx` ON `fixture_constraints` (`team_id`);--> statement-breakpoint
CREATE INDEX `fixture_constraints_venue_idx` ON `fixture_constraints` (`venue_id`);--> statement-breakpoint
CREATE INDEX `fixture_constraints_type_idx` ON `fixture_constraints` (`constraint_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `fixture_rounds_stage_group_round_unique` ON `fixture_rounds` (`stage_id`,`stage_group_id`,`round_number`);--> statement-breakpoint
CREATE INDEX `fixture_rounds_tournament_idx` ON `fixture_rounds` (`tournament_id`);--> statement-breakpoint
CREATE INDEX `fixture_rounds_stage_idx` ON `fixture_rounds` (`stage_id`);--> statement-breakpoint
CREATE INDEX `fixture_rounds_fixture_version_idx` ON `fixture_rounds` (`fixture_version_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fixture_version_matches_unique` ON `fixture_version_matches` (`fixture_version_id`,`match_id`);--> statement-breakpoint
CREATE INDEX `fixture_version_matches_fixture_version_idx` ON `fixture_version_matches` (`fixture_version_id`);--> statement-breakpoint
CREATE INDEX `fixture_version_matches_match_idx` ON `fixture_version_matches` (`match_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fixture_versions_tournament_version_unique` ON `fixture_versions` (`tournament_id`,`version_number`);--> statement-breakpoint
CREATE INDEX `fixture_versions_tournament_idx` ON `fixture_versions` (`tournament_id`);--> statement-breakpoint
CREATE INDEX `fixture_versions_stage_idx` ON `fixture_versions` (`stage_id`);--> statement-breakpoint
CREATE INDEX `fixture_versions_status_idx` ON `fixture_versions` (`status`);--> statement-breakpoint
CREATE INDEX `innings_match_idx` ON `innings` (`match_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_match_innings_number` ON `innings` (`match_id`,`innings_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_match_lineup_player` ON `match_lineup` (`match_id`,`team_id`,`player_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_match_lineup_batting_order` ON `match_lineup` (`match_id`,`team_id`,`batting_order`);--> statement-breakpoint
CREATE INDEX `match_lineup_match_idx` ON `match_lineup` (`match_id`);--> statement-breakpoint
CREATE INDEX `match_lineup_team_idx` ON `match_lineup` (`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `match_participant_sources_match_slot_unique` ON `match_participant_sources` (`match_id`,`team_slot`);--> statement-breakpoint
CREATE INDEX `match_participant_sources_source_match_idx` ON `match_participant_sources` (`source_match_id`);--> statement-breakpoint
CREATE INDEX `match_participant_sources_source_stage_idx` ON `match_participant_sources` (`source_stage_id`);--> statement-breakpoint
CREATE INDEX `rank_idx` ON `matches` (`winner_id`);--> statement-breakpoint
CREATE INDEX `matches_format_idx` ON `matches` (`match_format_id`);--> statement-breakpoint
CREATE INDEX `matches_tournament_date_idx` ON `matches` (`tournament_id`,`match_date`);--> statement-breakpoint
CREATE INDEX `matches_stage_round_sequence_idx` ON `matches` (`stage_id`,`stage_round`,`stage_sequence`);--> statement-breakpoint
CREATE INDEX `matches_venue_schedule_idx` ON `matches` (`venue_id`,`scheduled_start_at`);--> statement-breakpoint
CREATE INDEX `matches_team1_schedule_idx` ON `matches` (`team1_id`,`scheduled_start_at`);--> statement-breakpoint
CREATE INDEX `matches_team2_schedule_idx` ON `matches` (`team2_id`,`scheduled_start_at`);--> statement-breakpoint
CREATE INDEX `matches_fixture_round_idx` ON `matches` (`fixture_round_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_code_unique` ON `organizations` (`code`);--> statement-breakpoint
CREATE INDEX `organizations_parent_idx` ON `organizations` (`parent_organization_id`);--> statement-breakpoint
CREATE INDEX `organizations_active_idx` ON `organizations` (`is_active`);--> statement-breakpoint
CREATE INDEX `passkey_user_idx` ON `passkey` (`user_id`);--> statement-breakpoint
CREATE INDEX `passkey_credential_idx` ON `passkey` (`credential_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_player_innings_stats` ON `player_innings_stats` (`innings_id`,`player_id`);--> statement-breakpoint
CREATE INDEX `player_innings_stats_match_idx` ON `player_innings_stats` (`match_id`);--> statement-breakpoint
CREATE INDEX `player_innings_stats_team_idx` ON `player_innings_stats` (`team_id`);--> statement-breakpoint
CREATE INDEX `player_innings_stats_player_idx` ON `player_innings_stats` (`player_id`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_expires_idx` ON `session` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `swiss_round_standings_round_team_unique` ON `swiss_round_standings` (`fixture_round_id`,`team_id`);--> statement-breakpoint
CREATE INDEX `swiss_round_standings_stage_idx` ON `swiss_round_standings` (`stage_id`);--> statement-breakpoint
CREATE INDEX `swiss_round_standings_tournament_idx` ON `swiss_round_standings` (`tournament_id`);--> statement-breakpoint
CREATE INDEX `swiss_round_standings_team_idx` ON `swiss_round_standings` (`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_career_stats_team_unique` ON `team_career_stats` (`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_tournament_player` ON `team_players` (`tournament_id`,`player_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_tournament_stats_unique` ON `team_tournament_stats` (`tournament_id`,`team_id`);--> statement-breakpoint
CREATE INDEX `team_tournament_stats_team_idx` ON `team_tournament_stats` (`team_id`);--> statement-breakpoint
CREATE INDEX `team_tournament_stats_tournament_idx` ON `team_tournament_stats` (`tournament_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_stage_advancements_from_position_unique` ON `tournament_stage_advancements` (`from_stage_id`,`from_stage_group_id`,`position_from`);--> statement-breakpoint
CREATE INDEX `tournament_stage_advancements_to_stage_idx` ON `tournament_stage_advancements` (`to_stage_id`);--> statement-breakpoint
CREATE INDEX `tournament_stage_groups_stage_idx` ON `tournament_stage_groups` (`stage_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_stage_groups_stage_sequence_unique` ON `tournament_stage_groups` (`stage_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_stage_team_entries_stage_team_unique` ON `tournament_stage_team_entries` (`stage_id`,`team_id`);--> statement-breakpoint
CREATE INDEX `tournament_stage_team_entries_tournament_idx` ON `tournament_stage_team_entries` (`tournament_id`);--> statement-breakpoint
CREATE INDEX `tournament_stage_team_entries_group_idx` ON `tournament_stage_team_entries` (`stage_group_id`);--> statement-breakpoint
CREATE INDEX `tournament_stages_tournament_idx` ON `tournament_stages` (`tournament_id`);--> statement-breakpoint
CREATE INDEX `tournament_stages_sequence_idx` ON `tournament_stages` (`tournament_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_stages_tournament_sequence_unique` ON `tournament_stages` (`tournament_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_tournament_team` ON `tournament_teams` (`tournament_id`,`team_id`);--> statement-breakpoint
CREATE INDEX `tournament_organization_idx` ON `tournaments` (`organization_id`);