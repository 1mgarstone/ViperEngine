import { 
  users, assets, portfolioPositions, orders, trades, riskSettings,
  type User, type InsertUser,
  type Asset, type InsertAsset,
  type PortfolioPosition, type InsertPortfolioPosition,
  type Order, type InsertOrder,
  type Trade, type InsertTrade,
  type RiskSettings, type InsertRiskSettings
} from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private assets: Map<number, Asset> = new Map();
  private portfolioPositions: Map<number, PortfolioPosition> = new Map();
  private orders: Map<number, Order> = new Map();
  private trades: Map<number, Trade> = new Map();
  private riskSettings: Map<number, RiskSettings> = new Map();
  
  private currentUserId = 1;
  private currentAssetId = 1;
  private currentPositionId = 1;
  private currentOrderId = 1;
  private currentTradeId = 1;
  private currentRiskId = 1;

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Create default user
    const defaultUser: User = {
      id: 1,
      username: "demo_trader",
      email: "demo@tradinglab.com",
      paperBalance: "100000.00000000",
      createdAt: new Date(),
    };
    this.users.set(1, defaultUser);
    this.currentUserId = 2;

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
      ...insertUser,
      id,
      createdAt: new Date(),
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
      ...insertOrder,
      id,
      createdAt: new Date(),
      filledAt: null,
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
      ...insertTrade,
      id,
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
      const updated = { ...existing, ...insertSettings, updatedAt: new Date() };
      this.riskSettings.set(existing.id, updated);
      return updated;
    } else {
      const id = this.currentRiskId++;
      const newSettings: RiskSettings = {
        ...insertSettings,
        id,
        updatedAt: new Date(),
      };
      this.riskSettings.set(id, newSettings);
      return newSettings;
    }
  }
}

export const storage = new MemStorage();
