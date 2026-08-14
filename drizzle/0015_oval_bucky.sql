ALTER TABLE `orders` ADD `trackingStage` enum('ordered','central_warehouse','ready_hanoi','tracking') DEFAULT 'ordered' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `trackingUrl` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `product_variants` ADD `sortOrder` int DEFAULT 0 NOT NULL;