DROP INDEX `idx_driver_checkpoints_trip_type`;--> statement-breakpoint
CREATE INDEX `idx_driver_checkpoints_trip_type_time` ON `driver_checkpoints` (`trip_log_id`,`checkpoint_type`,`recorded_at`);