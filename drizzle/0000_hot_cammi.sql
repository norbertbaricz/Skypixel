CREATE TABLE `catalog_state` (
	`owner` text PRIMARY KEY NOT NULL,
	`payload` text,
	`lease_owner` text,
	`lease_until` integer DEFAULT 0 NOT NULL
);
