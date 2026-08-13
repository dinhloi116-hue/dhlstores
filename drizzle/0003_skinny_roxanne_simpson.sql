CREATE TABLE `product_download_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`driveUrl` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_download_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_download_links_productId_unique` UNIQUE(`productId`)
);
