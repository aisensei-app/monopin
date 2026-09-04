CREATE TABLE `reaction_answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_code` text NOT NULL,
	`participant_id` text NOT NULL,
	`choice` integer NOT NULL,
	`revision` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reactions_room_participant` ON `reaction_answers` (`room_code`,`participant_id`);--> statement-breakpoint
CREATE TABLE `reaction_sessions` (
	`code` text PRIMARY KEY NOT NULL,
	`question` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL
);
