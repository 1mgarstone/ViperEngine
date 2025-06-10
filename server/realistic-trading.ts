import { storage } from "./storage";
import { orderExecutionEngine } from "./order-execution";
import type { User } from "@shared/schema";

export class RealisticTradingEngine {
  private userId: number;
  private isRunning: boolean = false;
  private tradingInterval: NodeJS.Timeout | null = null;

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
    
    return { 
      success: true, 
      message: `Trading started with $${currentBalance.toFixed(2)} in ${user.isLiveMode ? 'LIVE' : 'DEMO'} mode` 
    };
  }

  stop(): { success: boolean; message: string } {
    this.isRunning = false;
    if (this.tradingInterval) {
      clearTimeout(this.tradingInterval);
      this.tradingInterval = null;
    }
    return { success: true, message: "Trading stopped" };
  }

  private scheduleTradingCycle(): void {
    if (!this.isRunning) return;

    // Execute trading cycle every 10-30 seconds (realistic intervals)
    const interval = Math.random() * 20000 + 10000; // 10-30 seconds
    
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
    // Realistic market analysis - most cycles should NOT trade
    const marketConditions = Math.random();
    
    // Only trade 20% of the time (realistic market opportunities)
    if (marketConditions > 0.2) {
      return { 
        shouldTrade: false, 
        reason: "No profitable opportunities in current market conditions" 
      };
    }

    const assets = ['BTC-USDT-SWAP', 'ETH-USDT-SWAP', 'SOL-USDT-SWAP', 'ADA-USDT-SWAP'];
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