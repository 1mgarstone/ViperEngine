export interface RiskMetrics {
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;
}

export function calculatePositionSize(
  accountBalance: number,
  riskPercentage: number,
  entryPrice: number,
  stopLossPrice: number
): number {
  const riskAmount = accountBalance * (riskPercentage / 100);
  const riskPerShare = Math.abs(entryPrice - stopLossPrice);
  return riskAmount / riskPerShare;
}

export function calculatePnL(
  side: 'buy' | 'sell',
  entryPrice: number,
  currentPrice: number,
  quantity: number
): number {
  if (side === 'buy') {
    return (currentPrice - entryPrice) * quantity;
  } else {
    return (entryPrice - currentPrice) * quantity;
  }
}

export function calculatePnLPercentage(
  side: 'buy' | 'sell',
  entryPrice: number,
  currentPrice: number
): number {
  if (side === 'buy') {
    return ((currentPrice - entryPrice) / entryPrice) * 100;
  } else {
    return ((entryPrice - currentPrice) / entryPrice) * 100;
  }
}

export function formatCurrency(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatPercentage(percentage: number, decimals: number = 2): string {
  return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(decimals)}%`;
}

export function calculateRiskRewardRatio(
  entryPrice: number,
  stopLossPrice: number,
  takeProfitPrice: number
): number {
  const risk = Math.abs(entryPrice - stopLossPrice);
  const reward = Math.abs(takeProfitPrice - entryPrice);
  return reward / risk;
}

export function validateOrderParameters(
  orderType: string,
  side: 'buy' | 'sell',
  quantity: number,
  price?: number,
  currentPrice?: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (quantity <= 0) {
    errors.push("Quantity must be greater than 0");
  }

  if (orderType === 'limit' && (!price || price <= 0)) {
    errors.push("Limit orders require a valid price");
  }

  if (orderType === 'limit' && price && currentPrice) {
    if (side === 'buy' && price > currentPrice * 1.1) {
      errors.push("Buy limit price is significantly above market price");
    }
    if (side === 'sell' && price < currentPrice * 0.9) {
      errors.push("Sell limit price is significantly below market price");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function calculatePortfolioMetrics(trades: any[]): RiskMetrics {
  if (trades.length === 0) {
    return {
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      avgProfit: 0,
      avgLoss: 0,
      profitFactor: 0,
    };
  }

  const profits = trades.filter(t => parseFloat(t.pnl || '0') > 0);
  const losses = trades.filter(t => parseFloat(t.pnl || '0') < 0);
  
  const winRate = (profits.length / trades.length) * 100;
  
  const avgProfit = profits.length > 0 
    ? profits.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0) / profits.length 
    : 0;
    
  const avgLoss = losses.length > 0 
    ? Math.abs(losses.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0) / losses.length)
    : 0;

  const totalProfit = profits.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0);
  const totalLoss = Math.abs(losses.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0));
  
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;

  // Calculate running balance for drawdown
  let runningBalance = 100000; // Starting balance
  let peak = runningBalance;
  let maxDrawdown = 0;

  for (const trade of trades) {
    runningBalance += parseFloat(trade.pnl || '0');
    if (runningBalance > peak) {
      peak = runningBalance;
    }
    const drawdown = (peak - runningBalance) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  // Simplified Sharpe ratio calculation
  const returns = trades.map(t => parseFloat(t.pnl || '0') / 100000); // Assuming base of 100k
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  );
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

  return {
    sharpeRatio,
    maxDrawdown: maxDrawdown * 100,
    winRate,
    avgProfit,
    avgLoss,
    profitFactor,
  };
}
