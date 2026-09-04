CREATE TABLE `board_pins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_code` text NOT NULL,
	`participant_id` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`revision` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_board_room_participant` ON `board_pins` (`room_code`,`participant_id`);