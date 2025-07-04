import { 
  users, assets, portfolioPositions, orders, trades, riskSettings, viperSettings, liquidationClusters, viperTrades,
  type User, type InsertUser,
  type Asset, type InsertAsset,
  type PortfolioPosition, type InsertPortfolioPosition,
  type Order, type InsertOrder,
  type Trade, type InsertTrade,
  type RiskSettings, type InsertRiskSettings,
  type ViperSettings, type InsertViperSettings,
  type LiquidationCluster, type InsertLiquidationCluster,
  type ViperTrade, type InsertViperTrade,
  dashboardWidgets, type DashboardWidget, type InsertDashboardWidget
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, newBalance: string): Promise<User>;

  // Asset operations
  getAllAssets(): Promise<Asset[]>;
  getAsset(id: number): Promise<Asset | undefined>;
  getAssetBySymbol(symbol: string): Promise<Asset | undefined>;
  updateAssetPrice(id: number, price: string, change24h: string): Promise<Asset>;

  // Portfolio operations
  getPortfolioPositions(userId: number): Promise<PortfolioPosition[]>;
  getPortfolioPosition(userId: number, assetId: number): Promise<PortfolioPosition | undefined>;
  createPortfolioPosition(position: InsertPortfolioPosition): Promise<PortfolioPosition>;
  updatePortfolioPosition(id: number, quantity: string, averagePrice: string, totalInvested: string): Promise<PortfolioPosition>;
  deletePortfolioPosition(id: number): Promise<void>;

  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: number): Promise<Order | undefined>;
  getUserOrders(userId: number): Promise<Order[]>;
  updateOrderStatus(id: number, status: string, filledAt?: Date): Promise<Order>;

  // Trade operations
  createTrade(trade: InsertTrade): Promise<Trade>;
  getUserTrades(userId: number): Promise<Trade[]>;

  // Risk settings operations
  getRiskSettings(userId: number): Promise<RiskSettings | undefined>;
  updateRiskSettings(settings: InsertRiskSettings): Promise<RiskSettings>;

  // Viper settings operations
  getViperSettings(userId: number): Promise<ViperSettings | undefined>;
  createViperSettings(settings: InsertViperSettings): Promise<ViperSettings>;
  updateViperSettings(settings: InsertViperSettings): Promise<ViperSettings>;

  // Liquidation cluster operations
  createLiquidationCluster(cluster: InsertLiquidationCluster): Promise<LiquidationCluster>;
  getUnprocessedClusters(): Promise<LiquidationCluster[]>;
  markClusterProcessed(id: number): Promise<void>;

  // Viper trade operations
  createViperTrade(trade: InsertViperTrade): Promise<ViperTrade>;
  getActiveViperTrades(userId: number): Promise<ViperTrade[]>;
  getUserViperTrades(userId: number): Promise<ViperTrade[]>;
  updateViperTrade(id: number, updates: Partial<ViperTrade>): Promise<ViperTrade>;

  // Dashboard widget operations
  getUserWidgets(userId: number): Promise<DashboardWidget[]>;
  createWidget(widget: InsertDashboardWidget): Promise<DashboardWidget>;
  updateWidget(id: number, updates: Partial<DashboardWidget>): Promise<DashboardWidget>;
  deleteWidget(id: number): Promise<void>;
  reorderWidgets(userId: number, widgetOrders: { id: number; position: number }[]): Promise<void>;

  // Live trading operations
  toggleLiveMode(userId: number, isLive: boolean): Promise<User>;
  updateExchangeCredentials(userId: number, credentials: {
    apiKey: string;
    apiSecret: string;
    apiPassphrase?: string;
    exchangeName: string;
  }): Promise<User>;
  getCurrentBalance(userId: number): Promise<string>;
  updateCurrentBalance(userId: number, balance: string): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private assets: Map<number, Asset> = new Map();
  private portfolioPositions: Map<number, PortfolioPosition> = new Map();
  private orders: Map<number, Order> = new Map();
  private trades: Map<number, Trade> = new Map();
  private riskSettings: Map<number, RiskSettings> = new Map();
  private viperSettings: Map<number, ViperSettings> = new Map();
  private liquidationClusters: Map<number, LiquidationCluster> = new Map();
  private viperTrades: Map<number, ViperTrade> = new Map();
  private dashboardWidgets: Map<number, DashboardWidget> = new Map();
  
  // Persistent storage tracking
  private static instance: MemStorage | null = null;
  
  private currentUserId = 1;
  private currentAssetId = 1;
  private currentPositionId = 1;
  private currentOrderId = 1;
  private currentTradeId = 1;
  private currentRiskId = 1;
  private currentViperSettingsId = 1;
  private currentClusterId = 1;
  private currentViperTradeId = 1;
  private currentWidgetId = 1;

  constructor() {
    // Implement singleton pattern to prevent balance resets
    if (MemStorage.instance) {
      return MemStorage.instance;
    }
    
    this.initializeDefaultData();
    MemStorage.instance = this;
  }

  private initializeDefaultData() {
    // Never reset existing user data - preserve accumulated balance
    if (!this.users.has(1)) {
      // Only create default user if absolutely no user exists
      const defaultUser: User = {
        id: 1,
        username: "demo_trader",
        email: "demo@tradinglab.com",
        paperBalance: "1000.00000000",
        liveBalance: "0.00000000",
        isLiveMode: false,
        apiKey: null,
        apiSecret: null,
        apiPassphrase: null,
        exchangeName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(1, defaultUser);
      this.currentUserId = 2;
    }

    // Create default assets
    const defaultAssets: Asset[] = [
      {
        id: 1,
        symbol: "BTC",
        name: "Bitcoin",
        currentPrice: "43250.00000000",
        change24h: "2.34",
        volume24h: "28492.50000000",
        updatedAt: new Date(),
      },
      {
        id: 2,
        symbol: "ETH",
        name: "Ethereum",
        currentPrice: "2650.00000000",
        change24h: "-1.12",
        volume24h: "156789.25000000",
        updatedAt: new Date(),
      },
      {
        id: 3,
        symbol: "ADA",
        name: "Cardano",
        currentPrice: "0.48500000",
        change24h: "0.89",
        volume24h: "45632.10000000",
        updatedAt: new Date(),
      },
    ];

    defaultAssets.forEach(asset => {
      this.assets.set(asset.id, asset);
    });
    this.currentAssetId = 4;

    // Create default risk settings
    const defaultRiskSettings: RiskSettings = {
      id: 1,
      userId: 1,
      maxPositionSize: "15.00",
      stopLossPercentage: "5.00",
      takeProfitPercentage: "25.00",
      maxDailyLoss: "1000.00000000",
      updatedAt: new Date(),
    };
    this.riskSettings.set(1, defaultRiskSettings);
    this.currentRiskId = 2;

    // Create default viper settings
    const defaultViperSettings: ViperSettings = {
      id: 1,
      userId: 1,
      maxLeverage: 125,
      volThreshold: "0.00800",
      strikeWindow: "0.170",
      profitTarget: "2.00",
      stopLoss: "0.100",
      clusterThreshold: "0.00500",
      positionScaling: "1.00",
      maxConcurrentTrades: 2,
      balanceMultiplier: "2.00",
      isEnabled: false,
      updatedAt: new Date(),
    };
    this.viperSettings.set(1, defaultViperSettings);
    this.currentViperSettingsId = 2;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      id,
      username: insertUser.username,
      email: insertUser.email,
      paperBalance: insertUser.paperBalance || "100000.00000000",
      liveBalance: "0.00000000",
      isLiveMode: false,
      apiKey: null,
      apiSecret: null,
      apiPassphrase: null,
      exchangeName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserBalance(userId: number, newBalance: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, paperBalance: newBalance };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserExchangeCredentials(userId: number, apiKey: string, secretKey: string, passphrase: string, exchangeName: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { 
      ...user, 
      apiKey,
      apiSecret: secretKey,
      apiPassphrase: passphrase,
      exchangeName,
      updatedAt: new Date()
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Asset operations
  async getAllAssets(): Promise<Asset[]> {
    return Array.from(this.assets.values());
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    return this.assets.get(id);
  }

  async getAssetBySymbol(symbol: string): Promise<Asset | undefined> {
    return Array.from(this.assets.values()).find(asset => asset.symbol === symbol);
  }

  async updateAssetPrice(id: number, price: string, change24h: string): Promise<Asset> {
    const asset = this.assets.get(id);
    if (!asset) throw new Error("Asset not found");
    
    const updatedAsset = { 
      ...asset, 
      currentPrice: price, 
      change24h, 
      updatedAt: new Date() 
    };
    this.assets.set(id, updatedAsset);
    return updatedAsset;
  }

  // Portfolio operations
  async getPortfolioPositions(userId: number): Promise<PortfolioPosition[]> {
    return Array.from(this.portfolioPositions.values()).filter(
      position => position.userId === userId
    );
  }

  async getPortfolioPosition(userId: number, assetId: number): Promise<PortfolioPosition | undefined> {
    return Array.from(this.portfolioPositions.values()).find(
      position => position.userId === userId && position.assetId === assetId
    );
  }

  async createPortfolioPosition(insertPosition: InsertPortfolioPosition): Promise<PortfolioPosition> {
    const id = this.currentPositionId++;
    const position: PortfolioPosition = {
      ...insertPosition,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.portfolioPositions.set(id, position);
    return position;
  }

  async updatePortfolioPosition(id: number, quantity: string, averagePrice: string, totalInvested: string): Promise<PortfolioPosition> {
    const position = this.portfolioPositions.get(id);
    if (!position) throw new Error("Position not found");
    
    const updatedPosition = {
      ...position,
      quantity,
      averagePrice,
      totalInvested,
      updatedAt: new Date(),
    };
    this.portfolioPositions.set(id, updatedPosition);
    return updatedPosition;
  }

  async deletePortfolioPosition(id: number): Promise<void> {
    this.portfolioPositions.delete(id);
  }

  // Order operations
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.currentOrderId++;
    const order: Order = {
      id,
      userId: insertOrder.userId,
      assetId: insertOrder.assetId,
      type: insertOrder.type,
      side: insertOrder.side,
      quantity: insertOrder.quantity,
      price: insertOrder.price || null,
      status: insertOrder.status || "pending",
      stopPrice: insertOrder.stopPrice || null,
      takeProfitPrice: insertOrder.takeProfitPrice || null,
      filledAt: null,
      createdAt: new Date(),
    };
    this.orders.set(id, order);
    return order;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(order => order.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async updateOrderStatus(id: number, status: string, filledAt?: Date): Promise<Order> {
    const order = this.orders.get(id);
    if (!order) throw new Error("Order not found");
    
    const updatedOrder = {
      ...order,
      status,
      filledAt: filledAt || null,
    };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  // Trade operations
  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const id = this.currentTradeId++;
    const trade: Trade = {
      id,
      userId: insertTrade.userId,
      orderId: insertTrade.orderId,
      assetId: insertTrade.assetId,
      side: insertTrade.side,
      quantity: insertTrade.quantity,
      price: insertTrade.price,
      total: insertTrade.total,
      pnl: insertTrade.pnl || "0",
      executedAt: new Date(),
    };
    this.trades.set(id, trade);
    return trade;
  }

  async getUserTrades(userId: number): Promise<Trade[]> {
    return Array.from(this.trades.values())
      .filter(trade => trade.userId === userId)
      .sort((a, b) => (b.executedAt?.getTime() || 0) - (a.executedAt?.getTime() || 0));
  }

  // Risk settings operations
  async getRiskSettings(userId: number): Promise<RiskSettings | undefined> {
    return Array.from(this.riskSettings.values()).find(
      settings => settings.userId === userId
    );
  }

  async updateRiskSettings(insertSettings: InsertRiskSettings): Promise<RiskSettings> {
    const existing = Array.from(this.riskSettings.values()).find(
      settings => settings.userId === insertSettings.userId
    );

    if (existing) {
      const updated: RiskSettings = {
        id: existing.id,
        userId: insertSettings.userId,
        maxPositionSize: insertSettings.maxPositionSize || existing.maxPositionSize,
        stopLossPercentage: insertSettings.stopLossPercentage || existing.stopLossPercentage,
        takeProfitPercentage: insertSettings.takeProfitPercentage || existing.takeProfitPercentage,
        maxDailyLoss: insertSettings.maxDailyLoss || existing.maxDailyLoss,
        updatedAt: new Date(),
      };
      this.riskSettings.set(existing.id, updated);
      return updated;
    } else {
      const id = this.currentRiskId++;
      const newSettings: RiskSettings = {
        id,
        userId: insertSettings.userId,
        maxPositionSize: insertSettings.maxPositionSize || "15.00",
        stopLossPercentage: insertSettings.stopLossPercentage || "5.00",
        takeProfitPercentage: insertSettings.takeProfitPercentage || "25.00",
        maxDailyLoss: insertSettings.maxDailyLoss || "1000.00000000",
        updatedAt: new Date(),
      };
      this.riskSettings.set(id, newSettings);
      return newSettings;
    }
  }

  // Viper settings operations
  async getViperSettings(userId: number): Promise<ViperSettings | undefined> {
    return Array.from(this.viperSettings.values()).find(
      settings => settings.userId === userId
    );
  }

  async createViperSettings(insertSettings: InsertViperSettings): Promise<ViperSettings> {
    const id = this.currentViperSettingsId++;
    const newSettings: ViperSettings = {
      id,
      userId: insertSettings.userId,
      maxLeverage: insertSettings.maxLeverage || 125,
      volThreshold: insertSettings.volThreshold || "0.00800",
      strikeWindow: insertSettings.strikeWindow || "0.170",
      profitTarget: insertSettings.profitTarget || "2.00",
      stopLoss: insertSettings.stopLoss || "0.100",
      clusterThreshold: insertSettings.clusterThreshold || "0.00500",
      positionScaling: insertSettings.positionScaling || "1.00",
      maxConcurrentTrades: insertSettings.maxConcurrentTrades || 2,
      balanceMultiplier: insertSettings.balanceMultiplier || "2.00",
      isEnabled: insertSettings.isEnabled || false,
      updatedAt: new Date(),
    };
    this.viperSettings.set(id, newSettings);
    return newSettings;
  }

  async updateViperSettings(insertSettings: InsertViperSettings): Promise<ViperSettings> {
    const existing = Array.from(this.viperSettings.values()).find(
      settings => settings.userId === insertSettings.userId
    );

    if (existing) {
      const updated: ViperSettings = {
        id: existing.id,
        userId: insertSettings.userId,
        maxLeverage: insertSettings.maxLeverage || existing.maxLeverage,
        volThreshold: insertSettings.volThreshold || existing.volThreshold,
        strikeWindow: insertSettings.strikeWindow || existing.strikeWindow,
        profitTarget: insertSettings.profitTarget || existing.profitTarget,
        stopLoss: insertSettings.stopLoss || existing.stopLoss,
        clusterThreshold: insertSettings.clusterThreshold || existing.clusterThreshold,
        positionScaling: insertSettings.positionScaling || existing.positionScaling,
        maxConcurrentTrades: insertSettings.maxConcurrentTrades || existing.maxConcurrentTrades,
        balanceMultiplier: insertSettings.balanceMultiplier || existing.balanceMultiplier,
        isEnabled: insertSettings.isEnabled ?? existing.isEnabled,
        updatedAt: new Date(),
      };
      this.viperSettings.set(existing.id, updated);
      return updated;
    } else {
      const id = this.currentViperSettingsId++;
      const newSettings: ViperSettings = {
        id,
        userId: insertSettings.userId,
        maxLeverage: insertSettings.maxLeverage || 125,
        volThreshold: insertSettings.volThreshold || "0.00800",
        strikeWindow: insertSettings.strikeWindow || "0.170",
        profitTarget: insertSettings.profitTarget || "2.00",
        stopLoss: insertSettings.stopLoss || "0.100",
        clusterThreshold: insertSettings.clusterThreshold || "0.00500",
        positionScaling: insertSettings.positionScaling || "1.00",
        maxConcurrentTrades: insertSettings.maxConcurrentTrades || 2,
        balanceMultiplier: insertSettings.balanceMultiplier || "2.00",
        isEnabled: insertSettings.isEnabled || false,
        updatedAt: new Date(),
      };
      this.viperSettings.set(id, newSettings);
      return newSettings;
    }
  }

  // Liquidation cluster operations
  async createLiquidationCluster(insertCluster: InsertLiquidationCluster): Promise<LiquidationCluster> {
    const id = this.currentClusterId++;
    const cluster: LiquidationCluster = {
      id,
      instId: insertCluster.instId,
      price: insertCluster.price,
      size: insertCluster.size,
      side: insertCluster.side,
      volume: insertCluster.volume,
      processed: insertCluster.processed || false,
      timestamp: new Date(),
    };
    this.liquidationClusters.set(id, cluster);
    return cluster;
  }

  async getUnprocessedClusters(): Promise<LiquidationCluster[]> {
    return Array.from(this.liquidationClusters.values())
      .filter(cluster => !cluster.processed)
      .sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));
  }

  async markClusterProcessed(id: number): Promise<void> {
    const cluster = this.liquidationClusters.get(id);
    if (cluster) {
      const updated = { ...cluster, processed: true };
      this.liquidationClusters.set(id, updated);
    }
  }

  // Viper trade operations
  async createViperTrade(insertTrade: InsertViperTrade): Promise<ViperTrade> {
    const id = this.currentViperTradeId++;
    const trade: ViperTrade = {
      id,
      userId: insertTrade.userId,
      clusterId: insertTrade.clusterId || null,
      instId: insertTrade.instId,
      side: insertTrade.side,
      entryPrice: insertTrade.entryPrice,
      quantity: insertTrade.quantity,
      leverage: insertTrade.leverage,
      takeProfitPrice: insertTrade.takeProfitPrice || null,
      stopLossPrice: insertTrade.stopLossPrice || null,
      status: insertTrade.status || "active",
      pnl: insertTrade.pnl || "0",
      exitPrice: insertTrade.exitPrice || null,
      entryTime: new Date(),
      exitTime: null,
    };
    this.viperTrades.set(id, trade);
    return trade;
  }

  async getActiveViperTrades(userId: number): Promise<ViperTrade[]> {
    return Array.from(this.viperTrades.values())
      .filter(trade => trade.userId === userId && trade.status === "active");
  }

  async getUserViperTrades(userId: number): Promise<ViperTrade[]> {
    return Array.from(this.viperTrades.values())
      .filter(trade => trade.userId === userId)
      .sort((a, b) => (b.entryTime?.getTime() || 0) - (a.entryTime?.getTime() || 0));
  }

  async updateViperTrade(id: number, updates: Partial<ViperTrade>): Promise<ViperTrade> {
    const trade = this.viperTrades.get(id);
    if (!trade) throw new Error("Viper trade not found");
    
    const updatedTrade: ViperTrade = {
      ...trade,
      ...updates,
      exitTime: updates.status === "completed" || updates.status === "stopped" ? new Date() : trade.exitTime,
    };
    this.viperTrades.set(id, updatedTrade);
    return updatedTrade;
  }

  // Dashboard widget operations
  async getUserWidgets(userId: number): Promise<DashboardWidget[]> {
    return Array.from(this.dashboardWidgets.values()).filter(widget => widget.userId === userId);
  }

  async createWidget(insertWidget: InsertDashboardWidget): Promise<DashboardWidget> {
    const widget: DashboardWidget = {
      id: this.currentWidgetId++,
      userId: insertWidget.userId,
      widgetType: insertWidget.widgetType,
      size: insertWidget.size || "medium",
      position: insertWidget.position || 0,
      isVisible: insertWidget.isVisible !== undefined ? insertWidget.isVisible : true,
      config: insertWidget.config || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.dashboardWidgets.set(widget.id, widget);
    return widget;
  }

  async updateWidget(id: number, updates: Partial<DashboardWidget>): Promise<DashboardWidget> {
    const existingWidget = this.dashboardWidgets.get(id);
    if (!existingWidget) {
      throw new Error(`Widget with id ${id} not found`);
    }

    const updatedWidget: DashboardWidget = {
      ...existingWidget,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.dashboardWidgets.set(id, updatedWidget);
    return updatedWidget;
  }

  async deleteWidget(id: number): Promise<void> {
    this.dashboardWidgets.delete(id);
  }

  async reorderWidgets(userId: number, widgetOrders: { id: number; position: number }[]): Promise<void> {
    for (const order of widgetOrders) {
      const widget = this.dashboardWidgets.get(order.id);
      if (widget && widget.userId === userId) {
        const updatedWidget: DashboardWidget = {
          ...widget,
          position: order.position,
          updatedAt: new Date(),
        };
        this.dashboardWidgets.set(order.id, updatedWidget);
      }
    }
  }

  // Live trading operations
  async toggleLiveMode(userId: number, isLive: boolean): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser: User = { 
      ...user, 
      isLiveMode: isLive,
      updatedAt: new Date()
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUser(userId: number, updates: Partial<User>): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser: User = { 
      ...user, 
      ...updates,
      updatedAt: new Date()
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateExchangeCredentials(userId: number, credentials: {
    apiKey: string;
    apiSecret: string;
    apiPassphrase?: string;
    exchangeName: string;
  }): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser: User = {
      ...user,
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
      apiPassphrase: credentials.apiPassphrase || null,
      exchangeName: credentials.exchangeName,
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getCurrentBalance(userId: number): Promise<string> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    return user.isLiveMode ? user.liveBalance : user.paperBalance;
  }

  async updateCurrentBalance(userId: number, balance: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser: User = {
      ...user,
      ...(user.isLiveMode ? { liveBalance: balance } : { paperBalance: balance }),
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
}

export class DatabaseStorage implements IStorage {
  private initialized = false;

  private async initializeDefaultData() {
    if (this.initialized) return;
    
    // Initialize default user if none exists
    const existingUsers = await db.select().from(users);
    if (existingUsers.length === 0) {
      await this.createUser({
        username: "demo_trader",
        email: "demo@tradinglab.com",
        paperBalance: "10.00000000"
      });
    }

    // Initialize default assets if none exist
    const existingAssets = await db.select().from(assets);
    if (existingAssets.length === 0) {
      const defaultAssets = [
        { symbol: "BTC", name: "Bitcoin", currentPrice: "45000.00000000", change24h: "2.5", volume24h: "1000000000.00000000" },
        { symbol: "ETH", name: "Ethereum", currentPrice: "2800.00000000", change24h: "1.8", volume24h: "500000000.00000000" },
        { symbol: "SOL", name: "Solana", currentPrice: "110.00000000", change24h: "3.2", volume24h: "200000000.00000000" },
        { symbol: "ADA", name: "Cardano", currentPrice: "0.55000000", change24h: "-0.5", volume24h: "150000000.00000000" },
      ];

      for (const asset of defaultAssets) {
        await db.insert(assets).values(asset);
      }
    }

    this.initialized = true;
  }

  async getUser(id: number): Promise<User | undefined> {
    await this.initializeDefaultData();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserBalance(userId: number, newBalance: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ paperBalance: newBalance })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllAssets(): Promise<Asset[]> {
    return await db.select().from(assets);
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset || undefined;
  }

  async getAssetBySymbol(symbol: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.symbol, symbol));
    return asset || undefined;
  }

  async updateAssetPrice(id: number, price: string, change24h: string): Promise<Asset> {
    const [asset] = await db
      .update(assets)
      .set({ currentPrice: price, change24h, updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();
    return asset;
  }

  async getPortfolioPositions(userId: number): Promise<PortfolioPosition[]> {
    return await db.select().from(portfolioPositions).where(eq(portfolioPositions.userId, userId));
  }

  async getPortfolioPosition(userId: number, assetId: number): Promise<PortfolioPosition | undefined> {
    const [position] = await db
      .select()
      .from(portfolioPositions)
      .where(and(eq(portfolioPositions.userId, userId), eq(portfolioPositions.assetId, assetId)));
    return position || undefined;
  }

  async createPortfolioPosition(insertPosition: InsertPortfolioPosition): Promise<PortfolioPosition> {
    const [position] = await db
      .insert(portfolioPositions)
      .values(insertPosition)
      .returning();
    return position;
  }

  async updatePortfolioPosition(id: number, quantity: string, averagePrice: string, totalInvested: string): Promise<PortfolioPosition> {
    const [position] = await db
      .update(portfolioPositions)
      .set({ quantity, averagePrice, totalInvested, updatedAt: new Date() })
      .where(eq(portfolioPositions.id, id))
      .returning();
    return position;
  }

  async deletePortfolioPosition(id: number): Promise<void> {
    await db.delete(portfolioPositions).where(eq(portfolioPositions.id, id));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db
      .insert(orders)
      .values(insertOrder)
      .returning();
    return order;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId));
  }

  async updateOrderStatus(id: number, status: string, filledAt?: Date): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({ status, filledAt })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const [trade] = await db
      .insert(trades)
      .values(insertTrade)
      .returning();
    return trade;
  }

  async getUserTrades(userId: number): Promise<Trade[]> {
    return await db.select().from(trades).where(eq(trades.userId, userId));
  }

  async getRiskSettings(userId: number): Promise<RiskSettings | undefined> {
    const [settings] = await db.select().from(riskSettings).where(eq(riskSettings.userId, userId));
    return settings || undefined;
  }

  async updateRiskSettings(insertSettings: InsertRiskSettings): Promise<RiskSettings> {
    const existing = await this.getRiskSettings(insertSettings.userId);
    
    if (existing) {
      const [updated] = await db
        .update(riskSettings)
        .set({ ...insertSettings, updatedAt: new Date() })
        .where(eq(riskSettings.userId, insertSettings.userId))
        .returning();
      return updated;
    } else {
      const [newSettings] = await db
        .insert(riskSettings)
        .values(insertSettings)
        .returning();
      return newSettings;
    }
  }

  async getViperSettings(userId: number): Promise<ViperSettings | undefined> {
    const [settings] = await db.select().from(viperSettings).where(eq(viperSettings.userId, userId));
    return settings || undefined;
  }

  async createViperSettings(insertSettings: InsertViperSettings): Promise<ViperSettings> {
    const [newSettings] = await db
      .insert(viperSettings)
      .values({
        ...insertSettings,
        updatedAt: new Date()
      })
      .returning();
    return newSettings;
  }

  async updateViperSettings(insertSettings: InsertViperSettings): Promise<ViperSettings> {
    try {
      const existing = await this.getViperSettings(insertSettings.userId);
      
      if (existing) {
        const [updated] = await db
          .update(viperSettings)
          .set({ 
            maxLeverage: insertSettings.maxLeverage,
            volThreshold: insertSettings.volThreshold,
            strikeWindow: insertSettings.strikeWindow,
            profitTarget: insertSettings.profitTarget,
            stopLoss: insertSettings.stopLoss,
            clusterThreshold: insertSettings.clusterThreshold,
            positionScaling: insertSettings.positionScaling,
            maxConcurrentTrades: insertSettings.maxConcurrentTrades,
            balanceMultiplier: insertSettings.balanceMultiplier,
            isEnabled: insertSettings.isEnabled,
            updatedAt: new Date()
          })
          .where(eq(viperSettings.userId, insertSettings.userId))
          .returning();
        return updated;
      } else {
        const [newSettings] = await db
          .insert(viperSettings)
          .values({
            ...insertSettings,
            updatedAt: new Date()
          })
          .returning();
        return newSettings;
      }
    } catch (error) {
      console.error("Error updating VIPER settings:", error);
      throw error;
    }
  }

  async createLiquidationCluster(insertCluster: InsertLiquidationCluster): Promise<LiquidationCluster> {
    const [cluster] = await db
      .insert(liquidationClusters)
      .values(insertCluster)
      .returning();
    return cluster;
  }

  async getUnprocessedClusters(): Promise<LiquidationCluster[]> {
    return await db.select().from(liquidationClusters).where(eq(liquidationClusters.processed, false));
  }

  async markClusterProcessed(id: number): Promise<void> {
    await db
      .update(liquidationClusters)
      .set({ processed: true })
      .where(eq(liquidationClusters.id, id));
  }

  async createViperTrade(insertTrade: InsertViperTrade): Promise<ViperTrade> {
    const [trade] = await db
      .insert(viperTrades)
      .values(insertTrade)
      .returning();
    return trade;
  }

  async getActiveViperTrades(userId: number): Promise<ViperTrade[]> {
    return await db
      .select()
      .from(viperTrades)
      .where(and(eq(viperTrades.userId, userId), eq(viperTrades.status, 'active')));
  }

  async getUserViperTrades(userId: number): Promise<ViperTrade[]> {
    return await db.select().from(viperTrades).where(eq(viperTrades.userId, userId));
  }

  async updateViperTrade(id: number, updates: Partial<ViperTrade>): Promise<ViperTrade> {
    const [trade] = await db
      .update(viperTrades)
      .set(updates)
      .where(eq(viperTrades.id, id))
      .returning();
    return trade;
  }

  // Dashboard widget operations
  async getUserWidgets(userId: number): Promise<DashboardWidget[]> {
    return await db.select().from(dashboardWidgets).where(eq(dashboardWidgets.userId, userId));
  }

  async createWidget(insertWidget: InsertDashboardWidget): Promise<DashboardWidget> {
    const [widget] = await db
      .insert(dashboardWidgets)
      .values(insertWidget)
      .returning();
    return widget;
  }

  async updateWidget(id: number, updates: Partial<DashboardWidget>): Promise<DashboardWidget> {
    const [updated] = await db
      .update(dashboardWidgets)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(dashboardWidgets.id, id))
      .returning();
    
    if (!updated) throw new Error("Widget not found");
    return updated;
  }

  async deleteWidget(id: number): Promise<void> {
    await db.delete(dashboardWidgets).where(eq(dashboardWidgets.id, id));
  }

  async reorderWidgets(userId: number, widgetOrders: { id: number; position: number }[]): Promise<void> {
    for (const { id, position } of widgetOrders) {
      await db
        .update(dashboardWidgets)
        .set({ position })
        .where(eq(dashboardWidgets.id, id));
    }
  }

  // Live trading operations
  async toggleLiveMode(userId: number, isLive: boolean): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ isLiveMode: isLive })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async updateExchangeCredentials(userId: number, credentials: {
    apiKey: string;
    apiSecret: string;
    apiPassphrase?: string;
    exchangeName: string;
  }): Promise<User> {
    try {
      console.log(`DatabaseStorage: Updating credentials for user ${userId}`);
      
      const [updated] = await db
        .update(users)
        .set({
          apiKey: credentials.apiKey,
          apiSecret: credentials.apiSecret,
          apiPassphrase: credentials.apiPassphrase || null,
          exchangeName: credentials.exchangeName,
        })
        .where(eq(users.id, userId))
        .returning();
      
      console.log(`DatabaseStorage: Update result:`, updated ? 'Success' : 'No user found');
      
      if (!updated) throw new Error("User not found");
      return updated;
    } catch (error) {
      console.error(`DatabaseStorage: Error updating credentials:`, error);
      throw error;
    }
  }

  async getCurrentBalance(userId: number): Promise<string> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");
    
    return user.isLiveMode ? user.liveBalance : user.paperBalance;
  }

  async updateCurrentBalance(userId: number, balance: string): Promise<User> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");
    
    const [updated] = await db
      .update(users)
      .set(user.isLiveMode ? { liveBalance: balance } : { paperBalance: balance })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async updateUserExchangeCredentials(userId: number, apiKey: string, secretKey: string, passphrase: string, exchangeName: string): Promise<User> {
    await this.initializeDefaultData();
    
    const [updated] = await db
      .update(users)
      .set({
        apiKey,
        apiSecret: secretKey,
        apiPassphrase: passphrase,
        exchangeName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updated) throw new Error("User not found");
    return updated;
  }
}

// Use DatabaseStorage for permanent persistence across restarts
// Switch to database storage for persistent balance tracking
export const storage = new DatabaseStorage();
