CREATE TABLE `sapo_sync_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventKey` varchar(180) NOT NULL,
	`direction` enum('inbound','outbound') NOT NULL,
	`eventType` enum('inventory_import','manual_adjust','order_reserve','order_release') NOT NULL,
	`status` enum('pending','succeeded','failed') NOT NULL DEFAULT 'pending',
	`orderId` int,
	`mappingId` int,
	`localVariantId` int,
	`quantityBefore` int,
	`quantityAfter` int,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `sapo_sync_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `sapo_sync_events_eventKey_unique` UNIQUE(`eventKey`)
);
--> statement-breakpoint
CREATE TABLE `sapo_sync_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`locationId` varchar(64),
	`locationName` varchar(255),
	`syncEnabled` boolean NOT NULL DEFAULT false,
	`scheduleTaskUid` varchar(65),
	`lastError` text,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sapo_sync_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sapo_variant_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`localVariantId` int NOT NULL,
	`localSku` varchar(128) NOT NULL,
	`sapoProductId` varchar(64) NOT NULL,
	`sapoVariantId` varchar(64) NOT NULL,
	`sapoInventoryItemId` varchar(64) NOT NULL,
	`sapoLocationId` varchar(64) NOT NULL,
	`sapoInventoryLevelId` varchar(64),
	`lastKnownAvailable` int,
	`lastSapoUpdatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sapo_variant_mappings_id` PRIMARY KEY(`id`)
);
