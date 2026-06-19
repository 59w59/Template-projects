PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`role` text DEFAULT 'user' NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`two_factor_enabled` integer DEFAULT false NOT NULL,
	`two_factor_code` text,
	`two_factor_expires_at` integer,
	`reset_token_hash` text,
	`reset_token_expires_at` integer,
	`provider` text,
	`provider_id` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "password_hash", "role", "email_verified", "two_factor_enabled", "two_factor_code", "two_factor_expires_at", "reset_token_hash", "reset_token_expires_at", "provider", "provider_id", "created_at", "updated_at") SELECT "id", "email", "password_hash", "role", "email_verified", "two_factor_enabled", "two_factor_code", "two_factor_expires_at", "reset_token_hash", "reset_token_expires_at", null, null, "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);