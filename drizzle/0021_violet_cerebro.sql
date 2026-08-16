ALTER TABLE `sapo_sync_settings` ADD `lastInboundSyncedAt` timestamp;--> statement-breakpoint
ALTER TABLE `sapo_sync_settings` ADD `lastOutboundSyncedAt` timestamp;--> statement-breakpoint
ALTER TABLE `sapo_sync_settings` DROP COLUMN `scheduleTaskUid`;