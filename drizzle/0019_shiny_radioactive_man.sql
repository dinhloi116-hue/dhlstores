CREATE TABLE `wallet_topups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`topupCode` varchar(64) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`status` enum('pending','paid','expired','cancelled') NOT NULL DEFAULT 'pending',
	`provider` varchar(32) NOT NULL DEFAULT 'sepay',
	`providerTransactionId` varchar(128),
	`transferContent` text,
	`gateway` varchar(64),
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallet_topups_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallet_topups_topupCode_unique` UNIQUE(`topupCode`),
	CONSTRAINT `wallet_topups_providerTransactionId_unique` UNIQUE(`providerTransactionId`)
);
