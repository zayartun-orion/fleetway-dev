CREATE TABLE `driver_trip_photos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trip_log_id` integer NOT NULL,
	`photo_type` text NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`uploaded_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `driver_trip_photos_object_key_unique` ON `driver_trip_photos` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_driver_trip_photos_trip` ON `driver_trip_photos` (`trip_log_id`);