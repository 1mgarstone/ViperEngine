import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MarketDataProps {
  marketData: any[];
  onAssetSelect: (symbol: string) => void;
  selectedAsset: string;
}

export function MarketData({ marketData, onAssetSelect, selectedAsset }: MarketDataProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {marketData.map((asset) => {
        const change24h = parseFloat(asset.change24h || "0");
        const isPositive = change24h >= 0;
        const isSelected = asset.symbol === selectedAsset;
        
        return (
          <Card 
            key={asset.id} 
            className={`trading-bg-slate border-gray-700 cursor-pointer transition-all hover:border-gray-500 ${
              isSelected ? 'border-trading-blue' : ''
            }`}
            onClick={() => onAssetSelect(asset.symbol)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {asset.symbol}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{asset.symbol}/USDT</h3>
                    <p className="text-sm text-gray-400">{asset.name}</p>
                  </div>
                </div>
                <Badge variant="secondary" className={
                  isPositive ? 'bg-trading-green text-white' : 'bg-trading-red text-white'
                }>
                  {isPositive ? '+' : ''}{change24h.toFixed(2)}%
                </Badge>
              </div>
              
              <div className="space-y-2">
                <p className="text-2xl font-bold text-white">
                  ${parseFloat(asset.currentPrice).toFixed(2)}
                </p>
                <p className={`text-sm ${isPositive ? 'text-trading-green' : 'text-trading-red'}`}>
                  {isPositive ? '+' : ''}${(parseFloat(asset.currentPrice) * change24h / 100).toFixed(2)} (24h)
                </p>
                <p className="text-xs text-gray-400">
                  Volume: {parseFloat(asset.volume24h || "0").toFixed(2)} {asset.symbol}
                </p>
              </div>
              
              {isSelected && (
                <div className="mt-4">
                  <Button size="sm" className="w-full bg-trading-blue hover:bg-blue-600">
                    Selected Asset
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      
      {marketData.length === 0 && (
        <div className="col-span-full">
          <Card className="trading-bg-slate border-gray-700">
            <CardContent className="p-6 text-center">
              <p className="text-gray-400">Loading market data...</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
