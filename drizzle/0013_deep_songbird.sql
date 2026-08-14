ALTER TABLE `cart_items` ADD `fulfillmentMode` enum('in_stock','preorder') DEFAULT 'in_stock' NOT NULL;--> statement-breakpoint
ALTER TABLE `order_items` ADD `fulfillmentMode` enum('in_stock','preorder') DEFAULT 'in_stock' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `hasPreorderItems` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `preorderDiscountAmount` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `preorderEstimatedDays` varchar(32);