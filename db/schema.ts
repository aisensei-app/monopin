import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const eventRooms = sqliteTable('event_rooms', {
  code: text('code').primaryKey(),
  owner: text('owner').notNull(),
  title: text('title').notNull(),
  question: text('question').notNull(),
  revision: integer('revision').notNull().default(1),
  open: integer('open').notNull().default(1),
});
export const eventPins = sqliteTable('event_pins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  room: text('room').notNull(),
  participant: text('participant').notNull(),
  x: real('x').notNull(),
  y: real('y').notNull(),
  revision: integer('revision').notNull(),
}, (table) => [uniqueIndex('idx_event_pins_room_participant').on(table.room, table.participant)]);

export const boardPins = sqliteTable('board_pins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomCode: text('room_code').notNull(),
  participantId: text('participant_id').notNull(),
  x: real('x').notNull(),
  y: real('y').notNull(),
  revision: integer('revision').notNull(),
}, (table) => [uniqueIndex('idx_board_room_participant').on(table.roomCode, table.participantId)]);

export const reactionSessions = sqliteTable('reaction_sessions', {
  code: text('code').primaryKey(),
  question: text('question').notNull(),
  revision: integer('revision').notNull().default(1),
});

export const reactionAnswers = sqliteTable('reaction_answers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomCode: text('room_code').notNull(),
  participantId: text('participant_id').notNull(),
  choice: integer('choice').notNull(),
  revision: integer('revision').notNull(),
}, (table) => [uniqueIndex('idx_reactions_room_participant').on(table.roomCode, table.participantId)]);

export const rooms = sqliteTable('rooms', {
  code: text('code').primaryKey(),
  question: text('question').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const pins = sqliteTable('pins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomCode: text('room_code').notNull(),
  participantId: text('participant_id').notNull(),
  x: real('x').notNull(),
  y: real('y').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [uniqueIndex('idx_pins_room_participant').on(table.roomCode, table.participantId)]);
