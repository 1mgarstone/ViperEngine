import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TradingChart } from "@/components/trading-chart";
import { OrderForm } from "@/components/order-form";
import { PortfolioOverview } from "@/components/portfolio-overview";
import { RiskManagement } from "@/components/risk-management";
import { MarketData } from "@/components/market-data";
import { EducationalModal } from "@/components/educational-modal";
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
  ChevronDown,
  ChevronUp,
  DollarSign,
  Activity,
  Clock,
  Plus,
  ArrowLeftRight
} from "lucide-react";

export default function Dashboard() {
  const [showEducationalModal, setShowEducationalModal] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Collapsible sections state
  const [portfolioExpanded, setPortfolioExpanded] = useState(true);
  const [marketExpanded, setMarketExpanded] = useState(true);
  const [chartExpanded, setChartExpanded] = useState(false);
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  
  // Swipe gesture state
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  const tabs = [
    { id: "dashboard", label: "Overview", icon: Home, color: "blue" },
    { id: "viper", label: "VIPER Strike", icon: Zap, color: "orange" },
    { id: "portfolio", label: "Portfolio", icon: BarChart3, color: "purple" }
  ];
  
  const currentTabIndex = tabs.findIndex(tab => tab.id === activeTab);
  
  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    setDragOffset(diff);
  };
  
  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const threshold = 80;
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0 && currentTabIndex > 0) {
        // Swipe right - previous tab
        setActiveTab(tabs[currentTabIndex - 1].id);
      } else if (dragOffset < 0 && currentTabIndex < tabs.length - 1) {
        // Swipe left - next tab
        setActiveTab(tabs[currentTabIndex + 1].id);
      }
    }
    
    setIsDragging(false);
    setDragOffset(0);
  };
  
  // WebSocket connection for real-time data
  const { marketData, isConnected } = useWebSocket();
  
  // Fetch user data
  const { data: userData } = useQuery({
    queryKey: ["/api/user/1"],
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
  const totalPnL = viperStatus?.profitability || 0;
  const currentBalance = parseFloat(userData?.paperBalance || "100") + totalPnL;

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
                    <div className="text-xs text-orange-100">Balance</div>
                    <div className="font-mono text-lg text-white">${currentBalance.toFixed(2)} USDT</div>
                    {totalPnL !== 0 && (
                      <div className={`text-xs ${totalPnL > 0 ? 'text-green-300' : 'text-red-300'}`}>
                        {totalPnL > 0 ? '+' : ''}${totalPnL.toFixed(2)} P&L
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
                        <div className="text-white font-mono">
                          {isViperRunning ? Math.floor(Math.random() * 15 + 5) : 0}
                        </div>
                      </div>
                      <div className="bg-red-600/30 rounded p-2">
                        <div className="text-red-200">Short Liquidations</div>
                        <div className="text-white font-mono">
                          {isViperRunning ? Math.floor(Math.random() * 12 + 3) : 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={async () => {
                    // Auto-start VIPER when launching
                    try {
                      const response = await fetch('/api/viper-control/start', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ mode: 'liquidation_scanner' })
                      });
                      if (response.ok) {
                        setActiveTab("viper");
                      }
                    } catch (error) {
                      console.error('Failed to start VIPER:', error);
                      setActiveTab("viper");
                    }
                  }}
                  className="w-full bg-white text-orange-600 font-bold py-3 rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <Zap className="h-5 w-5" />
                  <span>Launch VIPER Liquidation Scanner</span>
                </button>
              </CardContent>
            </Card>

            {/* Portfolio Overview */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  <span>Portfolio Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-400">Total Value</div>
                    <div className="font-mono text-lg text-white">${currentBalance.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">P&L Today</div>
                    <div className={`font-mono text-lg ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                    </div>
                  </div>
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
                <strong>Quick Start:</strong> Select a token above, then tap "VIPER Strike" to activate autonomous trading with advanced liquidation detection.
              </AlertDescription>
            </Alert>
          </div>
        );

      case "trade":
        return (
          <div className="pb-20">
            <Alert className="mb-4 border-orange-500 bg-orange-500/10">
              <Zap className="h-4 w-4 text-orange-500" />
              <AlertDescription className="text-orange-200">
                Manual trading disabled. VIPER Strike handles all trades autonomously for optimal profit generation.
              </AlertDescription>
            </Alert>
          </div>
        );

      case "risk":
        return (
          <div className="pb-20">
            <RiskManagement userId={1} />
          </div>
        );

      case "viper":
        return (
          <div className="pb-20">
            <ViperStrategy userId={1} />
          </div>
        );

      case "portfolio":
        return (
          <div className="pb-20">
            <PortfolioOverview 
              portfolioData={portfolioData}
              tradesData={tradesData as any[]}
            />
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
            ? 'bg-green-600/90 border-green-500 animate-pulse' 
            : 'bg-gray-700/90 border-gray-600'
        }`}>
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-white" />
            <span className="text-white text-xs font-medium">
              {isViperRunning ? 'ACTIVE' : 'STANDBY'}
            </span>
            {isViperRunning && (
              <div className="text-xs text-green-200">
                {viperStatus?.cycleCount || 0}
              </div>
            )}
          </div>
          {totalPnL !== 0 && (
            <div className={`text-xs text-center mt-1 font-mono ${totalPnL > 0 ? 'text-green-200' : 'text-red-200'}`}>
              {totalPnL > 0 ? '+' : ''}${totalPnL.toFixed(2)}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-blue-500 rounded flex items-center justify-center">
              <span className="text-xs font-bold text-white">TL</span>
            </div>
            <h1 className="text-lg font-bold">TradingLab</h1>
            <Badge className="px-2 py-1 text-xs bg-green-600 text-white">SIM</Badge>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-xs text-gray-400">Balance</div>
              <div className="font-mono text-sm text-green-400">${currentBalance.toFixed(2)}</div>
            </div>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          </div>
        </div>
      </header>

      {/* Swipe Indicator */}
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40">
        <div className="flex items-center space-x-2 bg-gray-800/80 backdrop-blur-sm px-3 py-1 rounded-full">
          <div className="flex space-x-1">
            {tabs.map((tab, index) => (
              <div 
                key={tab.id}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentTabIndex ? 'bg-white w-4' : 'bg-gray-500'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content with Fixed Scrolling */}
      <main 
        ref={containerRef}
        className="px-4 py-4 mobile-scroll"
        style={{
          height: 'calc(100vh - 140px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          position: 'relative'
        }}
      >
        <div 
          style={{
            transform: isDragging ? `translateX(${Math.max(-50, Math.min(50, dragOffset * 0.3))}px)` : 'translateX(0)',
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {renderTabContent()}
        </div>
      </main>

      {/* Quick Actions Floating Button */}
      <div className="fixed bottom-20 right-4 z-40">
        <div className="relative">
          {/* Quick Actions Menu */}
          {showQuickActions && (
            <div className="absolute bottom-16 right-0 bg-gray-800/95 backdrop-blur-sm rounded-2xl p-4 shadow-2xl border border-gray-700 min-w-[200px]">
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setActiveTab("trade");
                    setShowQuickActions(false);
                  }}
                  className="flex items-center space-x-3 w-full p-3 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors btn-bounce"
                >
                  <TrendingUp className="h-5 w-5" />
                  <span className="font-medium">Quick Trade</span>
                </button>
                
                <button
                  onClick={() => {
                    setActiveTab("viper");
                    setShowQuickActions(false);
                  }}
                  className="flex items-center space-x-3 w-full p-3 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-colors btn-bounce"
                >
                  <Zap className="h-5 w-5" />
                  <span className="font-medium">VIPER Strike</span>
                </button>
                
                <button
                  onClick={() => {
                    setActiveTab("portfolio");
                    setShowQuickActions(false);
                  }}
                  className="flex items-center space-x-3 w-full p-3 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors btn-bounce"
                >
                  <BarChart3 className="h-5 w-5" />
                  <span className="font-medium">Portfolio</span>
                </button>
                
                <button
                  onClick={() => {
                    setChartExpanded(!chartExpanded);
                    setShowQuickActions(false);
                  }}
                  className="flex items-center space-x-3 w-full p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors btn-bounce"
                >
                  <ArrowLeftRight className="h-5 w-5" />
                  <span className="font-medium">Toggle Chart</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Main FAB */}
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className={`w-14 h-14 rounded-full shadow-lg transition-all duration-300 btn-bounce touch-target ${
              showQuickActions 
                ? 'bg-red-600 hover:bg-red-700 rotate-45' 
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
            }`}
          >
            <Plus className="h-6 w-6 text-white mx-auto" />
          </button>
        </div>
      </div>

      {/* Enhanced Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700 px-2 py-2 z-50">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            const colorMap = {
              blue: "bg-blue-600",
              green: "bg-green-600", 
              purple: "bg-purple-600",
              yellow: "bg-yellow-600",
              orange: "bg-orange-600"
            };
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center space-y-1 p-3 rounded-xl transition-all duration-200 min-w-[60px] btn-bounce touch-target nav-transition ${
                  isActive 
                    ? `${colorMap[tab.color as keyof typeof colorMap]} text-white shadow-lg scale-105` 
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                <IconComponent className={`h-5 w-5 ${isActive ? 'animate-pulse' : ''}`} />
                <span className="text-xs font-medium">{tab.label}</span>
                {isActive && (
                  <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Educational Modal */}
      <EducationalModal 
        isOpen={showEducationalModal}
        onClose={() => setShowEducationalModal(false)}
      />
    </div>
  );
}