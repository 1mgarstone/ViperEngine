import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  paperBalance: decimal("paper_balance", { precision: 20, scale: 8 }).notNull().default("100000"),
  liveBalance: decimal("live_balance", { precision: 20, scale: 8 }).notNull().default("0"),
  isLiveMode: boolean("is_live_mode").notNull().default(false),
  apiKey: text("api_key"), // Encrypted exchange API key
  apiSecret: text("api_secret"), // Encrypted exchange API secret
  apiPassphrase: text("api_passphrase"), // Encrypted passphrase for some exchanges
  exchangeName: text("exchange_name"), // 'binance' | 'okx' | 'bybit' | 'coinbase'
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

export const viperSettings = pgTable("viper_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  maxLeverage: integer("max_leverage").notNull().default(125),
  volThreshold: decimal("vol_threshold", { precision: 6, scale: 5 }).notNull().default("0.008"),
  strikeWindow: decimal("strike_window", { precision: 5, scale: 3 }).notNull().default("0.170"),
  profitTarget: decimal("profit_target", { precision: 5, scale: 2 }).notNull().default("2.00"),
  stopLoss: decimal("stop_loss", { precision: 5, scale: 3 }).notNull().default("0.100"),
  clusterThreshold: decimal("cluster_threshold", { precision: 6, scale: 5 }).notNull().default("0.005"),
  positionScaling: decimal("position_scaling", { precision: 5, scale: 2 }).notNull().default("1.00"),
  maxConcurrentTrades: integer("max_concurrent_trades").notNull().default(2),
  balanceMultiplier: decimal("balance_multiplier", { precision: 5, scale: 2 }).notNull().default("2.00"),
  isEnabled: boolean("is_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const liquidationClusters = pgTable("liquidation_clusters", {
  id: serial("id").primaryKey(),
  instId: text("inst_id").notNull(),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  size: decimal("size", { precision: 20, scale: 8 }).notNull(),
  side: text("side").notNull(), // "long", "short"
  volume: decimal("volume", { precision: 20, scale: 8 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  processed: boolean("processed").notNull().default(false),
});

export const viperTrades = pgTable("viper_trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  clusterId: integer("cluster_id").references(() => liquidationClusters.id),
  instId: text("inst_id").notNull(),
  side: text("side").notNull(),
  entryPrice: decimal("entry_price", { precision: 20, scale: 8 }).notNull(),
  quantity: decimal("quantity", { precision: 20, scale: 8 }).notNull(),
  leverage: integer("leverage").notNull(),
  takeProfitPrice: decimal("take_profit_price", { precision: 20, scale: 8 }),
  stopLossPrice: decimal("stop_loss_price", { precision: 20, scale: 8 }),
  status: text("status").notNull().default("active"), // "active", "completed", "stopped"
  pnl: decimal("pnl", { precision: 20, scale: 8 }).default("0"),
  exitPrice: decimal("exit_price", { precision: 20, scale: 8 }),
  entryTime: timestamp("entry_time").defaultNow(),
  exitTime: timestamp("exit_time"),
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

export const insertViperSettingsSchema = createInsertSchema(viperSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertLiquidationClusterSchema = createInsertSchema(liquidationClusters).omit({
  id: true,
  timestamp: true,
});

export const insertViperTradeSchema = createInsertSchema(viperTrades).omit({
  id: true,
  entryTime: true,
  exitTime: true,
});

export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  widgetType: text("widget_type").notNull(), // 'balance' | 'viperStatus' | 'recentTrades' | 'performance' | 'marketData' | 'profitChart'
  position: integer("position").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  size: text("size").notNull().default("medium"), // 'small' | 'medium' | 'large'
  config: text("config"), // JSON string for widget-specific settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDashboardWidgetSchema = createInsertSchema(dashboardWidgets).omit({
  id: true,
  createdAt: true,
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

export type ViperSettings = typeof viperSettings.$inferSelect;
export type InsertViperSettings = z.infer<typeof insertViperSettingsSchema>;

export type LiquidationCluster = typeof liquidationClusters.$inferSelect;
export type InsertLiquidationCluster = z.infer<typeof insertLiquidationClusterSchema>;

export type ViperTrade = typeof viperTrades.$inferSelect;
export type InsertViperTrade = z.infer<typeof insertViperTradeSchema>;

export type DashboardWidget = typeof dashboardWidgets.$inferSelect;
export type InsertDashboardWidget = z.infer<typeof insertDashboardWidgetSchema>;
