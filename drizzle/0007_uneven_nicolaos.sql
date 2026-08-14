CREATE TABLE `balance_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`balanceAfter` decimal(12,2) NOT NULL,
	`reason` varchar(255) NOT NULL,
	`performedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `balance_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discount_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`type` enum('percent','fixed') NOT NULL,
	`value` decimal(12,2) NOT NULL,
	`minOrderAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`maxUses` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`startsAt` timestamp,
	`endsAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discount_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `discount_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`variantId` int,
	`quantityBefore` int NOT NULL,
	`quantityAfter` int NOT NULL,
	`reason` varchar(255) NOT NULL,
	`performedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(128) NOT NULL,
	`settingValue` text NOT NULL,
	`updatedByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `visitor_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitorId` varchar(128) NOT NULL,
	`path` varchar(512) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visitor_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','owner') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `orders` ADD `discountCode` varchar(64);--> statement-breakpoint
ALTER TABLE `orders` ADD `discountAmount` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `balance` decimal(12,2) DEFAULT '0' NOT NULL;