import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, Target, Shield, TrendingUp, Activity, Play, Square, DollarSign, RotateCcw, Scan, Eye, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";


interface ViperStrategyProps {
  userId: number;
}

interface ViperSettings {
  isEnabled: boolean;
  maxLeverage: number;
  volThreshold: string;
  strikeWindow: string;
  profitTarget: string;
  stopLoss: string;
  clusterThreshold: string;
  positionScaling: string;
  maxConcurrentTrades: number;
  balanceMultiplier: string;
}

interface ViperPerformance {
  totalPnL: number;
  winRate: number;
  totalTrades: number;
  activeTrades: number;
}

interface ViperStatus {
  isRunning: boolean;
  cycleCount: number;
  lastExecution: number;
  profitability: number;
  successRate: number;
}

export function ViperStrategy({ userId }: ViperStrategyProps) {
  const { toast } = useToast();
  const [livePrices, setLivePrices] = useState<{[key: string]: {price: number, change: number}}>({});
  
  // WebSocket connection for live price updates
  useEffect(() => {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const priceUpdates: {[key: string]: {price: number, change: number}} = {};
      
      // Filter for the cryptocurrencies we're tracking
      const trackedSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOGEUSDT', 'LINKUSDT', 'MATICUSDT', 'AVAXUSDT'];
      
      data.forEach((ticker: any) => {
        if (trackedSymbols.includes(ticker.s)) {
          const symbol = ticker.s.replace('USDT', '');
          priceUpdates[symbol] = {
            price: parseFloat(ticker.c),
            change: parseFloat(ticker.P)
          };
        }
      });
      
      setLivePrices(priceUpdates);
    };

    return () => {
      ws.close();
    };
  }, []);
  
  // Add user data query for live/demo mode  
  const { data: userTradingData } = useQuery({
    queryKey: [`/api/user/${userId}`],
    refetchInterval: 2000,
  });
  
  // Add portfolio and market data queries
  const { data: portfolioData } = useQuery({
    queryKey: [`/api/portfolio/${userId}`],
    refetchInterval: 3000,
  });
  
  const { data: assetsData } = useQuery({
    queryKey: ['/api/assets'],
    refetchInterval: 5000,
  });
  
  // State for form inputs
  const [isEnabled, setIsEnabled] = useState(false);
  const [maxLeverage, setMaxLeverage] = useState([125]);
  const [profitTarget, setProfitTarget] = useState("3.50");
  const [stopLoss, setStopLoss] = useState("0.80");
  const [maxTrades, setMaxTrades] = useState([5]);
  const [balanceMultiplier, setBalanceMultiplier] = useState("3.00");
  
  // Micro-trade strategy state
  const [isMicroTradeEnabled, setIsMicroTradeEnabled] = useState(true);
  const [microTradeIntensity, setMicroTradeIntensity] = useState([3]); // 1-5 scale

  // Fetch VIPER settings
  const { data: settingsData } = useQuery({
    queryKey: [`/api/viper-settings/${userId}`],
  });

  // Fetch VIPER performance
  const { data: performanceData } = useQuery<ViperPerformance>({
    queryKey: [`/api/viper-performance/${userId}`],
    refetchInterval: 3000,
  });

  // Fetch VIPER trades
  const { data: tradesData } = useQuery({
    queryKey: [`/api/viper-trades/${userId}`],
    refetchInterval: 2000,
  });

  // Fetch VIPER autonomous status
  const { data: viperStatus } = useQuery<ViperStatus>({
    queryKey: ["/api/viper-status"],
    refetchInterval: 1000,
  });

  // Fetch micro-trade status
  const { data: microTradeStatus } = useQuery({
    queryKey: ["/api/micro-trade/status"],
    refetchInterval: 2000,
  });

  // Live/Demo mode toggle mutation
  const toggleLiveMode = useMutation({
    mutationFn: async (isLive: boolean) => {
      const response = await fetch(`/api/user/${userId}/toggle-live-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLive })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle mode');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/${userId}`] });
      toast({ description: "Trading mode updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        description: error.message || "Failed to switch trading mode",
        variant: "destructive" 
      });
    }
  });

  // Demo restart mutation
  const restartDemo = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/restart-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to restart demo');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/${userId}`] });
      toast({ description: "Demo restarted with $10.00 USDT" });
    },
    onError: (error: any) => {
      toast({ 
        description: error.message || "Failed to restart demo",
        variant: "destructive" 
      });
    }
  });

  // Calculate current balance and profit
  const currentBalance = userTradingData?.isLiveMode 
    ? parseFloat(userTradingData.liveBalance) 
    : parseFloat(userTradingData?.paperBalance || '0');
  const startBalance = userTradingData?.isLiveMode ? 10 : 10;
  const totalProfit = currentBalance - startBalance;
  const profitPercentage = startBalance > 0 ? (totalProfit / startBalance) * 100 : 0;

  // Update form when settings data loads
  useEffect(() => {
    if (settingsData && typeof settingsData === 'object') {
      setIsEnabled((settingsData as any).isEnabled || false);
      setMaxLeverage([(settingsData as any).maxLeverage || 125]);
      setProfitTarget((settingsData as any).profitTarget || "3.50");
      setStopLoss((settingsData as any).stopLoss || "0.80");
      setMaxTrades([(settingsData as any).maxConcurrentTrades || 5]);
      setBalanceMultiplier((settingsData as any).balanceMultiplier || "3.00");
    }
  }, [settingsData]);

  // Update micro-trade form when status loads
  useEffect(() => {
    if (microTradeStatus && typeof microTradeStatus === 'object') {
      setIsMicroTradeEnabled((microTradeStatus as any).enabled);
      setMicroTradeIntensity([(microTradeStatus as any).intensity || 3]);
    }
  }, [microTradeStatus]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await fetch("/api/viper-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          maxLeverage: maxLeverage[0],
          volThreshold: "0.003",
          strikeWindow: "0.250",
          profitTarget,
          stopLoss,
          clusterThreshold: "0.002",
          positionScaling: "1.50",
          maxConcurrentTrades: maxTrades[0],
          balanceMultiplier,
          isEnabled,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/viper-settings/${userId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/viper-status"] });
      toast({
        title: "Settings Updated",
        description: "VIPER strategy settings have been saved and applied.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: "Failed to save VIPER settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Micro-trade strategy toggle mutation
  const toggleMicroTradeMutation = useMutation({
    mutationFn: async ({ enabled, intensity }: { enabled: boolean; intensity: number }) => {
      const response = await fetch("/api/micro-trade/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, intensity }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Micro-Trade Strategy Updated",
        description: data.message || "Settings saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/micro-trade/status"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update micro-trade settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Start/Stop autonomous trading
  const controlTradingMutation = useMutation({
    mutationFn: async (action: "start" | "stop") => {
      const response = await fetch(`/api/viper-control/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      return response.json();
    },
    onSuccess: (data: any, action) => {
      queryClient.invalidateQueries({ queryKey: ["/api/viper-status"] });
      toast({
        title: action === "start" ? "VIPER Started" : "VIPER Stopped",
        description: data.message,
        variant: action === "start" ? "default" : "destructive",
      });
    },
  });

  // Toggle Demo/Live trading mode
  const toggleLiveModeMutation = useMutation({
    mutationFn: async () => {
      const newMode = !(userTradingData as any)?.isLiveMode;
      return await fetch(`/api/user/${userId}/toggle-live-mode`, {
        method: "POST",
        body: JSON.stringify({ isLive: newMode }),
        headers: { "Content-Type": "application/json" }
      }).then(res => res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/${userId}`] });
      toast({
        title: "Trading Mode Switched",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to switch trading mode",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    const settingsData = {
      userId,
      maxLeverage: maxLeverage[0],
      volThreshold: "0.003",
      strikeWindow: "0.250",
      profitTarget,
      stopLoss,
      clusterThreshold: "0.002",
      positionScaling: "1.50",
      maxConcurrentTrades: maxTrades[0],
      balanceMultiplier,
      isEnabled,
    };
    
    console.log("Saving VIPER settings:", settingsData);
    updateSettingsMutation.mutate(settingsData);
  };

  const handleStartStop = (action: "start" | "stop") => {
    controlTradingMutation.mutate(action);
  };

  const handleToggleLiveMode = () => {
    toggleLiveModeMutation.mutate();
  };

  const isRunning = viperStatus?.isRunning || false;
  const activeTrades = Array.isArray(tradesData) ? tradesData.filter((t: any) => t.status === 'open').length : 0;

  return (
    <div className="space-y-6 pb-20">
      {/* VIPER Control Panel */}
      <Card className="bg-gradient-to-br from-orange-600 to-red-600 border-orange-500">
        <CardHeader>
          <CardTitle className="text-white text-2xl flex items-center space-x-3">
            <Zap className="h-8 w-8" />
            <span>VIPER Strike Control</span>
            <Badge className={`px-3 py-1 text-sm ${isRunning ? 'bg-green-500' : 'bg-gray-500'}`}>
              {isRunning ? 'ACTIVE' : 'STANDBY'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-black/20 rounded-lg p-4">
              <div className="text-orange-100 text-sm">Trading Cycles</div>
              <div className="text-white text-2xl font-mono">{viperStatus?.cycleCount || 0}</div>
            </div>
            <div className="bg-black/20 rounded-lg p-4">
              <div className="text-orange-100 text-sm">Success Rate</div>
              <div className="text-white text-2xl font-mono">{((viperStatus?.successRate || 0) * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-black/20 rounded-lg p-4">
              <div className="text-orange-100 text-sm">Active Positions</div>
              <div className="text-white text-2xl font-mono">{activeTrades}</div>
            </div>
            <div className="bg-black/20 rounded-lg p-4">
              <div className="text-orange-100 text-sm">Total P&L</div>
              <div className={`text-2xl font-mono ${(viperStatus?.profitability || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${(viperStatus?.profitability || 0).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={() => handleStartStop("start")}
              disabled={isRunning || controlTradingMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3"
            >
              <Play className="h-5 w-5 mr-2" />
              Start VIPER Bot
            </Button>
            
            <Button
              onClick={() => handleStartStop("stop")}
              disabled={!isRunning || controlTradingMutation.isPending}
              variant="destructive"
              className="flex-1 font-bold py-3"
            >
              <Square className="h-5 w-5 mr-2" />
              Stop Bot
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trading Environment & Strategy Configuration */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-400" />
            <span>Trading Environment & Strategy Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trading Mode Control - Demo/Live Switch */}
          <div className="mb-6">
            <div className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${(userTradingData as any)?.isLiveMode ? 'bg-red-500' : 'bg-blue-400'}`}></div>
                  <div>
                    <div className="text-white font-medium">
                      {(userTradingData as any)?.isLiveMode ? 'LIVE Trading Mode' : 'Demo Trading Mode'}
                    </div>
                    <div className="text-sm text-gray-300">
                      {(userTradingData as any)?.isLiveMode 
                        ? 'Trading with real USDT on OKX exchange' 
                        : 'Systematic progression with realistic market simulation'
                      }
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleToggleLiveMode()}
                  disabled={toggleLiveModeMutation.isPending}
                  className={`${(userTradingData as any)?.isLiveMode 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-red-600 hover:bg-red-700'
                  } text-white font-bold px-4 py-2`}
                >
                  Switch to {(userTradingData as any)?.isLiveMode ? 'DEMO' : 'LIVE'}
                </Button>
              </div>
            </div>
          </div>

          {/* Micro-Trade Strategy Control */}
          <div className="space-y-4 p-4 bg-blue-600/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-blue-400" />
                <div>
                  <h3 className="text-white font-medium">Micro-Trade Strategy</h3>
                  <p className="text-sm text-gray-300">Intelligent micro-profit generation with strategic scaling</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <label className="text-sm text-white">Enabled</label>
                <input
                  type="checkbox"
                  checked={isMicroTradeEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setIsMicroTradeEnabled(enabled);
                    toggleMicroTradeMutation.mutate({ 
                      enabled, 
                      intensity: microTradeIntensity[0] 
                    });
                  }}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {isMicroTradeEnabled && (
              <div className="space-y-3">
                <div>
                  <Label className="text-white mb-2 block">Trading Intensity: {microTradeIntensity[0]}</Label>
                  <Slider
                    value={microTradeIntensity}
                    onValueChange={(value) => {
                      setMicroTradeIntensity(value);
                      if (isMicroTradeEnabled) {
                        toggleMicroTradeMutation.mutate({ 
                          enabled: true, 
                          intensity: value[0] 
                        });
                      }
                    }}
                    max={5}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Conservative</span>
                    <span>Moderate</span>
                    <span>Aggressive</span>
                  </div>
                </div>
                
                <Alert className="border-blue-500/30 bg-blue-500/10">
                  <AlertDescription className="text-blue-300 text-sm">
                    <strong>Micro-Trade Strategy:</strong> Generates small, consistent profits through intelligent 
                    opportunity selection. Scales automatically with balance growth. Can operate independently 
                    or alongside VIPER Strike liquidation trading.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
          {/* Leverage Control */}
          <div>
            <Label className="text-white mb-2 block">Maximum Leverage: {maxLeverage[0]}x</Label>
            <Slider
              value={maxLeverage}
              onValueChange={setMaxLeverage}
              max={125}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1x</span>
              <span>125x</span>
            </div>
          </div>

          {/* Profit Target */}
          <div>
            <Label className="text-white mb-2 block">Profit Target (%)</Label>
            <Input
              value={profitTarget}
              onChange={(e) => setProfitTarget(e.target.value)}
              placeholder="3.50"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {/* Stop Loss */}
          <div>
            <Label className="text-white mb-2 block">Stop Loss (%)</Label>
            <Input
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="0.80"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {/* Max Concurrent Trades */}
          <div>
            <Label className="text-white mb-2 block">Max Concurrent Trades: {maxTrades[0]}</Label>
            <Slider
              value={maxTrades}
              onValueChange={setMaxTrades}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
          </div>

          {/* Balance Multiplier */}
          <div>
            <Label className="text-white mb-2 block">Position Size (%)</Label>
            <Input
              value={balanceMultiplier}
              onChange={(e) => setBalanceMultiplier(e.target.value)}
              placeholder="3.00"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={updateSettingsMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Active Trades */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Activity className="h-5 w-5 text-green-400" />
            <span>Active Trades</span>
            <Badge className="bg-green-600">{activeTrades}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Array.isArray(tradesData) && tradesData.length > 0 ? (
            <div className="space-y-3">
              {tradesData.filter((trade: any) => trade.status === 'open').map((trade: any) => (
                <div key={trade.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-white font-medium">{trade.instId}</div>
                      <div className="text-xs text-gray-400">
                        {trade.side.toUpperCase()} • {trade.leverage}x leverage
                      </div>
                    </div>
                    <Badge className={trade.side === 'long' ? 'bg-green-600' : 'bg-red-600'}>
                      ${parseFloat(trade.entryPrice).toFixed(2)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-gray-400">Quantity</div>
                      <div className="text-white">{parseFloat(trade.quantity).toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Target</div>
                      <div className="text-green-400">${parseFloat(trade.takeProfitPrice || '0').toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Stop</div>
                      <div className="text-red-400">${parseFloat(trade.stopLossPrice || '0').toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <div className="text-gray-400">No active trades</div>
              <div className="text-gray-500 text-sm">Start the VIPER bot to begin trading</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Balance Tracker */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            <span>Balance Tracker</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Current Balance</div>
              <div className="text-white text-2xl font-mono">
                ${currentBalance.toFixed(2)} USDT
              </div>
              <div className={`text-sm ${(userTradingData as any)?.isLiveMode ? 'text-red-400' : 'text-blue-400'}`}>
                {(userTradingData as any)?.isLiveMode ? 'LIVE Trading' : 'Demo Mode'}
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Total Profit</div>
              <div className={`text-2xl font-mono ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)} USDT
              </div>
              <div className={`text-sm ${profitPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(2)}%
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-gray-400 text-sm">VIPER Enabled</div>
              <div className="text-white text-lg">
                {currentBalance >= 200 ? 'YES' : 'NO'}
              </div>
              <div className="text-sm text-gray-400">
                {currentBalance >= 200 
                  ? 'Liquidation trading active' 
                  : `Need $${(200 - currentBalance).toFixed(2)} more`
                }
              </div>
            </div>
          </div>
          
          {!(userTradingData as any)?.isLiveMode && (
            <div className="mt-4">
              <Button
                onClick={() => restartDemo.mutate()}
                disabled={restartDemo.isPending}
                variant="outline"
                className="w-full text-blue-400 border-blue-400 hover:bg-blue-400/10"
              >
                {restartDemo.isPending ? 'Restarting...' : 'Restart Demo ($10.00 USDT)'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>



      {/* Liquidation Scanner */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Search className="h-5 w-5 text-red-400" />
            <span>Liquidation Scanner</span>
            <Badge className={`${viperStatus?.isRunning ? 'bg-green-500' : 'bg-gray-500'}`}>
              {viperStatus?.isRunning ? 'SCANNING' : 'STANDBY'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-orange-600/10 border border-orange-500/30 rounded-lg p-4">
                <div className="text-orange-400 text-sm">Clusters Detected</div>
                <div className="text-white text-2xl font-mono">{viperStatus?.cycleCount || 0}</div>
                <div className="text-gray-400 text-sm">Scanning for liquidations</div>
              </div>
              <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-4">
                <div className="text-green-400 text-sm">Strike Success</div>
                <div className="text-white text-2xl font-mono">
                  {((viperStatus?.successRate || 0) * 100).toFixed(1)}%
                </div>
                <div className="text-gray-400 text-sm">Profitable trades</div>
              </div>
            </div>
            
            <Alert className="border-orange-500/30 bg-orange-500/10">
              <AlertDescription className="text-orange-300 text-sm">
                <strong>Liquidation Detection:</strong> Continuously scanning for large liquidation clusters.
                When clusters ≥$10,000 are detected, VIPER Strike executes high-leverage counter-trades
                for maximum profit extraction.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Performance Alert */}
      <Alert className="border-green-500 bg-green-500/10">
        <DollarSign className="h-4 w-4 text-green-400" />
        <AlertDescription className="text-gray-300 text-sm">
          <strong>VIPER Strike:</strong> Advanced liquidation detection with 125x leverage capabilities. 
          Autonomous trading optimized for maximum profit extraction from market volatility.
        </AlertDescription>
      </Alert>
    </div>
  );
}