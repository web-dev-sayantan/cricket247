ALTER TABLE `accounts` RENAME TO `account`;--> statement-breakpoint
ALTER TABLE `passkeys` RENAME TO `passkey`;--> statement-breakpoint
ALTER TABLE `sessions` RENAME TO `session`;--> statement-breakpoint
ALTER TABLE `users` RENAME TO `user`;--> statement-breakpoint
ALTER TABLE `verifications` RENAME TO `verification`;--> statement-breakpoint
ALTER TABLE `players` ADD `user_id` integer REFERENCES user(id);