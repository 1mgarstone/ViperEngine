import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertOrderSchema, insertRiskSettingsSchema } from "@shared/schema";

interface WebSocketMessage {
  type: string;
  data?: any;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server for real-time price updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');
    
    // Send initial market data
    const sendMarketData = async () => {
      try {
        const assets = await storage.getAllAssets();
        ws.send(JSON.stringify({
          type: 'market_data',
          data: assets
        }));
      } catch (error) {
        console.error('Error sending market data:', error);
      }
    };

    sendMarketData();
    
    // Send price updates every 3 seconds
    const priceUpdateInterval = setInterval(async () => {
      try {
        const assets = await storage.getAllAssets();
        
        // Simulate price changes
        for (const asset of assets) {
          const currentPrice = parseFloat(asset.currentPrice);
          const changePercent = (Math.random() - 0.5) * 0.02; // ±1% change
          const newPrice = currentPrice * (1 + changePercent);
          const change24h = (changePercent * 100).toFixed(2);
          
          await storage.updateAssetPrice(asset.id, newPrice.toFixed(8), change24h);
        }
        
        const updatedAssets = await storage.getAllAssets();
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'price_update',
            data: updatedAssets
          }));
        }
      } catch (error) {
        console.error('Error updating prices:', error);
      }
    }, 3000);
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
      clearInterval(priceUpdateInterval);
    });
  });

  // User routes
  app.get("/api/user/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Asset routes
  app.get("/api/assets", async (req, res) => {
    try {
      const assets = await storage.getAllAssets();
      res.json(assets);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/assets/:symbol", async (req, res) => {
    try {
      const asset = await storage.getAssetBySymbol(req.params.symbol.toUpperCase());
      
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      
      res.json(asset);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Portfolio routes
  app.get("/api/portfolio/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const positions = await storage.getPortfolioPositions(userId);
      
      // Calculate portfolio value
      let totalValue = 0;
      const positionsWithDetails = [];
      
      for (const position of positions) {
        const asset = await storage.getAsset(position.assetId);
        if (asset) {
          const currentValue = parseFloat(position.quantity) * parseFloat(asset.currentPrice);
          const pnl = currentValue - parseFloat(position.totalInvested);
          const pnlPercentage = (pnl / parseFloat(position.totalInvested)) * 100;
          
          positionsWithDetails.push({
            ...position,
            asset,
            currentValue: currentValue.toFixed(8),
            pnl: pnl.toFixed(8),
            pnlPercentage: pnlPercentage.toFixed(2)
          });
          
          totalValue += currentValue;
        }
      }
      
      const user = await storage.getUser(userId);
      const availableBalance = user ? parseFloat(user.paperBalance) : 0;
      
      res.json({
        positions: positionsWithDetails,
        totalValue: totalValue.toFixed(8),
        availableBalance: availableBalance.toFixed(8),
        totalPortfolioValue: (totalValue + availableBalance).toFixed(8)
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Order routes
  app.post("/api/orders", async (req, res) => {
    try {
      const validatedOrder = insertOrderSchema.parse(req.body);
      
      // Get asset for price validation
      const asset = await storage.getAsset(validatedOrder.assetId);
      if (!asset) {
        return res.status(400).json({ message: "Invalid asset" });
      }
      
      // For market orders, use current price
      if (validatedOrder.type === "market") {
        validatedOrder.price = asset.currentPrice;
      }
      
      const order = await storage.createOrder(validatedOrder);
      
      // Immediately fill market orders in simulation
      if (validatedOrder.type === "market") {
        await processMarketOrder(order);
      }
      
      res.json(order);
    } catch (error) {
      console.error("Order creation error:", error);
      res.status(400).json({ message: "Invalid order data" });
    }
  });

  app.get("/api/orders/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const orders = await storage.getUserOrders(userId);
      
      // Add asset details to orders
      const ordersWithAssets = [];
      for (const order of orders) {
        const asset = await storage.getAsset(order.assetId);
        ordersWithAssets.push({
          ...order,
          asset
        });
      }
      
      res.json(ordersWithAssets);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Trade routes
  app.get("/api/trades/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const trades = await storage.getUserTrades(userId);
      
      // Add asset details to trades
      const tradesWithAssets = [];
      for (const trade of trades) {
        const asset = await storage.getAsset(trade.assetId);
        tradesWithAssets.push({
          ...trade,
          asset
        });
      }
      
      res.json(tradesWithAssets);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Risk settings routes
  app.get("/api/risk-settings/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const settings = await storage.getRiskSettings(userId);
      
      if (!settings) {
        // Return default settings if none exist
        return res.json({
          maxPositionSize: "15.00",
          stopLossPercentage: "5.00",
          takeProfitPercentage: "25.00",
          maxDailyLoss: "1000.00000000"
        });
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/risk-settings", async (req, res) => {
    try {
      const validatedSettings = insertRiskSettingsSchema.parse(req.body);
      const settings = await storage.updateRiskSettings(validatedSettings);
      res.json(settings);
    } catch (error) {
      res.status(400).json({ message: "Invalid risk settings data" });
    }
  });

  // Helper function to process market orders
  async function processMarketOrder(order: any) {
    try {
      const asset = await storage.getAsset(order.assetId);
      if (!asset) return;
      
      const price = parseFloat(order.price);
      const quantity = parseFloat(order.quantity);
      const total = price * quantity;
      
      // Update order status
      await storage.updateOrderStatus(order.id, "filled", new Date());
      
      // Create trade record
      await storage.createTrade({
        userId: order.userId,
        orderId: order.id,
        assetId: order.assetId,
        side: order.side,
        quantity: order.quantity,
        price: order.price,
        total: total.toFixed(8),
        pnl: "0"
      });
      
      // Update user balance
      const user = await storage.getUser(order.userId);
      if (user) {
        const currentBalance = parseFloat(user.paperBalance);
        const newBalance = order.side === "buy" 
          ? currentBalance - total 
          : currentBalance + total;
        
        await storage.updateUserBalance(order.userId, newBalance.toFixed(8));
      }
      
      // Update portfolio position
      const existingPosition = await storage.getPortfolioPosition(order.userId, order.assetId);
      
      if (order.side === "buy") {
        if (existingPosition) {
          const currentQuantity = parseFloat(existingPosition.quantity);
          const currentInvested = parseFloat(existingPosition.totalInvested);
          const newQuantity = currentQuantity + quantity;
          const newInvested = currentInvested + total;
          const newAveragePrice = newInvested / newQuantity;
          
          await storage.updatePortfolioPosition(
            existingPosition.id,
            newQuantity.toFixed(8),
            newAveragePrice.toFixed(8),
            newInvested.toFixed(8)
          );
        } else {
          await storage.createPortfolioPosition({
            userId: order.userId,
            assetId: order.assetId,
            quantity: quantity.toFixed(8),
            averagePrice: price.toFixed(8),
            totalInvested: total.toFixed(8)
          });
        }
      } else if (order.side === "sell" && existingPosition) {
        const currentQuantity = parseFloat(existingPosition.quantity);
        const newQuantity = currentQuantity - quantity;
        
        if (newQuantity <= 0) {
          await storage.deletePortfolioPosition(existingPosition.id);
        } else {
          const currentInvested = parseFloat(existingPosition.totalInvested);
          const sellRatio = quantity / currentQuantity;
          const newInvested = currentInvested * (1 - sellRatio);
          
          await storage.updatePortfolioPosition(
            existingPosition.id,
            newQuantity.toFixed(8),
            existingPosition.averagePrice,
            newInvested.toFixed(8)
          );
        }
      }
      
    } catch (error) {
      console.error("Error processing market order:", error);
    }
  }

  return httpServer;
}
