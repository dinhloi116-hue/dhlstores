ALTER TABLE `order_items` ADD `costPrice` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `product_variants` ADD `costPrice` decimal(12,2) DEFAULT '0' NOT NULL;