import { pgTable, text, integer, bigint, primaryKey } from "drizzle-orm/pg-core";

export const duels = pgTable("duels", {
  code: text().primaryKey(),
  round: integer().notNull().default(0),
  switchAt: bigint("switch_at", { mode: "number" }).notNull().default(0),
});

export const mapVotes = pgTable(
  "map_votes",
  {
    code: text().notNull(),
    round: integer().notNull(),
    player: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.code, t.round, t.player] })],
);

export const results = pgTable(
  "results",
  {
    code: text().notNull(),
    round: integer().notNull(),
    player: text().notNull(),
    name: text().notNull(),
    ms: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.code, t.round, t.player] })],
);
