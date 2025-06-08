import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, Target, Shield, TrendingUp, Activity, AlertTriangle, Play, Square } from "lucide-react";
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
  
  // State for form inputs
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

  // Fetch VIPER settings
  const { data: viperSettings } = useQuery<ViperSettings>({
    queryKey: [`/api/viper-settings/${userId}`],
  });

  // Fetch VIPER performance
  const { data: viperPerformance } = useQuery<ViperPerformance>({
    queryKey: [`/api/viper-performance/${userId}`],
    refetchInterval: 5000,
  });

  // Fetch active VIPER trades
  const { data: activeTrades } = useQuery<any[]>({
    queryKey: [`/api/viper-trades/${userId}`],
    refetchInterval: 3000,
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
      const response = await fetch(`/api/viper-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settingsData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/viper-settings/${userId}`] });
      toast({
        title: "VIPER Settings Updated",
        description: "Your liquidation strike configuration has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update VIPER settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    const settingsData = {
      userId,
      isEnabled,
      maxLeverage: maxLeverage[0],
      volThreshold,
      strikeWindow,
      profitTarget,
      stopLoss,
      clusterThreshold,
      positionScaling,
      maxConcurrentTrades: maxConcurrentTrades[0],
      balanceMultiplier,
    };

    updateSettingsMutation.mutate(settingsData);
  };

  return (
    <div className="space-y-6">
      {/* VIPER Header */}
      <Card className="trading-bg-slate border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Zap className="h-6 w-6 text-trading-orange" />
                <CardTitle className="text-xl text-white">VIPER Strike</CardTitle>
              </div>
              <Badge className={`px-3 py-1 text-xs font-semibold ${
                isEnabled ? 'bg-trading-green text-white' : 'bg-gray-600 text-gray-300'
              }`}>
                {isEnabled ? 'ACTIVE' : 'DISABLED'}
              </Badge>
              {viperPerformance && (
                <div className="text-right">
                  <div className="text-sm text-gray-400">Performance</div>
                  <div className={`font-mono font-semibold ${
                    (viperPerformance.totalPnL || 0) >= 0 ? 'text-trading-green' : 'text-trading-red'
                  }`}>
                    {(viperPerformance.totalPnL || 0) >= 0 ? '+' : ''}${(viperPerformance.totalPnL || 0).toFixed(2)}
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
                <Target className="h-5 w-5 text-trading-orange" />
                <span>Liquidation Strike Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Switch */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white text-base font-semibold">Enable VIPER Strike</Label>
                  <p className="text-sm text-gray-400">Activate automated liquidation cluster trading</p>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                />
              </div>

              <Separator className="bg-gray-600" />

              {/* Leverage Settings */}
              <div className="space-y-3">
                <Label className="text-white text-sm font-semibold">Maximum Leverage: {maxLeverage[0]}x</Label>
                <Slider
                  value={maxLeverage}
                  onValueChange={setMaxLeverage}
                  max={125}
                  min={1}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>1x</span>
                  <span>125x</span>
                </div>
              </div>

              {/* Trading Parameters */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white text-sm">Volatility Threshold</Label>
                  <Input
                    value={volThreshold}
                    onChange={(e) => setVolThreshold(e.target.value)}
                    placeholder="0.008"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-sm">Strike Window (s)</Label>
                  <Input
                    value={strikeWindow}
                    onChange={(e) => setStrikeWindow(e.target.value)}
                    placeholder="0.170"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-sm">Profit Target (%)</Label>
                  <Input
                    value={profitTarget}
                    onChange={(e) => setProfitTarget(e.target.value)}
                    placeholder="2.00"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-sm">Stop Loss (%)</Label>
                  <Input
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="0.100"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              {/* Position Management */}
              <div className="space-y-3">
                <Label className="text-white text-sm font-semibold">Max Concurrent Trades: {maxConcurrentTrades[0]}</Label>
                <Slider
                  value={maxConcurrentTrades}
                  onValueChange={setMaxConcurrentTrades}
                  max={5}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white text-sm">Cluster Threshold</Label>
                  <Input
                    value={clusterThreshold}
                    onChange={(e) => setClusterThreshold(e.target.value)}
                    placeholder="0.005"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-sm">Balance Multiplier</Label>
                  <Input
                    value={balanceMultiplier}
                    onChange={(e) => setBalanceMultiplier(e.target.value)}
                    placeholder="2.00"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
                className="w-full bg-trading-orange hover:bg-trading-orange/80 text-white"
              >
                {updateSettingsMutation.isPending ? "Saving..." : "Save VIPER Configuration"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card className="trading-bg-slate border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-trading-green" />
                <span>Strategy Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {viperPerformance ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">Total P&L</div>
                    <div className={`text-lg font-bold ${
                      (viperPerformance.totalPnL || 0) >= 0 ? 'text-trading-green' : 'text-trading-red'
                    }`}>
                      {(viperPerformance.totalPnL || 0) >= 0 ? '+' : ''}${(viperPerformance.totalPnL || 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Win Rate</div>
                    <div className="text-lg font-bold text-white">
                      {((viperPerformance.winRate || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Total Trades</div>
                    <div className="text-lg font-bold text-white">
                      {viperPerformance.totalTrades || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Active Trades</div>
                    <div className="text-lg font-bold text-trading-orange">
                      {viperPerformance.activeTrades || 0}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No performance data available</p>
                  <p className="text-sm text-gray-500">Enable VIPER Strike to start collecting performance metrics</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trades">
          <Card className="trading-bg-slate border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Shield className="h-5 w-5 text-trading-blue" />
                <span>Active Trades</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeTrades && activeTrades.length > 0 ? (
                <div className="space-y-3">
                  {activeTrades.map((trade: any, index: number) => (
                    <div key={index} className="p-4 bg-gray-700 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-white">{trade.instId}</div>
                          <div className="text-sm text-gray-400">{trade.side.toUpperCase()} • {trade.quantity} units</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${
                            parseFloat(trade.pnl || "0") >= 0 ? 'text-trading-green' : 'text-trading-red'
                          }`}>
                            {parseFloat(trade.pnl || "0") >= 0 ? '+' : ''}${parseFloat(trade.pnl || "0").toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-400">{trade.status}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No active trades</p>
                  <p className="text-sm text-gray-500">VIPER will automatically detect and execute liquidation strikes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Educational Alert */}
      <Alert className="border-trading-orange bg-trading-orange/10">
        <AlertTriangle className="h-4 w-4 text-trading-orange" />
        <AlertDescription className="text-gray-300">
          <strong>Educational Notice:</strong> VIPER Strike is a sophisticated algorithmic trading strategy simulation.
          This demonstrates liquidation cluster detection and automated execution concepts using virtual funds for learning purposes.
        </AlertDescription>
      </Alert>
    </div>
  );
}