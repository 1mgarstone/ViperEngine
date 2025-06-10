import { storage } from "./storage";
import type { InsertOrder, InsertTrade, User } from "@shared/schema";

interface OrderRequest {
  userId: number;
  assetId: number;
  side: 'buy' | 'sell';
  quantity: string;
  price: string;
  orderType: 'market' | 'limit';
  instId: string;
}

interface OrderResult {
  success: boolean;
  orderId?: number;
  error?: string;
  executed?: boolean;
  executedPrice?: string;
  executedQuantity?: string;
}

export class OrderExecutionEngine {
  
  async placeOrder(orderRequest: OrderRequest): Promise<OrderResult> {
    try {
      const user = await storage.getUser(orderRequest.userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      // Get current balance based on trading mode
      const currentBalance = parseFloat(user.isLiveMode ? user.liveBalance : user.paperBalance);
      const orderValue = parseFloat(orderRequest.quantity) * parseFloat(orderRequest.price);

      // Validate sufficient balance for buy orders
      if (orderRequest.side === 'buy' && currentBalance < orderValue) {
        return { 
          success: false, 
          error: `Insufficient balance. Required: ${orderValue.toFixed(2)} USDT, Available: ${currentBalance.toFixed(2)} USDT` 
        };
      }

      // Create order record
      const order = await storage.createOrder({
        userId: orderRequest.userId,
        assetId: orderRequest.assetId,
        side: orderRequest.side,
        quantity: orderRequest.quantity,
        price: orderRequest.price,
        type: orderRequest.orderType,
        status: 'pending'
      });

      // For demo mode, simulate realistic market execution
      if (!user.isLiveMode) {
        return await this.simulateOrderExecution(order.id, orderRequest, user);
      }

      // For live mode, execute through OKX API
      return await this.executeLiveOrder(order.id, orderRequest, user);

    } catch (error) {
      console.error('Order placement failed:', error);
      return { success: false, error: 'Order placement failed' };
    }
  }

  private async simulateOrderExecution(orderId: number, orderRequest: OrderRequest, user: User): Promise<OrderResult> {
    // Simulate realistic market conditions - orders may not always fill
    const marketVolatility = Math.random();
    const slippage = (Math.random() - 0.5) * 0.002; // ±0.1% slippage
    
    // Market orders have higher fill probability than limit orders
    const fillProbability = orderRequest.orderType === 'market' ? 0.95 : 0.75;
    
    if (Math.random() > fillProbability) {
      // Order remains pending/unfilled
      await storage.updateOrderStatus(orderId, 'pending');
      return { 
        success: true, 
        orderId, 
        executed: false,
        error: "Order placed but not executed due to market conditions"
      };
    }

    // Calculate execution price with realistic slippage
    const basePrice = parseFloat(orderRequest.price);
    const executedPrice = basePrice * (1 + slippage);
    const executedQuantity = orderRequest.quantity;

    // Update order status to filled
    await storage.updateOrderStatus(orderId, 'filled', new Date());

    // Create trade record
    const trade = await storage.createTrade({
      userId: orderRequest.userId,
      orderId: orderId,
      assetId: orderRequest.assetId,
      side: orderRequest.side,
      quantity: executedQuantity,
      price: executedPrice.toFixed(8),
      total: (parseFloat(executedQuantity) * executedPrice).toFixed(8),
      pnl: "0.00000000"
    });

    // Update user balance based on trade
    await this.updateBalanceAfterTrade(user, orderRequest.side, parseFloat(executedQuantity), executedPrice);

    return {
      success: true,
      orderId,
      executed: true,
      executedPrice: executedPrice.toFixed(8),
      executedQuantity
    };
  }

  private async executeLiveOrder(orderId: number, orderRequest: OrderRequest, user: User): Promise<OrderResult> {
    // Import OKX client for live trading
    const { OKXClient } = await import('./okx-client');
    
    if (!process.env.OKX_API_KEY || !process.env.OKX_SECRET_KEY || !process.env.OKX_PASSPHRASE) {
      return { success: false, error: "OKX API credentials not configured" };
    }

    const okxClient = new OKXClient(
      process.env.OKX_API_KEY,
      process.env.OKX_SECRET_KEY,
      process.env.OKX_PASSPHRASE
    );

    // Place order on OKX
    const okxOrder = {
      instId: orderRequest.instId,
      tdMode: 'cash', // Spot trading
      side: orderRequest.side,
      ordType: orderRequest.orderType,
      sz: orderRequest.quantity,
      px: orderRequest.orderType === 'limit' ? orderRequest.price : undefined
    };

    const result = await okxClient.placeOrder(okxOrder);
    
    if (!result.success) {
      await storage.updateOrderStatus(orderId, 'failed');
      return { success: false, error: result.error };
    }

    // Order placed successfully, update status
    await storage.updateOrderStatus(orderId, 'filled', new Date());

    // Create trade record (OKX will provide actual execution details)
    const trade = await storage.createTrade({
      userId: orderRequest.userId,
      orderId: orderId,
      assetId: orderRequest.assetId,
      side: orderRequest.side,
      quantity: orderRequest.quantity,
      price: orderRequest.price,
      total: (parseFloat(orderRequest.quantity) * parseFloat(orderRequest.price)).toFixed(8),
      pnl: "0.00000000"
    });

    return {
      success: true,
      orderId,
      executed: true,
      executedPrice: orderRequest.price,
      executedQuantity: orderRequest.quantity
    };
  }

  private async updateBalanceAfterTrade(user: User, side: 'buy' | 'sell', quantity: number, price: number): Promise<void> {
    const tradeValue = quantity * price;
    const currentBalance = parseFloat(user.isLiveMode ? user.liveBalance : user.paperBalance);
    
    let newBalance: number;
    if (side === 'buy') {
      newBalance = currentBalance - tradeValue; // Subtract cost of purchase
    } else {
      newBalance = currentBalance + tradeValue; // Add proceeds from sale
    }

    // Update the appropriate balance
    if (user.isLiveMode) {
      await storage.updateCurrentBalance(user.id, newBalance.toFixed(8));
    } else {
      await storage.updateUserBalance(user.id, newBalance.toFixed(8));
    }
  }

  async getRecentMarketPrice(instId: string): Promise<number> {
    // Simulate realistic price discovery
    // In production, this would fetch from actual market data
    const basePrice = this.getAssetBasePrice(instId);
    const marketNoise = (Math.random() - 0.5) * 0.01; // ±0.5% random movement
    return basePrice * (1 + marketNoise);
  }

  private getAssetBasePrice(instId: string): number {
    // Base prices for common trading pairs (would be fetched from real API)
    const basePrices: { [key: string]: number } = {
      'BTC-USDT-SWAP': 43000,
      'ETH-USDT-SWAP': 2600,
      'SOL-USDT-SWAP': 95,
      'ADA-USDT-SWAP': 0.48,
      'DOGE-USDT-SWAP': 0.085,
      'LINK-USDT-SWAP': 14.5,
      'MATIC-USDT-SWAP': 0.85,
      'AVAX-USDT-SWAP': 24
    };
    
    return basePrices[instId] || 100; // Default fallback
  }
}

export const orderExecutionEngine = new OrderExecutionEngine();