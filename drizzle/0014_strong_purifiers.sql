CREATE TABLE `customer_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`visitorKey` varchar(96) NOT NULL,
	`displayName` varchar(128),
	`contact` varchar(255),
	`topic` enum('suggestion','issue','other') NOT NULL DEFAULT 'suggestion',
	`message` text NOT NULL,
	`status` enum('new','reviewed','resolved') NOT NULL DEFAULT 'new',
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`visitorKey` varchar(96) NOT NULL,
	`displayName` varchar(128),
	`lastMessagePreview` varchar(255),
	`lastMessageAt` timestamp NOT NULL DEFAULT (now()),
	`customerReadAt` timestamp,
	`ownerReadAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `support_conversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_conversations_visitorKey_unique` UNIQUE(`visitorKey`)
);
--> statement-breakpoint
CREATE TABLE `support_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`senderType` enum('customer','owner') NOT NULL,
	`senderUserId` int,
	`body` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `categories` ADD `iconKey` varchar(64) DEFAULT 'Package' NOT NULL;