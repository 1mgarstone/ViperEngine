import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PortfolioOverviewProps {
  portfolioData?: any;
  tradesData?: any[];
  currentBalance?: number;
  isLiveMode?: boolean;
}

export function PortfolioOverview({ portfolioData, tradesData, currentBalance = 0, isLiveMode = false }: PortfolioOverviewProps) {
  const positions = portfolioData?.positions || [];
  const totalValue = currentBalance || parseFloat(portfolioData?.totalPortfolioValue || "0");
  const availableBalance = currentBalance || parseFloat(portfolioData?.availableBalance || "0");
  const totalInvested = positions.reduce((sum: number, pos: any) => sum + parseFloat(pos.totalInvested), 0);
  const totalPnL = (currentBalance - 200) || positions.reduce((sum: number, pos: any) => sum + parseFloat(pos.pnl), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Portfolio Summary */}
      <Card className="trading-bg-slate border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Portfolio Performance</CardTitle>
            <Badge variant="secondary" className={isLiveMode ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}>
              {isLiveMode ? "LIVE TRADING" : "DEMO MODE"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-1">Total Balance</p>
              <p className="text-2xl font-bold text-white">${totalValue.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-1">P&L</p>
              <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-trading-green' : 'text-trading-red'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            {positions.map((position: any) => (
              <div key={position.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {position.asset?.symbol || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{position.asset?.name || 'Unknown'}</p>
                    <p className="text-gray-400 text-sm">
                      {parseFloat(position.quantity).toFixed(6)} {position.asset?.symbol}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">${position.currentValue}</p>
                  <p className={`text-sm ${parseFloat(position.pnl) >= 0 ? 'text-trading-green' : 'text-trading-red'}`}>
                    {parseFloat(position.pnlPercentage) >= 0 ? '+' : ''}{parseFloat(position.pnlPercentage).toFixed(2)}%
                  </p>
                </div>
              </div>
            ))}
            
            {positions.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <p>No positions yet</p>
                <p className="text-sm mt-1">Start trading to build your portfolio</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card className="trading-bg-slate border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tradesData?.slice(0, 5).map((trade: any) => (
              <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${trade.side === 'buy' ? 'bg-trading-green' : 'bg-trading-red'}`} />
                  <div>
                    <p className="text-white font-medium">{trade.asset?.symbol}/USDT</p>
                    <p className="text-gray-400 text-sm">
                      {trade.side.toUpperCase()} • ${parseFloat(trade.price).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">${parseFloat(trade.total).toFixed(2)}</p>
                  <p className="text-gray-400 text-sm">
                    {new Date(trade.executedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {(!tradesData || tradesData.length === 0) && (
              <div className="text-center text-gray-400 py-8">
                <p>No trades executed yet</p>
                <p className="text-sm mt-1">Your completed trades will appear here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
