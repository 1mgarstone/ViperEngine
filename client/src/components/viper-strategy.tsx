import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Zap, Target, Shield, TrendingUp, Activity, AlertTriangle } from "lucide-react";

interface ViperStrategyProps {
  userId: number;
}

export function ViperStrategy({ userId }: ViperStrategyProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [maxLeverage, setMaxLeverage] = useState([125]);
  const [volThreshold, setVolThreshold] = useState("0.008");
  const [strikeWindow, setStrikeWindow] = useState("0.170");
  const [profitTarget, setProfitTarget] = useState("2.00");
  const [stopLoss, setStopLoss] = useState("0.100");
  const [clusterThreshold, setClusterThreshold] = useState("0.005");
  const [positionScaling, setPositionScaling] = useState("1.00");
  const [maxConcurrentTrades, setMaxConcurrentTrades] = useState([2]);
  const [balanceMultiplier, setBalanceMultiplier] = useState("2.00");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch VIPER settings
  const { data: viperSettings } = useQuery({
    queryKey: [`/api/viper-settings/${userId}`],
  });

  // Fetch VIPER performance
  const { data: viperPerformance } = useQuery({
    queryKey: [`/api/viper-performance/${userId}`],
    refetchInterval: 5000, // Update every 5 seconds
  });

  // Fetch active VIPER trades
  const { data: activeTrades } = useQuery({
    queryKey: [`/api/viper-trades/${userId}`],
    refetchInterval: 3000, // Update every 3 seconds
  });

  // Update state when settings are loaded
  useEffect(() => {
    if (viperSettings) {
      setIsEnabled(viperSettings.isEnabled || false);
      setMaxLeverage([viperSettings.maxLeverage || 125]);
      setVolThreshold(viperSettings.volThreshold || "0.008");
      setStrikeWindow(viperSettings.strikeWindow || "0.170");
      setProfitTarget(viperSettings.profitTarget || "2.00");
      setStopLoss(viperSettings.stopLoss || "0.100");
      setClusterThreshold(viperSettings.clusterThreshold || "0.005");
      setPositionScaling(viperSettings.positionScaling || "1.00");
      setMaxConcurrentTrades([viperSettings.maxConcurrentTrades || 2]);
      setBalanceMultiplier(viperSettings.balanceMultiplier || "2.00");
    }
  }, [viperSettings]);

  // Update VIPER settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settingsData: any) => {
      const response = await apiRequest("PUT", "/api/viper-settings", settingsData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "VIPER Settings Updated",
        description: "Liquidation trading strategy configuration has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/viper-settings/${userId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update VIPER settings",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const settingsData = {
      userId,
      isEnabled,
      maxLeverage: maxLeverage[0],
      volThreshold: parseFloat(volThreshold).toFixed(5),
      strikeWindow: parseFloat(strikeWindow).toFixed(3),
      profitTarget: parseFloat(profitTarget).toFixed(2),
      stopLoss: parseFloat(stopLoss).toFixed(3),
      clusterThreshold: parseFloat(clusterThreshold).toFixed(5),
      positionScaling: parseFloat(positionScaling).toFixed(2),
      maxConcurrentTrades: maxConcurrentTrades[0],
      balanceMultiplier: parseFloat(balanceMultiplier).toFixed(2),
    };

    updateSettingsMutation.mutate(settingsData);
  };

  const calculateRiskLevel = () => {
    const leverageRisk = (maxLeverage[0] / 125) * 40; // Max 40 points
    const stopLossRisk = ((0.2 - parseFloat(stopLoss)) / 0.2) * 30; // Max 30 points
    const concurrencyRisk = (maxConcurrentTrades[0] / 5) * 30; // Max 30 points
    
    return Math.min(100, leverageRisk + stopLossRisk + concurrencyRisk);
  };

  const riskLevel = calculateRiskLevel();
  const riskColor = riskLevel < 30 ? "text-trading-green" : riskLevel < 70 ? "text-trading-yellow" : "text-trading-red";

  return (
    <div className="space-y-6">
      {/* Strategy Header */}
      <Card className="trading-bg-slate border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-white">VIPER Strike Strategy</CardTitle>
                <p className="text-gray-400 text-sm">Advanced liquidation cluster detection & execution</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className={
                isEnabled ? 'bg-trading-green text-white' : 'bg-gray-600 text-gray-300'
              }>
                {isEnabled ? 'ACTIVE' : 'DISABLED'}
              </Badge>
              {viperPerformance && (
                <div className="text-right">
                  <div className="text-sm text-gray-400">Performance</div>
                  <div className={`font-mono font-semibold ${
                    viperPerformance.totalPnL >= 0 ? 'text-trading-green' : 'text-trading-red'
                  }`}>
                    {viperPerformance.totalPnL >= 0 ? '+' : ''}${viperPerformance.totalPnL?.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger value="settings" className="text-white">Strategy Settings</TabsTrigger>
          <TabsTrigger value="performance" className="text-white">Performance</TabsTrigger>
          <TabsTrigger value="trades" className="text-white">Active Trades</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card className="trading-bg-slate border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Strategy Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Strategy Enable/Disable */}
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <Label className="text-white font-medium">Enable VIPER Strategy</Label>
                    <p className="text-gray-400 text-sm">Activate automated liquidation cluster trading</p>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={setIsEnabled}
                  />
                </div>

                {/* Risk Assessment */}
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300">Strategy Risk Level</span>
                    <span className={`font-semibold ${riskColor}`}>
                      {riskLevel < 30 ? 'Conservative' : riskLevel < 70 ? 'Moderate' : 'Aggressive'}
                    </span>
                  </div>
                  <Progress value={riskLevel} className="mb-2" />
                  <div className="text-center">
                    <span className={`text-lg font-bold ${riskColor}`}>
                      {riskLevel.toFixed(1)}/100
                    </span>
                  </div>
                </div>

                {/* Core Parameters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Max Leverage */}
                  <div className="space-y-3">
                    <Label className="text-gray-300">
                      Max Leverage: {maxLeverage[0]}x
                    </Label>
                    <Slider
                      value={maxLeverage}
                      onValueChange={setMaxLeverage}
                      max={125}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>1x (Safe)</span>
                      <span>125x (Maximum)</span>
                    </div>
                  </div>

                  {/* Profit Target */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">Profit Target (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={profitTarget}
                      onChange={(e) => setProfitTarget(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  {/* Stop Loss */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">Stop Loss (%)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  {/* Volatility Threshold */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">Volatility Threshold</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={volThreshold}
                      onChange={(e) => setVolThreshold(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  {/* Strike Window */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">Strike Window</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={strikeWindow}
                      onChange={(e) => setStrikeWindow(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  {/* Cluster Threshold */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">Cluster Threshold</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={clusterThreshold}
                      onChange={(e) => setClusterThreshold(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Max Concurrent Trades */}
                  <div className="space-y-3">
                    <Label className="text-gray-300">
                      Max Concurrent Trades: {maxConcurrentTrades[0]}
                    </Label>
                    <Slider
                      value={maxConcurrentTrades}
                      onValueChange={setMaxConcurrentTrades}
                      max={5}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  {/* Balance Multiplier */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">Balance Multiplier</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={balanceMultiplier}
                      onChange={(e) => setBalanceMultiplier(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  {/* Position Scaling */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">Position Scaling</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={positionScaling}
                      onChange={(e) => setPositionScaling(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>

                {/* Risk Warning */}
                {riskLevel > 70 && (
                  <Alert className="border-trading-red bg-red-900/20">
                    <AlertTriangle className="h-4 w-4 text-trading-red" />
                    <AlertDescription className="text-trading-red">
                      <strong>High Risk Configuration:</strong> These settings indicate extremely aggressive trading parameters. 
                      Consider reducing leverage or tightening stop losses for educational purposes.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Educational Notice */}
                <Alert className="border-blue-500/30 bg-blue-500/10">
                  <AlertDescription className="text-blue-400 text-sm">
                    <strong>Educational Strategy:</strong> VIPER Strike demonstrates advanced algorithmic trading concepts 
                    using simulated liquidation data. This is for learning purposes only.
                  </AlertDescription>
                </Alert>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? 'Updating...' : 'Apply VIPER Configuration'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="trading-bg-slate border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-8 h-8 text-trading-blue" />
                  <div>
                    <p className="text-gray-400 text-sm">Total P&L</p>
                    <p className={`text-2xl font-bold ${
                      (viperPerformance?.totalPnL || 0) >= 0 ? 'text-trading-green' : 'text-trading-red'
                    }`}>
                      {(viperPerformance?.totalPnL || 0) >= 0 ? '+' : ''}${(viperPerformance?.totalPnL || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="trading-bg-slate border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <Target className="w-8 h-8 text-trading-yellow" />
                  <div>
                    <p className="text-gray-400 text-sm">Win Rate</p>
                    <p className="text-2xl font-bold text-white">
                      {(viperPerformance?.winRate || 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="trading-bg-slate border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <Activity className="w-8 h-8 text-trading-green" />
                  <div>
                    <p className="text-gray-400 text-sm">Total Trades</p>
                    <p className="text-2xl font-bold text-white">
                      {viperPerformance?.totalTrades || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="trading-bg-slate border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <Shield className="w-8 h-8 text-trading-red" />
                  <div>
                    <p className="text-gray-400 text-sm">Active Trades</p>
                    <p className="text-2xl font-bold text-white">
                      {viperPerformance?.activeTrades || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trades">
          <Card className="trading-bg-slate border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Active VIPER Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeTrades?.map((trade: any) => (
                  <div key={trade.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${
                        trade.status === 'active' ? 'bg-trading-green' : 'bg-gray-500'
                      }`} />
                      <div>
                        <div className="font-medium text-white">{trade.instId}</div>
                        <div className="text-sm text-gray-400">
                          {trade.side.toUpperCase()} • {trade.leverage}x • Entry: ${parseFloat(trade.entryPrice).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${
                        parseFloat(trade.pnl || '0') >= 0 ? 'text-trading-green' : 'text-trading-red'
                      }`}>
                        {parseFloat(trade.pnl || '0') >= 0 ? '+' : ''}${parseFloat(trade.pnl || '0').toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-400">
                        {new Date(trade.entryTime).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!activeTrades || activeTrades.length === 0) && (
                  <div className="text-center text-gray-400 py-8">
                    <Zap className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                    <p>No active VIPER trades</p>
                    <p className="text-sm mt-1">Enable the strategy to start automated trading</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}