CREATE TABLE `admin_activity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` varchar(96) NOT NULL,
	`targetType` varchar(64) NOT NULL,
	`targetId` int NOT NULL,
	`details` text,
	`performedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_activity_id` PRIMARY KEY(`id`)
);
