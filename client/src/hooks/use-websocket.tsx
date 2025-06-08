import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface MarketData {
  id: number;
  symbol: string;
  name: string;
  currentPrice: string;
  change24h: string;
  volume24h: string;
}

interface BalanceUpdate {
  userId: number;
  newBalance: number;
  profit: number;
  trade: string;
  leverage?: number;
  clusterValue?: number;
}

interface UseWebSocketReturn {
  marketData: MarketData[] | null;
  isConnected: boolean;
  connectionError: string | null;
  liveBalance: number | null;
}

export function useWebSocket(): UseWebSocketReturn {
  const [marketData, setMarketData] = useState<MarketData[] | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [liveBalance, setLiveBalance] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  const connect = () => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setConnectionError(null);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'market_data' || message.type === 'price_update') {
            setMarketData(message.data);
          } else if (message.type === 'balance_update') {
            // Immediately refresh user data when balance updates from VIPER trades
            const balanceUpdate: BalanceUpdate = message.data;
            console.log(`💰 Live Update: +$${balanceUpdate.profit.toFixed(2)} profit on ${balanceUpdate.trade}`);
            
            // Update local state immediately for instant UI updates
            setLiveBalance(balanceUpdate.newBalance);
            
            // Force cache invalidation and immediate refetch for all user-related data
            queryClient.invalidateQueries({ queryKey: ["/api/user/1"] });
            queryClient.invalidateQueries({ queryKey: ["/api/viper-trades/1"] });
            queryClient.invalidateQueries({ queryKey: ["/api/viper-performance/1"] });
            queryClient.invalidateQueries({ queryKey: ["/api/portfolio/1"] });
            
            // Force immediate refetch to bypass cache
            queryClient.refetchQueries({ queryKey: ["/api/user/1"] });
            queryClient.refetchQueries({ queryKey: ["/api/viper-trades/1"] });
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        if (!event.wasClean) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("Attempting to reconnect...");
            connect();
          }, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionError("Connection failed");
        setIsConnected(false);
      };

    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setConnectionError("Failed to connect");
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
      }
    };
  }, []);

  return {
    marketData,
    isConnected,
    connectionError,
    liveBalance,
  };
}
