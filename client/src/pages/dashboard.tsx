import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketData } from "@/components/market-data";
import { ViperStrategy } from "@/components/viper-strategy";
import { useWebSocket } from "@/hooks/use-websocket";
import { 
  TriangleAlert, 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3,
  Settings,
  Home,
  DollarSign,
  Activity,
  Clock,
  RotateCcw
} from "lucide-react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const queryClient = useQueryClient();
  
  // Swipe gesture state
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  // WebSocket for real-time balance updates
  const { isConnected, liveBalance, marketData } = useWebSocket();

  // Fetch user data
  const { data: userData } = useQuery({
    queryKey: ["/api/user/1"],
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });

  // Fetch portfolio data
  const { data: portfolioData } = useQuery({
    queryKey: ["/api/portfolio/1"],
  });

  // Fetch orders
  const { data: ordersData } = useQuery({
    queryKey: ["/api/orders/1"],
  });

  // Fetch trades
  const { data: tradesData } = useQuery({
    queryKey: ["/api/trades/1"],
  });

  // Fetch VIPER status for real-time updates
  const { data: viperStatus } = useQuery({
    queryKey: ["/api/viper-status"],
    refetchInterval: 1000,
  });

  // Fetch VIPER trades for active monitoring
  const { data: viperTrades } = useQuery({
    queryKey: ["/api/viper-trades/1"],
    refetchInterval: 2000,
  });

  const isViperRunning = viperStatus?.isRunning || false;
  const activeViperTrades = viperTrades?.filter((t: any) => t.status === 'open')?.length || 0;
  
  // Use live balance from WebSocket for instant updates, fallback to database value
  // Choose correct balance based on user's live/demo mode
  const dbBalance = userData?.isLiveMode 
    ? parseFloat(userData?.liveBalance || "10.00")
    : parseFloat(userData?.paperBalance || "10.00");
  const currentBalance = liveBalance || dbBalance;
  
  // Calculate total profits since starting at $10.00
  const totalProfit = currentBalance - 10;
  const profitPercentage = totalProfit > 0 ? ((currentBalance - 10) / 10) * 100 : 0;

  // Demo restart mutation
  const restartDemo = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/restart-demo', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to restart demo');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/1'] });
      queryClient.invalidateQueries({ queryKey: ['/api/viper-trades/1'] });
    }
  });

  // Live mode toggle mutation
  const toggleLiveMode = useMutation({
    mutationFn: async (isLive: boolean) => {
      const response = await fetch(`/api/user/1/toggle-live-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLive })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.balanceInsufficient) {
          throw new Error(`Insufficient OKX balance: ${data.currentBalance} USDT (minimum: ${data.minimumRequired} USDT required)`);
        }
        throw new Error(data.error || 'Failed to toggle trading mode');
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/1'] });
      console.log(`Switched to ${data.mode} mode with ${data.balance} USDT`);
    },
    onError: (error: Error) => {
      console.error('Live mode toggle failed:', error.message);
    }
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-4 pb-20">
            {/* VIPER Strike Quick Launch */}
            <Card className="bg-gradient-to-br from-orange-600 to-red-600 border-orange-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-xl flex items-center space-x-3">
                  <Zap className="h-6 w-6" />
                  <span>VIPER Strike Bot</span>
                  <Badge className="px-3 py-1 text-sm bg-black/30 text-white">Autonomous</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-orange-100 flex items-center space-x-2">
                      <span>Balance</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        userData?.isLiveMode 
                          ? 'bg-red-600/20 text-red-300 border border-red-500/30' 
                          : 'bg-orange-600/20 text-orange-300 border border-orange-500/30'
                      }`}>
                        {userData?.isLiveMode ? 'LIVE' : 'DEMO'}
                      </span>
                    </div>
                    <div className="font-mono text-lg text-white">${currentBalance.toFixed(2)} USDT</div>
                    <div className="text-xs text-orange-200">
                      {userData?.isLiveMode ? 'OKX Live Account' : 'Demo Simulation'}
                    </div>
                    {totalProfit !== 0 && (
                      <div className={`text-xs font-medium ${totalProfit > 0 ? 'text-green-300' : 'text-red-300'}`}>
                        {totalProfit > 0 ? '+' : ''}${totalProfit.toFixed(2)} Total Profit
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-orange-100">VIPER Status</div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${isViperRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                      <span className="text-white font-medium">
                        {isViperRunning ? 'ACTIVE' : 'STANDBY'}
                      </span>
                    </div>
                    {isViperRunning && (
                      <div className="text-xs text-green-300">
                        {viperStatus?.cycleCount || 0} cycles • {activeViperTrades} trades
                      </div>
                    )}
                  </div>
                </div>

                {/* Live/Demo Mode Toggle */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-orange-100 text-sm">Trading Mode</span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs ${!userData?.isLiveMode ? 'text-orange-300' : 'text-gray-400'}`}>
                        DEMO
                      </span>
                      <button
                        onClick={() => toggleLiveMode.mutate(!userData?.isLiveMode)}
                        disabled={toggleLiveMode.isPending}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          userData?.isLiveMode ? 'bg-green-600' : 'bg-gray-600'
                        } ${toggleLiveMode.isPending ? 'opacity-50' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            userData?.isLiveMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`text-xs ${userData?.isLiveMode ? 'text-green-300' : 'text-gray-400'}`}>
                        LIVE
                      </span>
                    </div>
                  </div>
                  
                  {toggleLiveMode.error && (
                    <div className="text-red-400 text-xs mb-2">
                      {toggleLiveMode.error.message}
                    </div>
                  )}
                  
                  {userData?.isLiveMode && (
                    <div className="bg-green-600/20 border border-green-500/30 rounded p-2 mb-2">
                      <div className="text-green-300 text-xs">
                        ✓ Live trading with real USDT
                      </div>
                      <div className="text-green-200 text-xs">
                        Balance: {userData.liveBalance} USDT
                      </div>
                    </div>
                  )}
                  
                  {!userData?.isLiveMode && (
                    <Button 
                      onClick={() => restartDemo.mutate()}
                      disabled={restartDemo.isPending}
                      variant="outline"
                      size="sm"
                      className="w-full bg-orange-600/20 border-orange-500 text-orange-100 hover:bg-orange-600/30"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {restartDemo.isPending ? 'Restarting...' : 'Restart Demo ($10.00 USDT)'}
                    </Button>
                  )}
                </div>
                
                <div className="bg-black/20 rounded-lg p-4 mb-4">
                  <div className="text-orange-100 text-sm mb-2">Liquidation Scanner:</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-orange-200">Active Targets</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-300">{isViperRunning ? 'Scanning' : 'Standby'}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-orange-600/30 rounded p-2">
                        <div className="text-orange-200">Long Liquidations</div>
                        <div className="text-white font-mono">$4.2M</div>
                      </div>
                      <div className="bg-red-600/30 rounded p-2">
                        <div className="text-red-200">Short Liquidations</div>
                        <div className="text-white font-mono">$8.7M</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-orange-200 leading-relaxed">
                  <strong>Systematic Trading Progression:</strong><br/>
                  Intelligent micro-trading with automatic VIPER activation at $200 threshold
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  <span>Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-400">Active Positions</div>
                    <div className="font-mono text-lg text-white">{activeViperTrades}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Success Rate</div>
                    <div className="font-mono text-lg text-blue-400">
                      {((viperStatus?.successRate || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Market Overview */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-purple-400" />
                  <span>Live Market Data</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MarketData 
                  marketData={marketData || []}
                />
              </CardContent>
            </Card>

            {/* Quick Start Guide */}
            <Alert className="border-blue-500 bg-blue-500/10 mb-20">
              <Zap className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-gray-300 text-sm">
                <strong>Systematic Trading:</strong> The platform automatically progresses from micro-trading to advanced VIPER strategies as your balance grows.
              </AlertDescription>
            </Alert>
          </div>
        );

      case "viper":
        return (
          <div className="pb-20">
            <ViperStrategy userId={1} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white relative">
      {/* VIPER Status Floating Indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`px-3 py-2 rounded-lg shadow-lg border backdrop-blur-sm ${
          isViperRunning 
            ? 'bg-green-600/20 border-green-500' 
            : 'bg-gray-600/20 border-gray-500'
        }`}>
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              isViperRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
            }`} />
            <span className="text-white font-medium">
              {isViperRunning ? `${viperStatus?.cycleCount || 0} cycles` : 'STANDBY'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700">
            <TabsTrigger 
              value="dashboard" 
              className="flex items-center space-x-2 data-[state=active]:bg-blue-600"
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger 
              value="viper" 
              className="flex items-center space-x-2 data-[state=active]:bg-orange-600"
            >
              <Zap className="h-4 w-4" />
              <span>VIPER Strategy</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {renderTabContent()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}