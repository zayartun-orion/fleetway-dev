CREATE TABLE `attendance_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`driver_id` integer NOT NULL,
	`work_date` text NOT NULL,
	`check_in_at` text NOT NULL,
	`check_in_latitude` real,
	`check_in_longitude` real,
	`check_out_at` text,
	`check_out_latitude` real,
	`check_out_longitude` real
);
--> statement-breakpoint
CREATE INDEX `idx_attendance_driver_date` ON `attendance_logs` (`driver_id`,`work_date`);--> statement-breakpoint
CREATE TABLE `driver_location_updates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trip_log_id` integer NOT NULL,
	`recorded_at` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_driver_locations_trip_time` ON `driver_location_updates` (`trip_log_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `driver_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`driver_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `driver_sessions_token_hash_unique` ON `driver_sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `driver_trip_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`schedule_id` integer NOT NULL,
	`driver_id` integer NOT NULL,
	`loading_started_at` text,
	`departed_at` text,
	`unloading_started_at` text,
	`completed_at` text,
	`start_odometer_km` integer,
	`end_odometer_km` integer,
	`fuel_litres` real,
	`fuel_cost` real,
	`last_latitude` real,
	`last_longitude` real,
	`last_location_at` text,
	`notes` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `driver_trip_logs_schedule_id_unique` ON `driver_trip_logs` (`schedule_id`);--> statement-breakpoint
ALTER TABLE `people` ADD `driver_pin_hash` text;