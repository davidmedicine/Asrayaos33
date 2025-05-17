// src/lib/db/schema/ritual.ts
// --------------------------------------------------
// First-Flame ritual tables & enum (Drizzle-ORM ≥0.41)
// tables live in the **ritual** schema so they don’t
// clash with the rest of Supabase’s public objects.
// --------------------------------------------------

import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgSchema,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';

/* ─────────────── auth schema stub ──────────────── */
/* Expose auth.users for FK references only.        */
const auth = pgSchema('auth');
export const authUsers = auth.table('users', {
  id: uuid('id').primaryKey(),
});

/* ─────────────── ritual schema root ────────────── */
const ritual = pgSchema('ritual');

/* ─────────────── reusable enum (public) ─────────── */
export const firstFlameStage = pgEnum('first_flame_stage', [
  'ritual_initiation_attempt',
  'ritual_initiation_success',
  'ritual_initiation_failure_db',
  'ritual_initiation_failure_rate_limit',
  'ritual_initiation_failure_already_active',
  'ritual_imprint_submitted',
  'ritual_day_completed',
  'ritual_completed',
]);

/* ─────────────── first_flame_logs ──────────────── */
export const firstFlameLogs = ritual.table(
  'first_flame_logs',
  {
    id:  uuid('id').defaultRandom().primaryKey(),

    uid: uuid('uid').references(() => authUsers.id), // nullable FK

    questId: text('quest_id').notNull(),
    stage:   firstFlameStage('stage').notNull(),
    context: jsonb('context').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
                .defaultNow()
                .notNull(),
  },
  (t) => ({
    uidIdx: index('idx_first_flame_logs_uid').on(t.uid),
  }),
);

/* ─────────────── flame_progress ────────────────── */
export const flameProgress = ritual.table(
  'flame_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
              .references(() => authUsers.id, { onDelete: 'cascade' })
              .notNull(),

    currentDayTarget: integer('current_day_target').notNull(),

    isQuestComplete:  boolean('is_quest_complete').default(false).notNull(),
    lastImprintAt:    timestamp('last_imprint_at', { withTimezone: true }),
    updatedAt:        timestamp('updated_at', { withTimezone: true })
                        .defaultNow()
                        .notNull(),
  },
  (t) => ({
    userUnique: uniqueIndex('uq_flame_progress_user').on(t.userId),
    dayCheck:   check('chk_day_range', sql`${t.currentDayTarget} BETWEEN 1 AND 5`),
  }),
);
