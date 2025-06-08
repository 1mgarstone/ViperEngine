import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface OrderFormProps {
  selectedAsset: string;
  assetData?: any;
  userBalance?: string;
}

export function OrderForm({ selectedAsset, assetData, userBalance }: OrderFormProps) {
  const [orderType, setOrderType] = useState("market");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Order Placed Successfully",
        description: `${side.toUpperCase()} order for ${quantity} ${selectedAsset} has been placed in simulation mode.`,
      });
      
      // Reset form
      setQuantity("");
      setPrice("");
      setStopLoss("");
      setTakeProfit("");
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/orders/1"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/1"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/1"] });
    },
    onError: (error: any) => {
      toast({
        title: "Order Failed",
        description: error.message || "Failed to place order",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quantity || parseFloat(quantity) <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity",
        variant: "destructive",
      });
      return;
    }

    if (orderType !== "market" && (!price || parseFloat(price) <= 0)) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price for limit orders",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      userId: 1,
      assetId: getAssetId(selectedAsset),
      type: orderType,
      side,
      quantity: parseFloat(quantity).toFixed(8),
      price: orderType === "market" ? null : parseFloat(price).toFixed(8),
      stopPrice: stopLoss ? parseFloat(stopLoss).toFixed(8) : null,
      takeProfitPrice: takeProfit ? parseFloat(takeProfit).toFixed(8) : null,
    };

    createOrderMutation.mutate(orderData);
  };

  const getAssetId = (symbol: string) => {
    const assetMap: { [key: string]: number } = {
      "BTC": 1,
      "ETH": 2,
      "ADA": 3,
    };
    return assetMap[symbol] || 1;
  };

  const currentPrice = assetData ? parseFloat(assetData.currentPrice) : 0;
  const estimatedTotal = parseFloat(quantity || "0") * (orderType === "market" ? currentPrice : parseFloat(price || "0"));
  const availableBalance = parseFloat(userBalance || "0");

  return (
    <Card className="trading-bg-slate border-gray-700">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <CardTitle className="text-white">Paper Trading</CardTitle>
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
            DEMO
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Buy/Sell Toggle */}
          <div className="flex space-x-2">
            <Button
              type="button"
              className={`flex-1 ${side === 'buy' ? 'bg-trading-green hover:bg-trading-green/80' : 'bg-gray-600 hover:bg-gray-500'}`}
              onClick={() => setSide('buy')}
            >
              BUY
            </Button>
            <Button
              type="button"
              className={`flex-1 ${side === 'sell' ? 'bg-trading-red hover:bg-trading-red/80' : 'bg-gray-600 hover:bg-gray-500'}`}
              onClick={() => setSide('sell')}
            >
              SELL
            </Button>
          </div>

          {/* Order Type */}
          <div className="space-y-2">
            <Label className="text-gray-300">Order Type</Label>
            <Select value={orderType} onValueChange={setOrderType}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market Order</SelectItem>
                <SelectItem value="limit">Limit Order</SelectItem>
                <SelectItem value="stop_loss">Stop Loss</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Asset Selection */}
          <div className="space-y-2">
            <Label className="text-gray-300">Asset</Label>
            <div className="flex items-center space-x-2 p-3 bg-gray-700 rounded-lg">
              <span className="font-medium text-white">{selectedAsset}/USDT</span>
              {assetData && (
                <Badge variant="secondary" className={
                  parseFloat(assetData.change24h) >= 0 ? 'bg-trading-green text-white' : 'bg-trading-red text-white'
                }>
                  {parseFloat(assetData.change24h) >= 0 ? '+' : ''}{parseFloat(assetData.change24h).toFixed(2)}%
                </Badge>
              )}
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label className="text-gray-300">Amount ({selectedAsset})</Label>
            <Input
              type="number"
              step="0.00000001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.001"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {/* Price (for limit orders) */}
          {orderType !== "market" && (
            <div className="space-y-2">
              <Label className="text-gray-300">Price (USDT)</Label>
              <Input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={currentPrice.toFixed(2)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          )}

          {/* Stop Loss */}
          <div className="space-y-2">
            <Label className="text-gray-300">Stop Loss (USDT) - Optional</Label>
            <Input
              type="number"
              step="0.01"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="Auto-calculate"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {/* Take Profit */}
          <div className="space-y-2">
            <Label className="text-gray-300">Take Profit (USDT) - Optional</Label>
            <Input
              type="number"
              step="0.01"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="Auto-calculate"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {/* Order Summary */}
          <div className="space-y-2 p-3 bg-gray-700 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Estimated Total:</span>
              <span className="text-white font-mono">
                ${estimatedTotal.toFixed(2)} USDT
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Available Balance:</span>
              <span className="text-white font-mono">
                ${availableBalance.toFixed(2)} USDT
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className={`w-full py-3 font-semibold ${
              side === 'buy' 
                ? 'bg-trading-green hover:bg-trading-green/80' 
                : 'bg-trading-red hover:bg-trading-red/80'
            }`}
            disabled={createOrderMutation.isPending}
          >
            {createOrderMutation.isPending ? 'Placing Order...' : `Place ${side.toUpperCase()} Order (Simulation)`}
          </Button>

          {/* Educational Notice */}
          <Alert className="border-blue-500/30 bg-blue-500/10">
            <AlertDescription className="text-blue-400 text-sm">
              <strong>Simulation Mode:</strong> This order will be executed with virtual funds only. 
              No real cryptocurrency trading occurs.
            </AlertDescription>
          </Alert>
        </form>
      </CardContent>
    </Card>
  );
}
