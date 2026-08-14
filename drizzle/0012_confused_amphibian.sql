CREATE TABLE `shipping_addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`recipientName` varchar(255) NOT NULL,
	`phone` varchar(64) NOT NULL,
	`address` text NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipping_addresses_id` PRIMARY KEY(`id`)
);
