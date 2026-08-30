CREATE TABLE `driver_checkpoints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trip_log_id` integer NOT NULL,
	`driver_id` integer NOT NULL,
	`checkpoint_type` text NOT NULL,
	`recorded_at` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_driver_checkpoints_trip_type` ON `driver_checkpoints` (`trip_log_id`,`checkpoint_type`);--> statement-breakpoint
CREATE INDEX `idx_driver_checkpoints_driver_time` ON `driver_checkpoints` (`driver_id`,`recorded_at`);