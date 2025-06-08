import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  paperBalance: decimal("paper_balance", { precision: 20, scale: 8 }).notNull().default("100000"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(), // e.g., "BTC", "ETH"
  name: text("name").notNull(), // e.g., "Bitcoin", "Ethereum"
  currentPrice: decimal("current_price", { precision: 20, scale: 8 }).notNull(),
  change24h: decimal("change_24h", { precision: 10, scale: 4 }).notNull().default("0"),
  volume24h: decimal("volume_24h", { precision: 20, scale: 8 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const portfolioPositions = pgTable("portfolio_positions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  assetId: integer("asset_id").references(() => assets.id).notNull(),
  quantity: decimal("quantity", { precision: 20, scale: 8 }).notNull(),
  averagePrice: decimal("average_price", { precision: 20, scale: 8 }).notNull(),
  totalInvested: decimal("total_invested", { precision: 20, scale: 8 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  assetId: integer("asset_id").references(() => assets.id).notNull(),
  type: text("type").notNull(), // "market", "limit", "stop_loss"
  side: text("side").notNull(), // "buy", "sell"
  quantity: decimal("quantity", { precision: 20, scale: 8 }).notNull(),
  price: decimal("price", { precision: 20, scale: 8 }),
  status: text("status").notNull().default("pending"), // "pending", "filled", "cancelled"
  stopPrice: decimal("stop_price", { precision: 20, scale: 8 }),
  takeProfitPrice: decimal("take_profit_price", { precision: 20, scale: 8 }),
  filledAt: timestamp("filled_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  assetId: integer("asset_id").references(() => assets.id).notNull(),
  side: text("side").notNull(), // "buy", "sell"
  quantity: decimal("quantity", { precision: 20, scale: 8 }).notNull(),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  total: decimal("total", { precision: 20, scale: 8 }).notNull(),
  pnl: decimal("pnl", { precision: 20, scale: 8 }).default("0"),
  executedAt: timestamp("executed_at").defaultNow(),
});

export const riskSettings = pgTable("risk_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  maxPositionSize: decimal("max_position_size", { precision: 5, scale: 2 }).notNull().default("15"), // percentage
  stopLossPercentage: decimal("stop_loss_percentage", { precision: 5, scale: 2 }).notNull().default("5"),
  takeProfitPercentage: decimal("take_profit_percentage", { precision: 5, scale: 2 }).notNull().default("25"),
  maxDailyLoss: decimal("max_daily_loss", { precision: 20, scale: 8 }).notNull().default("1000"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  updatedAt: true,
});

export const insertPortfolioPositionSchema = createInsertSchema(portfolioPositions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  filledAt: true,
  createdAt: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  executedAt: true,
});

export const insertRiskSettingsSchema = createInsertSchema(riskSettings).omit({
  id: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;

export type PortfolioPosition = typeof portfolioPositions.$inferSelect;
export type InsertPortfolioPosition = z.infer<typeof insertPortfolioPositionSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;

export type RiskSettings = typeof riskSettings.$inferSelect;
export type InsertRiskSettings = z.infer<typeof insertRiskSettingsSchema>;
