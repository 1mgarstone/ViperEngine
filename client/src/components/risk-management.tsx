import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface RiskManagementProps {
  userId: number;
}

export function RiskManagement({ userId }: RiskManagementProps) {
  const [maxPositionSize, setMaxPositionSize] = useState([15]);
  const [stopLossPercentage, setStopLossPercentage] = useState([5]);
  const [takeProfitPercentage, setTakeProfitPercentage] = useState([25]);
  const [maxDailyLoss, setMaxDailyLoss] = useState("1000");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current risk settings
  const { data: riskSettings } = useQuery({
    queryKey: [`/api/risk-settings/${userId}`],
  });

  // Update state when risk settings are loaded
  useEffect(() => {
    if (riskSettings) {
      setMaxPositionSize([parseFloat(riskSettings.maxPositionSize || "15")]);
      setStopLossPercentage([parseFloat(riskSettings.stopLossPercentage || "5")]);
      setTakeProfitPercentage([parseFloat(riskSettings.takeProfitPercentage || "25")]);
      setMaxDailyLoss(riskSettings.maxDailyLoss || "1000");
    }
  }, [riskSettings]);

  // Update risk settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settingsData: any) => {
      const response = await apiRequest("PUT", "/api/risk-settings", settingsData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Risk Settings Updated",
        description: "Your risk management settings have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/risk-settings/${userId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update risk settings",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const settingsData = {
      userId,
      maxPositionSize: maxPositionSize[0].toFixed(2),
      stopLossPercentage: stopLossPercentage[0].toFixed(2),
      takeProfitPercentage: takeProfitPercentage[0].toFixed(2),
      maxDailyLoss: parseFloat(maxDailyLoss).toFixed(8),
    };

    updateSettingsMutation.mutate(settingsData);
  };

  // Calculate risk score based on settings
  const calculateRiskScore = () => {
    const positionWeight = (maxPositionSize[0] / 50) * 30; // Max 30 points
    const stopLossWeight = ((20 - stopLossPercentage[0]) / 20) * 40; // Max 40 points
    const dailyLossWeight = (parseFloat(maxDailyLoss) / 5000) * 30; // Max 30 points
    
    return Math.min(100, positionWeight + stopLossWeight + dailyLossWeight);
  };

  const riskScore = calculateRiskScore();
  const riskLevel = riskScore < 30 ? "Low" : riskScore < 70 ? "Medium" : "High";
  const riskColor = riskScore < 30 ? "text-trading-green" : riskScore < 70 ? "text-trading-yellow" : "text-trading-red";

  return (
    <Card className="trading-bg-slate border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Risk Management</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Risk Score Display */}
          <div className="p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Portfolio Risk Score</span>
              <span className={`font-semibold ${riskColor}`}>{riskLevel}</span>
            </div>
            <Progress value={riskScore} className="mb-2" />
            <div className="text-center">
              <span className={`text-2xl font-bold ${riskColor}`}>
                {riskScore.toFixed(1)}/100
              </span>
            </div>
          </div>

          {/* Max Position Size */}
          <div className="space-y-3">
            <Label className="text-gray-300">
              Max Position Size: {maxPositionSize[0]}%
            </Label>
            <Slider
              value={maxPositionSize}
              onValueChange={setMaxPositionSize}
              max={50}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>1% (Conservative)</span>
              <span>50% (Aggressive)</span>
            </div>
          </div>

          {/* Stop Loss Percentage */}
          <div className="space-y-3">
            <Label className="text-gray-300">
              Default Stop Loss: {stopLossPercentage[0]}%
            </Label>
            <Slider
              value={stopLossPercentage}
              onValueChange={setStopLossPercentage}
              max={20}
              min={1}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>1% (Tight)</span>
              <span>20% (Loose)</span>
            </div>
          </div>

          {/* Take Profit Percentage */}
          <div className="space-y-3">
            <Label className="text-gray-300">
              Default Take Profit: {takeProfitPercentage[0]}%
            </Label>
            <Slider
              value={takeProfitPercentage}
              onValueChange={setTakeProfitPercentage}
              max={100}
              min={5}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>5% (Conservative)</span>
              <span>100% (Aggressive)</span>
            </div>
          </div>

          {/* Max Daily Loss */}
          <div className="space-y-2">
            <Label className="text-gray-300">Max Daily Loss (USDT)</Label>
            <Input
              type="number"
              value={maxDailyLoss}
              onChange={(e) => setMaxDailyLoss(e.target.value)}
              placeholder="1000"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {/* Risk Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-700 rounded">
              <p className="text-gray-400 text-sm mb-1">Win Rate Target</p>
              <p className="text-white font-semibold">68%</p>
            </div>
            <div className="p-3 bg-gray-700 rounded">
              <p className="text-gray-400 text-sm mb-1">Risk/Reward Ratio</p>
              <p className="text-white font-semibold">
                1:{(takeProfitPercentage[0] / stopLossPercentage[0]).toFixed(1)}
              </p>
            </div>
          </div>

          {/* Risk Warnings */}
          {riskScore > 70 && (
            <Alert className="border-trading-red bg-red-900/20">
              <AlertDescription className="text-trading-red">
                <strong>High Risk Warning:</strong> Your current settings indicate aggressive risk-taking. 
                Consider reducing position sizes or tightening stop losses.
              </AlertDescription>
            </Alert>
          )}

          {riskScore < 30 && (
            <Alert className="border-trading-green bg-green-900/20">
              <AlertDescription className="text-trading-green">
                <strong>Conservative Setup:</strong> Your risk settings are conservative, which is great for learning. 
                You can gradually increase risk as you gain experience.
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-trading-blue hover:bg-blue-600"
            disabled={updateSettingsMutation.isPending}
          >
            {updateSettingsMutation.isPending ? 'Updating...' : 'Apply Risk Settings'}
          </Button>

          {/* Educational Note */}
          <Alert className="border-blue-500/30 bg-blue-500/10">
            <AlertDescription className="text-blue-400 text-sm">
              <strong>Educational Platform:</strong> These settings help you practice proper risk management 
              in simulation mode. Always use appropriate risk controls in real trading.
            </AlertDescription>
          </Alert>
        </form>
      </CardContent>
    </Card>
  );
}
