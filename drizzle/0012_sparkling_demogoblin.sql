CREATE TABLE `custom_profit_assumptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`value` real DEFAULT 0 NOT NULL,
	`unit` text DEFAULT 'MMK' NOT NULL,
	`cost_type` text DEFAULT 'monthly' NOT NULL,
	`updated_at` text NOT NULL
);
