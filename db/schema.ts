import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

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
