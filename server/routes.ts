import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertOrderSchema, insertRiskSettingsSchema, insertViperSettingsSchema } from "@shared/schema";
import { ViperEngine } from "./viper-engine";

interface WebSocketMessage {
  type: string;
  data?: any;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize VIPER Engine for user 1 (demo user) - Autonomous Trading
  const viperEngine = new ViperEngine(1);
  await viperEngine.initialize();
  
  // Store VIPER engine instance for route access
  let globalViperEngine = viperEngine;
  
  // Initialize WebSocket server for real-time price updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Make WebSocket server globally accessible for VIPER engine notifications
  (global as any).wss = wss;
  
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

    // VIPER Strategy processing every 5 seconds
    const viperUpdateInterval = setInterval(async () => {
      try {
        if (viperEngine.isEnabled()) {
          await viperEngine.processAutomatedTradingCycle();
        }
      } catch (error) {
        console.error('Error in VIPER processing:', error);
      }
    }, 5000);
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
      clearInterval(priceUpdateInterval);
      clearInterval(viperUpdateInterval);
    });
  });

  // User routes
  app.get("/api/user/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      let user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Auto-correct balance if it shows 100k instead of 200 USDT
      if (parseFloat(user.paperBalance) > 1000) {
        user = await storage.updateUserBalance(userId, "200.00000000");
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/:id/balance", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { balance } = req.body;
      
      const user = await storage.updateUserBalance(userId, balance);
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

  // VIPER Strategy routes
  app.get("/api/viper-settings/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const settings = await storage.getViperSettings(userId);
      
      if (!settings) {
        // Return default settings if none exist
        return res.json({
          maxLeverage: 125,
          volThreshold: "0.008",
          strikeWindow: "0.170",
          profitTarget: "2.00",
          stopLoss: "0.100",
          clusterThreshold: "0.005",
          positionScaling: "1.00",
          maxConcurrentTrades: 2,
          balanceMultiplier: "2.00",
          isEnabled: false
        });
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/viper-settings", async (req, res) => {
    try {
      console.log("Received VIPER settings update:", req.body);
      const validatedSettings = insertViperSettingsSchema.parse(req.body);
      const settings = await storage.updateViperSettings(validatedSettings);
      
      // Force engine reinitialization with new settings
      if (validatedSettings.userId === 1) {
        console.log("Reinitializing VIPER engine with new settings");
        await viperEngine.initialize();
        
        // Broadcast settings update via WebSocket
        const wss = (global as any).wss;
        if (wss?.clients) {
          wss.clients.forEach((client: any) => {
            if (client.readyState === 1) {
              client.send(JSON.stringify({
                type: 'settings_updated',
                data: { settings, message: 'VIPER configuration updated successfully' }
              }));
            }
          });
        }
      }
      
      console.log("VIPER settings saved successfully:", settings);
      res.json(settings);
    } catch (error) {
      console.error("VIPER settings save error:", error);
      res.status(400).json({ message: "Invalid VIPER settings data", error: error.message });
    }
  });

  app.get("/api/viper-performance/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const performance = await viperEngine.getPerformanceMetrics();
      res.json(performance);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/viper-trades/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const trades = await storage.getUserViperTrades(userId);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/viper-clusters", async (req, res) => {
    try {
      const clusters = await storage.getUnprocessedClusters();
      res.json(clusters.slice(0, 10)); // Return last 10 clusters
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // VIPER Autonomous Trading Controls
  app.post("/api/viper-control/:action", async (req, res) => {
    try {
      const action = req.params.action;
      
      if (action === "start") {
        // Check if user is in live mode and validate balance
        const user = await storage.getUser(1); // Assuming userId 1 for demo
        
        if (user?.isLiveMode) {
          // Validate minimum balance for live trading
          const currentBalance = parseFloat(user.liveBalance || "0");
          const minimumRequired = 10;
          
          if (currentBalance < minimumRequired) {
            return res.status(400).json({
              error: `Insufficient USDT balance for live trading. Current: ${currentBalance.toFixed(2)} USDT, Required: ${minimumRequired} USDT`,
              currentBalance,
              minimumRequired,
              balanceInsufficient: true
            });
          }
        }
        
        globalViperEngine.startAutonomousTrading();
        res.json({ 
          success: true, 
          message: "VIPER autonomous trading started",
          state: globalViperEngine.getAutonomousState()
        });
      } else if (action === "stop") {
        globalViperEngine.stopAutonomousTrading();
        res.json({ 
          success: true, 
          message: "VIPER autonomous trading stopped",
          state: globalViperEngine.getAutonomousState()
        });
      } else {
        res.status(400).json({ message: "Invalid action. Use 'start' or 'stop'" });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/viper-status", async (req, res) => {
    try {
      const state = globalViperEngine.getAutonomousState();
      res.json(state);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });;

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

  // Live trading environment routes
  app.post("/api/user/:userId/toggle-live", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { isLive } = req.body;
      const user = await storage.toggleLiveMode(userId, isLive);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/:userId/exchange-credentials", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { apiKey, apiSecret, apiPassphrase, exchangeName } = req.body;
      
      console.log(`Updating exchange credentials for user ${userId}, exchange: ${exchangeName}`);
      
      // Basic validation
      if (!apiKey || !apiSecret || !exchangeName) {
        console.log("Validation failed: missing required fields");
        return res.status(400).json({ message: "API key, secret, and exchange name are required" });
      }

      console.log("Calling storage.updateExchangeCredentials...");
      const user = await storage.updateExchangeCredentials(userId, {
        apiKey,
        apiSecret,
        apiPassphrase,
        exchangeName,
      });
      
      console.log("Exchange credentials updated successfully");
      // Don't return sensitive credentials in response
      const { apiKey: _, apiSecret: __, apiPassphrase: ___, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating exchange credentials:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  app.get("/api/user/:userId/balance", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const balance = await storage.getCurrentBalance(userId);
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/:userId/balance", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { balance } = req.body;
      const user = await storage.updateCurrentBalance(userId, balance);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Micro-Trade Strategy control endpoints
  app.post("/api/micro-trade/toggle", async (req, res) => {
    try {
      const { enabled, intensity } = req.body;
      
      // Update micro-trade settings
      globalViperEngine.updateMicroTradeSettings(enabled, intensity || 3);
      
      res.json({ 
        success: true, 
        message: enabled ? "Micro-trade strategy enabled" : "Micro-trade strategy disabled",
        settings: { enabled, intensity: intensity || 3 }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update micro-trade settings" });
    }
  });

  app.get("/api/micro-trade/status", async (req, res) => {
    try {
      const status = globalViperEngine.getMicroTradeStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to get micro-trade status" });
    }
  });

  // Demo restart endpoint for systematic trading progression
  app.post("/api/restart-demo", async (req, res) => {
    try {
      const userId = 1; // Demo user ID for the trading simulation

      // Reset balance to $10.00 USDT
      await storage.updateUserBalance(userId, "10.00");
      
      // Reset VIPER settings - skip for now to avoid database constraints
      console.log('VIPER settings reset skipped to avoid DB constraints');

      // Clear all active trades
      const activeTrades = await storage.getUserViperTrades(userId);
      for (const trade of activeTrades) {
        if (trade.status !== 'closed') {
          await storage.updateViperTrade(trade.id, { status: 'closed' });
        }
      }

      // Reinitialize systematic progression
      globalViperEngine.restartSystematicProgression();

      res.json({ 
        success: true, 
        message: "Demo restarted successfully - Balance and P&L reset",
        balance: "10.00",
        totalPnL: "0.00",
        phase: "Phase 1: Micro-trading only ($10 → $200)"
      });
    } catch (error) {
      console.error("Demo restart error:", error);
      res.status(500).json({ error: "Failed to restart demo" });
    }
  });

  // Toggle Demo/Live trading mode
  app.post("/api/user/:userId/toggle-live-mode", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isLive = !user.isLiveMode; // Toggle current mode

      // Check if OKX credentials are configured for live mode
      if (isLive && (!process.env.OKX_API_KEY || !process.env.OKX_SECRET_KEY || !process.env.OKX_PASSPHRASE)) {
        return res.status(400).json({ 
          error: "OKX API credentials required for live trading",
          hasCredentials: false 
        });
      }

      if (isLive) {
        // Import OKX client for balance fetching
        const { OKXClient } = await import('./okx-client');
        const okxClient = new OKXClient(
          process.env.OKX_API_KEY!,
          process.env.OKX_SECRET_KEY!,
          process.env.OKX_PASSPHRASE!
        );

        // Fetch current balance without validation
        const balanceResult = await okxClient.getAccountBalance();
        
        if (!balanceResult.success) {
          return res.status(400).json({
            error: balanceResult.error || "Failed to connect to OKX account",
            hasCredentials: true
          });
        }

        // Update live balance from OKX (allow any balance amount)
        await storage.updateCurrentBalance(userId, balanceResult.usdtBalance.toFixed(8));

        // Update user credentials
        await storage.updateUserExchangeCredentials(
          userId,
          process.env.OKX_API_KEY!,
          process.env.OKX_SECRET_KEY!,
          process.env.OKX_PASSPHRASE!,
          "okx"
        );

        console.log(`Live mode enabled with ${balanceResult.usdtBalance} USDT balance`);
      }

      // Toggle live mode
      const updatedUser = await storage.toggleLiveMode(userId, isLive);

      res.json({
        success: true,
        message: isLive 
          ? `Switched to LIVE trading mode with ${updatedUser.liveBalance} USDT` 
          : "Switched to DEMO trading mode",
        mode: isLive ? "LIVE" : "DEMO",
        exchangeName: isLive ? "OKX" : null,
        isLiveMode: updatedUser.isLiveMode,
        balance: isLive ? updatedUser.liveBalance : updatedUser.paperBalance,
        balanceSource: isLive ? "OKX Live Account" : "Demo Simulation"
      });
    } catch (error: any) {
      console.error("Failed to toggle live mode:", error.message);
      res.status(500).json({ 
        error: "Failed to toggle trading mode",
        details: error.message 
      });
    }
  });

  // Update user exchange credentials
  app.post("/api/user/:userId/exchange-credentials", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Check if OKX credentials are available in environment
      if (!process.env.OKX_API_KEY || !process.env.OKX_SECRET_KEY || !process.env.OKX_PASSPHRASE) {
        return res.status(400).json({ 
          error: "OKX API credentials not configured in environment",
          hasCredentials: false 
        });
      }
      
      // Update user with OKX API credentials from environment
      const updatedUser = await storage.updateUserExchangeCredentials(
        userId,
        process.env.OKX_API_KEY,
        process.env.OKX_SECRET_KEY,
        process.env.OKX_PASSPHRASE,
        "okx"
      );

      res.json({
        success: true,
        message: "OKX API credentials configured for live trading",
        exchangeName: "OKX",
        hasCredentials: true,
        apiKeyPreview: process.env.OKX_API_KEY.substring(0, 8) + "..."
      });
    } catch (error: any) {
      console.error("Failed to update exchange credentials:", error.message);
      res.status(500).json({ error: "Failed to update exchange credentials" });
    }
  });

  return httpServer;
}
