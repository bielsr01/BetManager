import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Account holders (people who own betting accounts)
export const accountHolders = pgTable("account_holders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  username: text("username"),
  // Removed password field for security - credentials should not be stored
  createdAt: timestamp("created_at").defaultNow(),
});

// Betting houses (casas de apostas)
export const bettingHouses = pgTable("betting_houses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  notes: text("notes"), // Campo para notas/informações adicionais
  accountHolderId: varchar("account_holder_id").references(() => accountHolders.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Surebet sets (each OCR extraction creates one set with two bets)
export const surebetSets = pgTable("surebet_sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventDate: timestamp("event_date"),
  sport: text("sport"),
  league: text("league"),
  teamA: text("team_a"),
  teamB: text("team_b"),
  profitPercentage: decimal("profit_percentage", { precision: 5, scale: 2 }),
  status: text("status").default("pending"), // pending, resolved
  createdAt: timestamp("created_at").defaultNow(),
});

// Individual bets within a surebet set
export const bets = pgTable("bets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surebetSetId: varchar("surebet_set_id").references(() => surebetSets.id),
  bettingHouseId: varchar("betting_house_id").references(() => bettingHouses.id),
  betType: text("bet_type").notNull(), // "Acima 2.25", "1x2", etc.
  odd: decimal("odd", { precision: 8, scale: 2 }).notNull(),
  stake: decimal("stake", { precision: 10, scale: 2 }).notNull(),
  potentialProfit: decimal("potential_profit", { precision: 10, scale: 2 }).notNull(),
  result: text("result"), // "won", "lost", "returned", null for pending
  actualProfit: decimal("actual_profit", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertAccountHolderSchema = createInsertSchema(accountHolders).omit({
  id: true,
  createdAt: true,
});

export const insertBettingHouseSchema = createInsertSchema(bettingHouses).omit({
  id: true,
  createdAt: true,
});

export const insertSurebetSetSchema = createInsertSchema(surebetSets).omit({
  id: true,
  createdAt: true,
}).extend({
  eventDate: z.union([z.date(), z.string().nullable()]).transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }).nullable(),
});

export const insertBetSchema = createInsertSchema(bets).omit({
  id: true,
  createdAt: true,
});

// Types
export type AccountHolder = typeof accountHolders.$inferSelect;
export type InsertAccountHolder = z.infer<typeof insertAccountHolderSchema>;

export type BettingHouse = typeof bettingHouses.$inferSelect;
export type InsertBettingHouse = z.infer<typeof insertBettingHouseSchema>;

export type SurebetSet = typeof surebetSets.$inferSelect;
export type InsertSurebetSet = z.infer<typeof insertSurebetSetSchema>;

export type Bet = typeof bets.$inferSelect;
export type InsertBet = z.infer<typeof insertBetSchema>;

// Combined types for API responses
export type SurebetSetWithBets = SurebetSet & {
  bets: (Bet & {
    bettingHouse: BettingHouse & {
      accountHolder: AccountHolder;
    };
  })[];
};

// OCR extraction result type - allows null values for missing data (no fallbacks)
export type OCRResult = {
  date: string | null;
  sport: string | null;
  league: string | null;
  teamA: string | null;
  teamB: string | null;
  bet1: {
    house: string | null;
    odd: number | null;
    type: string | null;
    stake: number | null;
    profit: number | null;
    accountHolder?: string;
  };
  bet2: {
    house: string | null;
    odd: number | null;
    type: string | null;
    stake: number | null;
    profit: number | null;
    accountHolder?: string;
  };
  profitPercentage: number | null;
};