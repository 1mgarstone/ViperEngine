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
import { useWebSocket } from "@/hooks/use-websocket";
import { TriangleAlert, ChartBarIcon, ShieldCheckIcon, GraduationCapIcon } from "lucide-react";

export default function Dashboard() {
  const [showEducationalModal, setShowEducationalModal] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  
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

  return (
    <div className="min-h-screen trading-bg-dark text-white">
      {/* Header */}
      <header className="trading-bg-slate border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-trading-blue rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">TradingLab</span>
              <Badge variant="secondary" className="bg-trading-yellow text-black">
                SIMULATION MODE
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Portfolio Value</div>
              <div className="font-mono font-semibold text-trading-green">
                ${portfolioData?.totalPortfolioValue || "100,000.00"}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-trading-green' : 'bg-trading-red'}`} />
              <span className="text-sm text-gray-400">
                {isConnected ? 'Live' : 'Disconnected'}
              </span>
            </div>
            
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold">DT</span>
            </div>
          </div>
        </div>
        
        {/* Risk Warning Banner */}
        <Alert className="mt-4 border-trading-yellow bg-trading-yellow/10">
          <TriangleAlert className="h-4 w-4 text-trading-yellow" />
          <AlertDescription className="text-trading-yellow">
            <strong>EDUCATIONAL SIMULATION ONLY:</strong> This platform uses virtual money for learning purposes. 
            No real cryptocurrency trading occurs here.
          </AlertDescription>
        </Alert>
      </header>

      <div className="flex h-screen pt-4">
        {/* Sidebar */}
        <aside className="w-64 trading-bg-slate border-r border-gray-700 p-4">
          <nav className="space-y-2">
            <Button variant="secondary" className="w-full justify-start bg-trading-blue text-white">
              <ChartBarIcon className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            
            <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white">
              <ShieldCheckIcon className="w-4 h-4 mr-2" />
              Risk Management
            </Button>
            
            <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white">
              <GraduationCapIcon className="w-4 h-4 mr-2" />
              Learn Trading
            </Button>
          </nav>
          
          {/* Educational Notice */}
          <div className="mt-8 p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
            <div className="flex items-start space-x-2">
              <GraduationCapIcon className="w-5 h-5 text-blue-400 mt-1" />
              <div>
                <h4 className="font-semibold text-blue-400 text-sm">Educational Platform</h4>
                <p className="text-xs text-blue-200 mt-1">
                  Practice trading strategies with virtual funds in a risk-free environment.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Market Overview */}
          <MarketData 
            marketData={marketData || []}
            onAssetSelect={setSelectedAsset}
            selectedAsset={selectedAsset}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Trading Interface */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="trading-bg-slate border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">
                      {selectedAssetData?.name || selectedAsset} Price Chart
                    </CardTitle>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="text-trading-blue border-trading-blue">
                        1H
                      </Button>
                      <Button size="sm" variant="ghost" className="text-gray-400">
                        4H
                      </Button>
                      <Button size="sm" variant="ghost" className="text-gray-400">
                        1D
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <TradingChart 
                    symbol={selectedAsset}
                    currentPrice={selectedAssetData?.currentPrice}
                  />
                </CardContent>
              </Card>
              
              {/* Portfolio Overview */}
              <PortfolioOverview 
                portfolioData={portfolioData}
                tradesData={tradesData}
              />
            </div>
            
            {/* Order Form and Risk Management */}
            <div className="space-y-6">
              <Tabs defaultValue="trade" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                  <TabsTrigger value="trade" className="text-white">Paper Trading</TabsTrigger>
                  <TabsTrigger value="risk" className="text-white">Risk Control</TabsTrigger>
                </TabsList>
                
                <TabsContent value="trade">
                  <OrderForm 
                    selectedAsset={selectedAsset}
                    assetData={selectedAssetData}
                    userBalance={userData?.paperBalance}
                  />
                </TabsContent>
                
                <TabsContent value="risk">
                  <RiskManagement userId={1} />
                </TabsContent>
              </Tabs>
              
              {/* Recent Orders */}
              <Card className="trading-bg-slate border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ordersData?.slice(0, 5).map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            order.status === 'filled' ? 'bg-trading-green' : 
                            order.status === 'pending' ? 'bg-trading-yellow' : 'bg-trading-red'
                          }`} />
                          <div>
                            <div className="font-medium">{order.asset?.symbol}/USDT</div>
                            <div className="text-sm text-gray-400">
                              {order.side.toUpperCase()} • ${parseFloat(order.price || '0').toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className={
                            order.status === 'filled' ? 'bg-trading-green text-white' :
                            order.status === 'pending' ? 'bg-trading-yellow text-black' :
                            'bg-trading-red text-white'
                          }>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    
                    {(!ordersData || ordersData.length === 0) && (
                      <div className="text-center text-gray-400 py-8">
                        <p>No orders placed yet</p>
                        <p className="text-sm mt-1">Start paper trading to see your orders here</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
      
      {/* Educational Modal */}
      <EducationalModal 
        isOpen={showEducationalModal}
        onClose={() => setShowEducationalModal(false)}
      />
    </div>
  );
}
