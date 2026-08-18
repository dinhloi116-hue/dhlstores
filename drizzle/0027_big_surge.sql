CREATE TABLE `customer_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_favorites_user_product_unique` UNIQUE(`userId`,`productId`)
);
--> statement-breakpoint
CREATE TABLE `restock_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`variantId` int NOT NULL DEFAULT 0,
	`status` enum('active','ready','cancelled') NOT NULL DEFAULT 'active',
	`readyAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `restock_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `restock_subscriptions_user_target_unique` UNIQUE(`userId`,`productId`,`variantId`)
);
--> statement-breakpoint
CREATE INDEX `customer_favorites_user_idx` ON `customer_favorites` (`userId`);--> statement-breakpoint
CREATE INDEX `restock_subscriptions_user_idx` ON `restock_subscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `restock_subscriptions_target_idx` ON `restock_subscriptions` (`productId`,`variantId`);