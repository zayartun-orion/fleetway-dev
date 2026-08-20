CREATE TABLE `maintenance_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer NOT NULL,
	`service_type` text NOT NULL,
	`completed_date` text NOT NULL,
	`completed_odometer_km` integer,
	`next_due_date` text,
	`next_due_odometer_km` integer,
	`workshop` text,
	`cost` real DEFAULT 0 NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `idx_maintenance_logs_vehicle_due` ON `maintenance_logs` (`vehicle_id`,`next_due_date`);