ALTER TABLE `order_items` ADD `weightGrams` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `shippingWeightGrams` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `product_variants` ADD `weightGrams` int;--> statement-breakpoint
ALTER TABLE `products` ADD `weightGrams` int DEFAULT 0 NOT NULL;