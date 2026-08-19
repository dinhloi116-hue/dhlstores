CREATE TABLE `order_tracking_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`stage` varchar(64) NOT NULL,
	`carrier` varchar(64),
	`trackingNumber` varchar(128),
	`trackingUrl` text,
	`status` varchar(64) NOT NULL DEFAULT 'in_transit',
	`location` varchar(255),
	`description` text,
	`eventTime` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_tracking_events_id` PRIMARY KEY(`id`)
);
