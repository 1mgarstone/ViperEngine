import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, DollarSign, Shield, Zap } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  email: string;
  paperBalance: string;
  liveBalance: string;
  isLiveMode: boolean;
  exchangeName?: string;
}

interface LiveTradingSwitchProps {
  userId: number;
}

export function LiveTradingSwitch({ userId }: LiveTradingSwitchProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [credentials, setCredentials] = useState({
    apiKey: "",
    apiSecret: "",
    apiPassphrase: "",
    exchangeName: ""
  });

  const { data: user } = useQuery<User>({
    queryKey: [`/api/user/${userId}`],
  });

  const toggleLiveMode = useMutation({
    mutationFn: async (isLive: boolean) => {
      return apiRequest(`/api/user/${userId}/toggle-live`, {
        method: "POST",
        body: JSON.stringify({ isLive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/${userId}`] });
      toast({
        title: user?.isLiveMode ? "Switched to Demo Mode" : "Switched to Live Mode",
        description: user?.isLiveMode 
          ? "Now using simulated trading with demo funds" 
          : "Now using real money trading - exercise caution!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to switch trading mode",
        variant: "destructive",
      });
    },
  });

  const updateCredentials = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/user/${userId}/exchange-credentials`, {
        method: "POST",
        body: JSON.stringify(credentials),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/${userId}`] });
      setShowCredentialsForm(false);
      setCredentials({ apiKey: "", apiSecret: "", apiPassphrase: "", exchangeName: "" });
      toast({
        title: "Credentials Updated",
        description: "Exchange API credentials have been securely saved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update exchange credentials",
        variant: "destructive",
      });
    },
  });

  const handleToggle = async (checked: boolean) => {
    if (checked && (!user?.exchangeName || !user?.apiKey)) {
      setShowCredentialsForm(true);
      return;
    }
    toggleLiveMode.mutate(checked);
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials.apiKey || !credentials.apiSecret || !credentials.exchangeName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    updateCredentials.mutate();
  };

  if (!user) return null;

  const currentBalance = user.isLiveMode ? user.liveBalance : user.paperBalance;
  const balanceLabel = user.isLiveMode ? "Live Balance" : "Demo Balance";

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          {user.isLiveMode ? (
            <>
              <Zap className="w-5 h-5 text-red-500" />
              Live Trading
            </>
          ) : (
            <>
              <Shield className="w-5 h-5 text-blue-500" />
              Demo Trading
            </>
          )}
        </CardTitle>
        <CardDescription>
          {user.isLiveMode 
            ? "Real money trading with live exchange integration"
            : "Risk-free simulation with virtual funds"
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm font-medium">{balanceLabel}</span>
          </div>
          <span className="text-lg font-bold">
            ${parseFloat(currentBalance).toLocaleString()}
          </span>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Trading Mode</Label>
            <p className="text-xs text-muted-foreground">
              {user.isLiveMode ? "Live trading active" : "Demo mode active"}
            </p>
          </div>
          <Switch
            checked={user.isLiveMode}
            onCheckedChange={handleToggle}
            disabled={toggleLiveMode.isPending}
          />
        </div>

        {/* Live Mode Warning */}
        {user.isLiveMode && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
            <div className="text-xs text-red-700 dark:text-red-400">
              <strong>Live Trading Active:</strong> Real funds are at risk. 
              Monitor trades carefully and ensure proper risk management.
            </div>
          </div>
        )}

        {/* Exchange Status */}
        {user.exchangeName && (
          <div className="text-xs text-muted-foreground">
            Connected to: <span className="font-medium capitalize">{user.exchangeName}</span>
          </div>
        )}

        {/* Setup Exchange Button */}
        {!user.exchangeName && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCredentialsForm(true)}
            className="w-full"
          >
            Setup Exchange Connection
          </Button>
        )}

        {/* Credentials Form */}
        {showCredentialsForm && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4 p-4 border rounded-lg">
            <div className="text-sm font-medium">Exchange API Credentials</div>
            
            <div className="space-y-2">
              <Label htmlFor="exchange">Exchange</Label>
              <Select 
                value={credentials.exchangeName} 
                onValueChange={(value) => setCredentials(prev => ({ ...prev, exchangeName: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select exchange" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="binance">Binance</SelectItem>
                  <SelectItem value="okx">OKX</SelectItem>
                  <SelectItem value="bybit">Bybit</SelectItem>
                  <SelectItem value="coinbase">Coinbase Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={credentials.apiKey}
                onChange={(e) => setCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Enter your API key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiSecret">API Secret</Label>
              <Input
                id="apiSecret"
                type="password"
                value={credentials.apiSecret}
                onChange={(e) => setCredentials(prev => ({ ...prev, apiSecret: e.target.value }))}
                placeholder="Enter your API secret"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiPassphrase">Passphrase (Optional)</Label>
              <Input
                id="apiPassphrase"
                type="password"
                value={credentials.apiPassphrase}
                onChange={(e) => setCredentials(prev => ({ ...prev, apiPassphrase: e.target.value }))}
                placeholder="Enter passphrase if required"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={updateCredentials.isPending}
                className="flex-1"
              >
                {updateCredentials.isPending ? "Saving..." : "Save Credentials"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCredentialsForm(false)}
              >
                Cancel
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Your API credentials are encrypted and stored securely. Only trading permissions are required.
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}