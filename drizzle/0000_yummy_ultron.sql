CREATE TABLE `people` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`phone` text NOT NULL,
	`license` text,
	`status` text DEFAULT 'Available' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`origin` text NOT NULL,
	`destination` text NOT NULL,
	`distance` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `routes_code_unique` ON `routes` (`code`);--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`route_id` integer NOT NULL,
	`vehicle_id` integer NOT NULL,
	`driver_id` integer NOT NULL,
	`assistant_id` integer,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`status` text DEFAULT 'Scheduled' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plate` text NOT NULL,
	`type` text NOT NULL,
	`capacity` integer NOT NULL,
	`status` text DEFAULT 'Available' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_plate_unique` ON `vehicles` (`plate`);