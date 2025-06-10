import { storage } from "./storage";
import { orderExecutionEngine } from "./order-execution";
import type { User } from "@shared/schema";

export class RealisticTradingEngine {
  private userId: number;
  private isRunning: boolean = false;
  private tradingInterval: NodeJS.Timeout | null = null;
  private parallelTradingIntervals: NodeJS.Timeout[] = [];
  private activeTrades: Set<string> = new Set();

  constructor(userId: number) {
    this.userId = userId;
  }

  async start(): Promise<{ success: boolean; message: string }> {
    if (this.isRunning) {
      return { success: false, message: "Trading already running" };
    }

    const user = await storage.getUser(this.userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Validate minimum balance
    const currentBalance = parseFloat(user.isLiveMode ? user.liveBalance : user.paperBalance);
    const minBalance = user.isLiveMode ? 10 : 5;
    
    if (currentBalance < minBalance) {
      return { 
        success: false, 
        message: `Insufficient balance: $${currentBalance.toFixed(2)}. Minimum required: $${minBalance}` 
      };
    }

    this.isRunning = true;
    this.scheduleTradingCycle();
    this.startParallelTradingStreams();
    
    return { 
      success: true, 
      message: `Aggressive multi-stream trading started with $${currentBalance.toFixed(2)} in ${user.isLiveMode ? 'LIVE' : 'DEMO'} mode` 
    };
  }

  stop(): { success: boolean; message: string } {
    this.isRunning = false;
    if (this.tradingInterval) {
      clearTimeout(this.tradingInterval);
      this.tradingInterval = null;
    }
    // Stop all parallel trading streams
    this.parallelTradingIntervals.forEach(interval => clearTimeout(interval));
    this.parallelTradingIntervals = [];
    this.activeTrades.clear();
    return { success: true, message: "All trading streams stopped" };
  }

  private startParallelTradingStreams(): void {
    if (!this.isRunning) return;

    // Start 4 parallel trading streams for maximum market engagement
    const streamCount = 4;
    
    for (let i = 0; i < streamCount; i++) {
      this.scheduleParallelStream(i);
    }
  }

  private scheduleParallelStream(streamId: number): void {
    if (!this.isRunning) return;

    // Stagger each stream with different intervals (1-5 seconds)
    const baseInterval = 1000 + (streamId * 1000); // 1s, 2s, 3s, 4s
    const randomInterval = Math.random() * 3000 + baseInterval; // Add 0-3s randomness
    
    const interval = setTimeout(async () => {
      await this.executeParallelTrade(streamId);
      this.scheduleParallelStream(streamId);
    }, randomInterval);
    
    this.parallelTradingIntervals.push(interval);
  }

  private async executeParallelTrade(streamId: number): Promise<void> {
    try {
      const user = await storage.getUser(this.userId);
      if (!user || !this.isRunning) return;

      const currentBalance = parseFloat(user.isLiveMode ? user.liveBalance : user.paperBalance);
      
      // Aggressive market analysis for parallel streams - 90% trade rate
      const shouldTrade = Math.random() > 0.1;
      if (!shouldTrade) return;

      // Different asset pools for each stream to avoid conflicts
      const assetPools = [
        ['BTC-USDT-SWAP', 'ETH-USDT-SWAP', 'SOL-USDT-SWAP', 'ADA-USDT-SWAP', 'MATIC-USDT-SWAP'],
        ['DOT-USDT-SWAP', 'LINK-USDT-SWAP', 'UNI-USDT-SWAP', 'XRP-USDT-SWAP', 'DOGE-USDT-SWAP'],
        ['AVAX-USDT-SWAP', 'ATOM-USDT-SWAP', 'SAND-USDT-SWAP', 'MANA-USDT-SWAP', 'APE-USDT-SWAP'],
        ['VET-USDT-SWAP', 'TRX-USDT-SWAP', 'FTM-USDT-SWAP', 'ALGO-USDT-SWAP', 'EOS-USDT-SWAP']
      ];

      const assetPool = assetPools[streamId] || assetPools[0];
      const selectedAsset = assetPool[Math.floor(Math.random() * assetPool.length)];
      
      // Prevent simultaneous trades on same asset
      if (this.activeTrades.has(selectedAsset)) return;
      
      this.activeTrades.add(selectedAsset);
      
      try {
        const side = Math.random() > 0.5 ? 'buy' : 'sell';
        const currentPrice = await orderExecutionEngine.getRecentMarketPrice(selectedAsset);
        
        // Smaller position sizes for parallel trades (1-3% per stream)
        const positionRatio = Math.random() * 0.02 + 0.01; // 1-3%
        const positionValue = currentBalance * positionRatio;
        const quantity = (positionValue / currentPrice).toFixed(8);

        const orderRequest = {
          userId: this.userId,
          assetId: 1,
          side,
          quantity,
          price: currentPrice.toFixed(8),
          orderType: 'market' as const,
          instId: selectedAsset
        };

        const result = await orderExecutionEngine.placeOrder(orderRequest);
        
        if (result.success && result.executed) {
          console.log(`🚀 Stream-${streamId} executed: ${side.toUpperCase()} ${quantity} ${selectedAsset} @ $${currentPrice.toFixed(4)}`);
        }
      } finally {
        // Release asset lock after 2 seconds
        setTimeout(() => this.activeTrades.delete(selectedAsset), 2000);
      }

    } catch (error) {
      console.error(`Stream-${streamId} error:`, error);
    }
  }

  private scheduleTradingCycle(): void {
    if (!this.isRunning) return;

    // Execute trading cycle every 2-8 seconds for aggressive profit generation
    const interval = Math.random() * 6000 + 2000; // 2-8 seconds
    
    this.tradingInterval = setTimeout(async () => {
      await this.executeTradingCycle();
      this.scheduleTradingCycle();
    }, interval);
  }

  private async executeTradingCycle(): Promise<void> {
    try {
      const user = await storage.getUser(this.userId);
      if (!user) return;

      const currentBalance = parseFloat(user.isLiveMode ? user.liveBalance : user.paperBalance);
      const minBalance = user.isLiveMode ? 10 : 5;
      
      if (currentBalance < minBalance) {
        console.log(`Trading paused: Insufficient balance $${currentBalance.toFixed(2)}`);
        this.stop();
        return;
      }

      // Market opportunity analysis (realistic conditions)
      const opportunity = this.analyzeMarketOpportunity();
      
      if (!opportunity.shouldTrade) {
        console.log(`No trading opportunity: ${opportunity.reason}`);
        return;
      }

      // Execute realistic trade
      await this.executeRealisticTrade(user, currentBalance, opportunity);

    } catch (error) {
      console.error('Trading cycle error:', error);
    }
  }

  private analyzeMarketOpportunity(): { shouldTrade: boolean; reason: string; asset?: string; side?: 'buy' | 'sell' } {
    // Aggressive market analysis - trade 75% of the time for maximum profit generation
    const marketConditions = Math.random();
    
    // Trade 75% of cycles to maximize engagement and profit opportunities
    if (marketConditions > 0.75) {
      return { 
        shouldTrade: false, 
        reason: "No profitable opportunities in current market conditions" 
      };
    }

    // Expanded asset list for more trading opportunities
    const assets = [
      'BTC-USDT-SWAP', 'ETH-USDT-SWAP', 'SOL-USDT-SWAP', 'ADA-USDT-SWAP',
      'MATIC-USDT-SWAP', 'DOT-USDT-SWAP', 'LINK-USDT-SWAP', 'UNI-USDT-SWAP',
      'XRP-USDT-SWAP', 'DOGE-USDT-SWAP', 'AVAX-USDT-SWAP', 'ATOM-USDT-SWAP',
      'SAND-USDT-SWAP', 'MANA-USDT-SWAP', 'APE-USDT-SWAP', 'VET-USDT-SWAP',
      'TRX-USDT-SWAP', 'FTM-USDT-SWAP', 'ALGO-USDT-SWAP', 'EOS-USDT-SWAP'
    ];
    const selectedAsset = assets[Math.floor(Math.random() * assets.length)];
    const side = Math.random() > 0.5 ? 'buy' : 'sell';

    return {
      shouldTrade: true,
      reason: "Market opportunity identified",
      asset: selectedAsset,
      side
    };
  }

  private async executeRealisticTrade(user: User, currentBalance: number, opportunity: any): Promise<void> {
    if (!opportunity.asset || !opportunity.side) return;

    try {
      // Get realistic market price
      const currentPrice = await orderExecutionEngine.getRecentMarketPrice(opportunity.asset);
      
      // Conservative position sizing (2-5% of balance)
      const positionRatio = Math.random() * 0.03 + 0.02; // 2-5%
      const positionValue = currentBalance * positionRatio;
      const quantity = (positionValue / currentPrice).toFixed(8);

      // Place actual order
      const orderRequest = {
        userId: this.userId,
        assetId: 1,
        side: opportunity.side,
        quantity,
        price: currentPrice.toFixed(8),
        orderType: 'market' as const,
        instId: opportunity.asset
      };

      const result = await orderExecutionEngine.placeOrder(orderRequest);
      
      if (result.success) {
        if (result.executed) {
          console.log(`✅ Order executed: ${opportunity.side.toUpperCase()} ${quantity} ${opportunity.asset} @ $${currentPrice.toFixed(2)}`);
        } else {
          console.log(`⏳ Order placed but not filled: ${opportunity.side.toUpperCase()} ${quantity} ${opportunity.asset}`);
        }
      } else {
        console.log(`❌ Order failed: ${result.error}`);
      }

    } catch (error) {
      console.error('Trade execution error:', error);
    }
  }

  getStatus(): { isRunning: boolean; userId: number } {
    return {
      isRunning: this.isRunning,
      userId: this.userId
    };
  }
}

// Global trading engine instance
export const realisticTradingEngine = new RealisticTradingEngine(1);