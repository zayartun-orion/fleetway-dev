CREATE TABLE `profit_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` real NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `route_profit_inputs` (
	`route_id` integer PRIMARY KEY NOT NULL,
	`charging_basis` text DEFAULT 'Per trip' NOT NULL,
	`rate` real DEFAULT 0 NOT NULL,
	`load_qty` real DEFAULT 1 NOT NULL,
	`unit` text DEFAULT 'trip' NOT NULL,
	`trips_per_week` real DEFAULT 0 NOT NULL,
	`other_trip_cost` real DEFAULT 0 NOT NULL,
	`route_incentive` real DEFAULT 0 NOT NULL,
	`meal_type` text DEFAULT 'Yangon' NOT NULL,
	`updated_at` text NOT NULL
);
