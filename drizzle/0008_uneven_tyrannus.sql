CREATE TABLE `financial_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`schedule_id` integer,
	`record_date` text NOT NULL,
	`revenue` real DEFAULT 0 NOT NULL,
	`amount_received` real DEFAULT 0 NOT NULL,
	`driver_expense` real DEFAULT 0 NOT NULL,
	`assistant_expense` real DEFAULT 0 NOT NULL,
	`other_expense` real DEFAULT 0 NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `idx_financial_records_date_schedule` ON `financial_records` (`record_date`,`schedule_id`);