CREATE TABLE `product_wholesale_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`minQuantity` int NOT NULL,
	`unitPrice` decimal(12,2) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_wholesale_tiers_id` PRIMARY KEY(`id`)
);
