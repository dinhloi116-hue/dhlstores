CREATE TABLE `product_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`size` varchar(64),
	`color` varchar(64),
	`sku` varchar(128),
	`priceAdjustment` decimal(12,2) NOT NULL DEFAULT '0',
	`stock` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cart_items` ADD `variantId` int;--> statement-breakpoint
ALTER TABLE `order_items` ADD `variantId` int;--> statement-breakpoint
ALTER TABLE `order_items` ADD `variantLabel` varchar(255);--> statement-breakpoint
ALTER TABLE `orders` ADD `shippingMethod` varchar(64);--> statement-breakpoint
ALTER TABLE `orders` ADD `shippingFee` decimal(12,2) DEFAULT '0' NOT NULL;