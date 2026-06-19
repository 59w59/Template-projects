ALTER TABLE `users` ADD `email_verified` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `two_factor_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `two_factor_code` text;--> statement-breakpoint
ALTER TABLE `users` ADD `two_factor_expires_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `reset_token_hash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `reset_token_expires_at` integer;