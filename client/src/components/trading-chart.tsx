import { useEffect, useRef } from "react";

interface TradingChartProps {
  symbol: string;
  currentPrice?: string;
}

export function TradingChart({ symbol, currentPrice }: TradingChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = chartRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Generate sample price data
    const basePrice = parseFloat(currentPrice || '43250');
    const dataPoints = 50;
    const priceData = [];
    
    for (let i = 0; i < dataPoints; i++) {
      const variance = (Math.random() - 0.5) * 2000;
      priceData.push(basePrice + variance);
    }

    // Draw grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = (canvas.width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let i = 0; i <= 8; i++) {
      const y = (canvas.height / 8) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw price line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const minPrice = Math.min(...priceData);
    const maxPrice = Math.max(...priceData);
    const priceRange = maxPrice - minPrice;

    priceData.forEach((price, index) => {
      const x = (canvas.width / (dataPoints - 1)) * index;
      const y = canvas.height - ((price - minPrice) / priceRange) * canvas.height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw current price indicator
    if (currentPrice) {
      const currentY = canvas.height - ((basePrice - minPrice) / priceRange) * canvas.height;
      
      // Price line
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, currentY);
      ctx.lineTo(canvas.width, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label
      ctx.fillStyle = '#3b82f6';
      ctx.font = '12px Inter';
      ctx.fillText(`$${parseFloat(currentPrice).toFixed(2)}`, 10, currentY - 5);
    }

  }, [symbol, currentPrice]);

  return (
    <div className="h-80 bg-gray-800 rounded-lg relative">
      <canvas
        ref={chartRef}
        className="w-full h-full rounded-lg"
        style={{ width: '100%', height: '100%' }}
      />
      <div className="absolute bottom-4 left-4 bg-gray-700 px-3 py-1 rounded text-sm text-gray-300">
        <i className="fas fa-info-circle mr-2"></i>
        Simulated Market Data
      </div>
    </div>
  );
}
