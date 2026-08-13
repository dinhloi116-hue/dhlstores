CREATE TABLE IF NOT EXISTS `payment_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(32) NOT NULL DEFAULT 'sepay',
	`providerTransactionId` varchar(128) NOT NULL,
	`orderId` int NOT NULL,
	`transferAmount` decimal(12,2) NOT NULL,
	`transferContent` text,
	`gateway` varchar(64),
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_transactions_provider_transaction_unique` UNIQUE(`provider`,`providerTransactionId`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `orderCode` varchar(64);--> statement-breakpoint
UPDATE `orders` SET `orderCode` = CONCAT('LEGACY-', `id`) WHERE `orderCode` IS NULL;--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `orderCode` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `paymentMethod` varchar(64) DEFAULT 'sepay_vietqr' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `paymentReference` varchar(128);--> statement-breakpoint
ALTER TABLE `orders` ADD `paymentConfirmedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','blocked') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_orderCode_unique` UNIQUE(`orderCode`);
