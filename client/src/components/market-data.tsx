import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

interface MarketDataProps {
  marketData: any[];
}

export function MarketData({ marketData }: MarketDataProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-semibold text-white">Market Overview</h3>
        <Badge className="bg-green-600 text-white">VIPER Scanning</Badge>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {marketData.slice(0, 8).map((asset) => {
          const change24h = parseFloat(asset.change24h || "0");
          const isPositive = change24h >= 0;
          
          return (
            <Card 
              key={asset.id} 
              className="trading-bg-slate border-gray-700 hover:border-gray-600 transition-colors"
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-orange-400 to-orange-600 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-xs">
                        {asset.symbol.substring(0, 2)}
                      </span>
                    </div>
                    <span className="font-medium text-white text-sm">{asset.symbol}</span>
                  </div>
                  <Badge variant="secondary" className={`text-xs ${
                    isPositive ? 'bg-trading-green text-white' : 'bg-trading-red text-white'
                  }`}>
                    {isPositive ? '+' : ''}{change24h.toFixed(1)}%
                  </Badge>
                </div>
                
                <p className="text-lg font-bold text-white">
                  ${parseFloat(asset.currentPrice).toFixed(2)}
                </p>
                <p className={`text-xs ${isPositive ? 'text-trading-green' : 'text-trading-red'}`}>
                  {isPositive ? '+' : ''}${(parseFloat(asset.currentPrice) * change24h / 100).toFixed(2)} (24h)
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {marketData.length === 0 && (
        <Card className="trading-bg-slate border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-gray-400">Loading market data...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
