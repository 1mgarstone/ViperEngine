import { storage } from "./storage";
import type { ViperSettings, LiquidationCluster, ViperTrade } from "@shared/schema";

interface MarketDataPoint {
  price: string;
  size: string;
  side: string;
  timestamp: number;
}

interface VolatilityMetrics {
  index: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number;
}

export class ViperEngine {
  private userId: number;
  private settings: ViperSettings | null = null;
  private activeTrades: Map<string, ViperTrade> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  
  constructor(userId: number) {
    this.userId = userId;
  }

  async initialize(): Promise<void> {
    this.settings = await storage.getViperSettings(this.userId);
    if (!this.settings) {
      // Create default settings if none exist
      this.settings = await storage.updateViperSettings({
        userId: this.userId,
        maxLeverage: 125,
        volThreshold: "0.008",
        strikeWindow: "0.170",
        profitTarget: "2.00",
        stopLoss: "0.100",
        clusterThreshold: "0.005",
        positionScaling: "1.00",
        maxConcurrentTrades: 2,
        balanceMultiplier: "2.00",
        isEnabled: false,
      });
    }
    
    // Load active trades
    const trades = await storage.getActiveViperTrades(this.userId);
    trades.forEach(trade => {
      this.activeTrades.set(trade.instId, trade);
    });
  }

  async detectLiquidationClusters(instId: string, marketData: MarketDataPoint[]): Promise<LiquidationCluster[]> {
    if (!this.settings) return [];
    
    const strikeWindow = parseFloat(this.settings.strikeWindow);
    const clusterThreshold = parseFloat(this.settings.clusterThreshold);
    
    // Group liquidations by price windows
    const priceGroups: Map<number, { size: number; count: number; side: string }> = new Map();
    
    for (const data of marketData) {
      const price = parseFloat(data.price);
      const size = parseFloat(data.size);
      const windowKey = Math.round(price / strikeWindow) * strikeWindow;
      
      if (!priceGroups.has(windowKey)) {
        priceGroups.set(windowKey, { size: 0, count: 0, side: data.side });
      }
      
      const group = priceGroups.get(windowKey)!;
      group.size += size;
      group.count += 1;
    }
    
    // Filter significant clusters
    const clusters: LiquidationCluster[] = [];
    const user = await storage.getUser(this.userId);
    const balance = parseFloat(user?.paperBalance || "0");
    
    for (const [price, group] of priceGroups) {
      const relativeSize = group.size / balance;
      
      if (relativeSize >= clusterThreshold && group.count >= 3) {
        const cluster = await storage.createLiquidationCluster({
          instId,
          price: price.toFixed(8),
          size: group.size.toFixed(8),
          side: group.side === 'buy' ? 'long' : 'short',
          volume: (group.size * price).toFixed(8),
          processed: false,
        });
        
        clusters.push(cluster);
      }
    }
    
    return clusters.sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume));
  }

  calculateVolatilityIndex(instId: string, currentPrice: number): VolatilityMetrics {
    let history = this.priceHistory.get(instId) || [];
    history.push(currentPrice);
    
    // Keep last 50 price points
    if (history.length > 50) {
      history = history.slice(-50);
    }
    this.priceHistory.set(instId, history);
    
    if (history.length < 10) {
      return { index: 0, trend: 'neutral', strength: 0 };
    }
    
    // Calculate price changes
    const changes = [];
    for (let i = 1; i < history.length; i++) {
      changes.push((history[i] - history[i-1]) / history[i-1]);
    }
    
    // Calculate volatility (standard deviation of returns)
    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const variance = changes.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / changes.length;
    const volatility = Math.sqrt(variance);
    
    // Normalize to 0-100 scale
    const volIndex = Math.min(100, volatility * 10000);
    
    // Determine trend
    const recentChanges = changes.slice(-10);
    const trendValue = recentChanges.reduce((sum, change) => sum + change, 0);
    const trend = trendValue > 0.001 ? 'bullish' : trendValue < -0.001 ? 'bearish' : 'neutral';
    
    return {
      index: volIndex,
      trend,
      strength: Math.abs(trendValue) * 1000,
    };
  }

  async calculatePositionSize(cluster: LiquidationCluster, balance: number): Promise<number> {
    if (!this.settings) return 0;
    
    const maxLeverage = this.settings.maxLeverage;
    const positionScaling = parseFloat(this.settings.positionScaling);
    const balanceMultiplier = parseFloat(this.settings.balanceMultiplier);
    
    // Base position calculation
    const clusterVolume = parseFloat(cluster.volume);
    const maxCapital = balance * balanceMultiplier;
    const leveragedCapital = maxCapital * maxLeverage;
    
    // Position size as percentage of cluster volume
    const baseSize = clusterVolume * 0.1; // 10% of cluster volume
    const scaledSize = baseSize * positionScaling;
    
    // Limit by available capital
    const clusterPrice = parseFloat(cluster.price);
    const maxAffordableSize = leveragedCapital / clusterPrice;
    
    return Math.min(scaledSize, maxAffordableSize);
  }

  async executeLiquidationStrike(cluster: LiquidationCluster): Promise<ViperTrade | null> {
    if (!this.settings?.isEnabled) return null;
    
    // Check concurrent trades limit
    if (this.activeTrades.size >= this.settings.maxConcurrentTrades) {
      return null;
    }
    
    // Check if already trading this instrument
    if (this.activeTrades.has(cluster.instId)) {
      return null;
    }
    
    const user = await storage.getUser(this.userId);
    if (!user) return null;
    
    const balance = parseFloat(user.paperBalance);
    const positionSize = await this.calculatePositionSize(cluster, balance);
    
    if (positionSize <= 0) return null;
    
    // Calculate entry parameters
    const entryPrice = parseFloat(cluster.price);
    const profitTarget = parseFloat(this.settings.profitTarget) / 100;
    const stopLoss = parseFloat(this.settings.stopLoss) / 100;
    
    // Determine trade direction (counter to liquidation cluster)
    const side = cluster.side === 'long' ? 'sell' : 'buy';
    
    // Calculate exit prices
    const takeProfitPrice = side === 'buy' 
      ? entryPrice * (1 + profitTarget)
      : entryPrice * (1 - profitTarget);
      
    const stopLossPrice = side === 'buy'
      ? entryPrice * (1 - stopLoss)
      : entryPrice * (1 + stopLoss);
    
    // Create viper trade
    const trade = await storage.createViperTrade({
      userId: this.userId,
      clusterId: cluster.id,
      instId: cluster.instId,
      side,
      entryPrice: entryPrice.toFixed(8),
      quantity: positionSize.toFixed(8),
      leverage: this.settings.maxLeverage,
      takeProfitPrice: takeProfitPrice.toFixed(8),
      stopLossPrice: stopLossPrice.toFixed(8),
      status: "active",
      pnl: "0",
    });
    
    // Add to active trades
    this.activeTrades.set(cluster.instId, trade);
    
    // Mark cluster as processed
    await storage.markClusterProcessed(cluster.id);
    
    // Simulate order execution in paper trading
    await this.simulateOrderExecution(trade);
    
    return trade;
  }

  private async simulateOrderExecution(trade: ViperTrade): Promise<void> {
    // In real implementation, this would place actual orders
    // For simulation, we just update the user's balance
    
    const user = await storage.getUser(this.userId);
    if (!user) return;
    
    const entryPrice = parseFloat(trade.entryPrice);
    const quantity = parseFloat(trade.quantity);
    const totalValue = entryPrice * quantity;
    
    // Deduct margin requirement (simplified)
    const marginRequired = totalValue / trade.leverage;
    const newBalance = parseFloat(user.paperBalance) - marginRequired;
    
    await storage.updateUserBalance(this.userId, newBalance.toFixed(8));
  }

  async monitorActiveTrades(): Promise<void> {
    if (!this.settings) return;
    
    for (const [instId, trade] of this.activeTrades) {
      // Get current market price (simulated)
      const assets = await storage.getAllAssets();
      const asset = assets.find(a => `${a.symbol}-USDT-SWAP` === instId);
      
      if (!asset) continue;
      
      const currentPrice = parseFloat(asset.currentPrice);
      const entryPrice = parseFloat(trade.entryPrice);
      const quantity = parseFloat(trade.quantity);
      const takeProfitPrice = parseFloat(trade.takeProfitPrice || "0");
      const stopLossPrice = parseFloat(trade.stopLossPrice || "0");
      
      // Calculate current PnL
      let pnl = 0;
      if (trade.side === 'buy') {
        pnl = (currentPrice - entryPrice) * quantity;
      } else {
        pnl = (entryPrice - currentPrice) * quantity;
      }
      
      // Check exit conditions
      let shouldExit = false;
      let exitReason = "";
      
      if (trade.side === 'buy') {
        if (currentPrice >= takeProfitPrice) {
          shouldExit = true;
          exitReason = "take_profit";
        } else if (currentPrice <= stopLossPrice) {
          shouldExit = true;
          exitReason = "stop_loss";
        }
      } else {
        if (currentPrice <= takeProfitPrice) {
          shouldExit = true;
          exitReason = "take_profit";
        } else if (currentPrice >= stopLossPrice) {
          shouldExit = true;
          exitReason = "stop_loss";
        }
      }
      
      if (shouldExit) {
        await this.exitTrade(trade, currentPrice, exitReason);
      } else {
        // Update PnL
        await storage.updateViperTrade(trade.id, { pnl: pnl.toFixed(8) });
      }
    }
  }

  private async exitTrade(trade: ViperTrade, exitPrice: number, reason: string): Promise<void> {
    const quantity = parseFloat(trade.quantity);
    const entryPrice = parseFloat(trade.entryPrice);
    
    // Calculate final PnL
    let finalPnL = 0;
    if (trade.side === 'buy') {
      finalPnL = (exitPrice - entryPrice) * quantity;
    } else {
      finalPnL = (entryPrice - exitPrice) * quantity;
    }
    
    // Update trade status
    await storage.updateViperTrade(trade.id, {
      status: "completed",
      exitPrice: exitPrice.toFixed(8),
      pnl: finalPnL.toFixed(8),
    });
    
    // Update user balance
    const user = await storage.getUser(this.userId);
    if (user) {
      const currentBalance = parseFloat(user.paperBalance);
      const marginReleased = (entryPrice * quantity) / trade.leverage;
      const newBalance = currentBalance + marginReleased + finalPnL;
      
      await storage.updateUserBalance(this.userId, newBalance.toFixed(8));
    }
    
    // Remove from active trades
    this.activeTrades.delete(trade.instId);
  }

  async generateMarketData(instId: string): Promise<MarketDataPoint[]> {
    // Simulate liquidation data for educational purposes
    const basePrice = instId.includes('BTC') ? 43250 : instId.includes('ETH') ? 2650 : 0.485;
    const data: MarketDataPoint[] = [];
    
    // Generate 20-50 liquidation events
    const eventCount = Math.floor(Math.random() * 31) + 20;
    
    for (let i = 0; i < eventCount; i++) {
      const priceVariation = (Math.random() - 0.5) * 0.02; // ±1%
      const price = basePrice * (1 + priceVariation);
      const size = Math.random() * 5 + 0.1; // 0.1 to 5.1
      const side = Math.random() > 0.5 ? 'buy' : 'sell';
      
      data.push({
        price: price.toFixed(8),
        size: size.toFixed(8),
        side,
        timestamp: Date.now() - (Math.random() * 3600000), // Last hour
      });
    }
    
    return data.sort((a, b) => a.timestamp - b.timestamp);
  }

  async processAutomatedTradingCycle(): Promise<void> {
    if (!this.settings?.isEnabled) return;
    
    const instruments = ['BTC-USDT-SWAP', 'ETH-USDT-SWAP'];
    
    for (const instId of instruments) {
      try {
        // Generate market data for cluster detection
        const marketData = await this.generateMarketData(instId);
        
        // Detect liquidation clusters
        const clusters = await this.detectLiquidationClusters(instId, marketData);
        
        // Execute trades on significant clusters
        for (const cluster of clusters.slice(0, 2)) { // Max 2 clusters per cycle
          if (this.activeTrades.size >= this.settings.maxConcurrentTrades) break;
          
          await this.executeLiquidationStrike(cluster);
        }
        
        // Monitor existing trades
        await this.monitorActiveTrades();
        
      } catch (error) {
        console.error(`Error processing ${instId}:`, error);
      }
    }
  }

  isEnabled(): boolean {
    return this.settings?.isEnabled || false;
  }

  getActiveTrades(): ViperTrade[] {
    return Array.from(this.activeTrades.values());
  }

  async getPerformanceMetrics(): Promise<{
    totalTrades: number;
    activeTrades: number;
    totalPnL: number;
    winRate: number;
    avgPnL: number;
  }> {
    const allTrades = await storage.getUserViperTrades(this.userId);
    const completedTrades = allTrades.filter(t => t.status === 'completed');
    const activeTrades = allTrades.filter(t => t.status === 'active');
    
    const totalPnL = completedTrades.reduce((sum, trade) => sum + parseFloat(trade.pnl || '0'), 0);
    const winningTrades = completedTrades.filter(t => parseFloat(t.pnl || '0') > 0);
    const winRate = completedTrades.length > 0 ? (winningTrades.length / completedTrades.length) * 100 : 0;
    const avgPnL = completedTrades.length > 0 ? totalPnL / completedTrades.length : 0;
    
    return {
      totalTrades: allTrades.length,
      activeTrades: activeTrades.length,
      totalPnL,
      winRate,
      avgPnL,
    };
  }
}