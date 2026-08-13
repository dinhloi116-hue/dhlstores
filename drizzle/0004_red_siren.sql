CREATE TABLE `media_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`storageKey` text NOT NULL,
	`url` text NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`sizeBytes` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `categories` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `isActive` boolean DEFAULT true NOT NULL;