CREATE TABLE `event_pins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room` text NOT NULL,
	`participant` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`revision` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_event_pins_room_participant` ON `event_pins` (`room`,`participant`);--> statement-breakpoint
CREATE TABLE `event_rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`question` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`open` integer DEFAULT 1 NOT NULL
);
