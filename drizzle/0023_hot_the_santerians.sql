CREATE TABLE `wallet_withdrawals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`fee` decimal(12,2) NOT NULL DEFAULT '0',
	`netAmount` decimal(12,2) NOT NULL,
	`bankCode` varchar(32) NOT NULL,
	`accountNumber` varchar(64) NOT NULL,
	`accountHolder` varchar(255) NOT NULL,
	`status` enum('pending','approved','paid','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`note` varchar(500),
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallet_withdrawals_id` PRIMARY KEY(`id`)
);
