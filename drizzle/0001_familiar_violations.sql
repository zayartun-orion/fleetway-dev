ALTER TABLE `people` RENAME COLUMN "license" TO "driving_license";--> statement-breakpoint
ALTER TABLE `people` ADD `license_class` text;--> statement-breakpoint
ALTER TABLE `people` ADD `license_expiry` text;--> statement-breakpoint
ALTER TABLE `people` ADD `address` text;