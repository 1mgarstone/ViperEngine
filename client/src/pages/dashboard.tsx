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
  const [selectedAsset, setSelectedAsset] = useState("BTC");
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
    { id: "dashboard", label: "Home", icon: Home, color: "blue" },
    { id: "trade", label: "Trade", icon: TrendingUp, color: "green" },
    { id: "portfolio", label: "Portfolio", icon: BarChart3, color: "purple" },
    { id: "risk", label: "Risk", icon: Shield, color: "yellow" },
    { id: "viper", label: "VIPER", icon: Zap, color: "orange" }
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

  const selectedAssetData = marketData?.find(asset => asset.symbol === selectedAsset);

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-3 pb-20">
            {/* Portfolio Section - Collapsible */}
            <Collapsible open={portfolioExpanded} onOpenChange={setPortfolioExpanded}>
              <Card className="bg-gray-800 border-gray-700">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-3 hover:bg-gray-750 transition-colors">
                    <CardTitle className="text-white text-lg flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-5 w-5 text-green-400" />
                        <span>Portfolio</span>
                        <Badge className="px-2 py-1 text-xs bg-green-600 text-white">$100K</Badge>
                      </div>
                      {portfolioExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-400">Balance</div>
                        <div className="font-mono text-lg text-green-400">$100,000</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">P&L</div>
                        <div className="font-mono text-lg text-gray-400">$0.00</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Positions</div>
                        <div className="font-mono text-lg text-white">0</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Status</div>
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                          <span className="text-sm text-gray-300">{isConnected ? 'Live' : 'Off'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Market Overview - Collapsible */}
            <Collapsible open={marketExpanded} onOpenChange={setMarketExpanded}>
              <Card className="bg-gray-800 border-gray-700">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-3 hover:bg-gray-750 transition-colors">
                    <CardTitle className="text-white text-lg flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Activity className="h-5 w-5 text-blue-400" />
                        <span>Market Data</span>
                        <Badge className="px-2 py-1 text-xs bg-blue-600 text-white">{marketData?.length || 0} Assets</Badge>
                      </div>
                      {marketExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <MarketData 
                      marketData={marketData || []}
                      onAssetSelect={setSelectedAsset}
                      selectedAsset={selectedAsset}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Trading Chart - Collapsible */}
            <Collapsible open={chartExpanded} onOpenChange={setChartExpanded}>
              <Card className="bg-gray-800 border-gray-700">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-3 hover:bg-gray-750 transition-colors">
                    <CardTitle className="text-white text-lg flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="h-5 w-5 text-purple-400" />
                        <span>{selectedAsset}/USDT Chart</span>
                        <Badge className="px-2 py-1 text-xs bg-purple-600 text-white">
                          ${selectedAssetData?.currentPrice || "---"}
                        </Badge>
                      </div>
                      {chartExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <TradingChart 
                      symbol={selectedAsset}
                      currentPrice={selectedAssetData?.currentPrice}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Recent Orders - Collapsible */}
            <Collapsible open={ordersExpanded} onOpenChange={setOrdersExpanded}>
              <Card className="bg-gray-800 border-gray-700">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-3 hover:bg-gray-750 transition-colors">
                    <CardTitle className="text-white text-lg flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-orange-400" />
                        <span>Recent Orders</span>
                        <Badge className="px-2 py-1 text-xs bg-orange-600 text-white">
                          {(ordersData as any[])?.length || 0}
                        </Badge>
                      </div>
                      {ordersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {(ordersData as any[])?.length > 0 ? (
                      <div className="space-y-2">
                        {(ordersData as any[]).slice(0, 5).map((order: any) => (
                          <div key={order.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                            <div>
                              <div className="font-medium text-sm text-white">{order.symbol}</div>
                              <div className="text-xs text-gray-400">{order.side} • ${order.price}</div>
                            </div>
                            <Badge className="text-xs" variant={order.status === 'filled' ? 'default' : 'secondary'}>
                              {order.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-gray-400 text-sm">No orders yet</p>
                        <p className="text-gray-500 text-xs">Start trading to see orders</p>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Educational Alert */}
            <Alert className="border-orange-500 bg-orange-500/10 mb-20">
              <TriangleAlert className="h-4 w-4 text-orange-400" />
              <AlertDescription className="text-gray-300 text-sm">
                <strong>Demo Mode:</strong> Virtual funds only - no real money at risk.
              </AlertDescription>
            </Alert>
          </div>
        );

      case "trade":
        return (
          <div className="pb-20">
            <OrderForm 
              selectedAsset={selectedAsset}
              assetData={selectedAssetData}
              userBalance={(userData as any)?.paperBalance}
            />
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
    <div className="min-h-screen bg-gray-900 text-white">
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
              <div className="text-xs text-gray-400">Portfolio</div>
              <div className="font-mono text-sm text-green-400">$100K</div>
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

      {/* Main Content with Swipe Gestures */}
      <main 
        ref={containerRef}
        className="px-4 py-4 mobile-scroll max-h-screen overflow-y-auto touch-pan-x"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: isDragging ? `translateX(${Math.max(-50, Math.min(50, dragOffset * 0.3))}px)` : 'translateX(0)',
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {renderTabContent()}
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