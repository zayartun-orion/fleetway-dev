CREATE TABLE `mileage_fuel_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer NOT NULL,
	`recorded_at` text NOT NULL,
	`odometer_km` integer NOT NULL,
	`petrol_litres` real NOT NULL,
	`petrol_cost` real NOT NULL,
	`station` text,
	`notes` text
);
