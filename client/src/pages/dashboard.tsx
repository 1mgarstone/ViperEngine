import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Home
} from "lucide-react";

export default function Dashboard() {
  const [showEducationalModal, setShowEducationalModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const [activeTab, setActiveTab] = useState("dashboard");
  
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
          <div className="space-y-4 pb-20">
            {/* Quick Stats */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  <span>Portfolio</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
            </Card>

            {/* Market Overview */}
            <MarketData 
              marketData={marketData || []}
              onAssetSelect={setSelectedAsset}
              selectedAsset={selectedAsset}
            />

            {/* Trading Chart */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">{selectedAsset}/USDT</CardTitle>
              </CardHeader>
              <CardContent>
                <TradingChart 
                  symbol={selectedAsset}
                  currentPrice={selectedAssetData?.currentPrice}
                />
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {(ordersData as any[])?.length > 0 ? (
                  <div className="space-y-2">
                    {(ordersData as any[]).slice(0, 3).map((order: any) => (
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
            </Card>

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

      {/* Main Content */}
      <main className="px-4 py-4 mobile-scroll max-h-screen overflow-y-auto">
        {renderTabContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-4 py-2 z-50">
        <div className="flex items-center justify-around">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
              activeTab === "dashboard" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </button>
          
          <button
            onClick={() => setActiveTab("trade")}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
              activeTab === "trade" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs">Trade</span>
          </button>
          
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
              activeTab === "portfolio" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs">Portfolio</span>
          </button>
          
          <button
            onClick={() => setActiveTab("risk")}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
              activeTab === "risk" ? "bg-yellow-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Shield className="h-5 w-5" />
            <span className="text-xs">Risk</span>
          </button>
          
          <button
            onClick={() => setActiveTab("viper")}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
              activeTab === "viper" ? "bg-orange-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Zap className="h-5 w-5" />
            <span className="text-xs">VIPER</span>
          </button>
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