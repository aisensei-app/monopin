CREATE TABLE `pins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_code` text NOT NULL,
	`participant_id` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pins_room_participant` ON `pins` (`room_code`,`participant_id`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`question` text NOT NULL,
	`updated_at` integer NOT NULL
);
