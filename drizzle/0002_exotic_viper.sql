CREATE TABLE `route_goods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`route_id` integer NOT NULL,
	`goods` text NOT NULL,
	`customer` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `routes` ADD `estimated_departure` text;--> statement-breakpoint
ALTER TABLE `routes` ADD `estimated_arrival` text;