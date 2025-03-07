import React, { useEffect } from 'react';
import { YearlyCashFlow } from '../types';
import { LineChart, BarChart3 } from 'lucide-react';

interface InvestmentGraphProps {
  cashFlows: YearlyCashFlow[];
  paybackPeriod: number;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const InvestmentGraph: React.FC<InvestmentGraphProps> = ({ cashFlows, paybackPeriod, canvasRef }) => {
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas dimensions
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Find min and max values for scaling
    const values = cashFlows.map(cf => cf.cumulativeCashFlow);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values, 0);
    const valueRange = maxValue - minValue;

    // Draw axes
    ctx.beginPath();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    // Y-axis
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    
    // X-axis
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw zero line if needed
    if (minValue < 0) {
      const zeroY = height - padding - (0 - minValue) / valueRange * chartHeight;
      ctx.beginPath();
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.moveTo(padding, zeroY);
      ctx.lineTo(width - padding, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw y-axis labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    const numYLabels = 5;
    for (let i = 0; i <= numYLabels; i++) {
      const value = minValue + (valueRange * i) / numYLabels;
      const y = height - padding - (value - minValue) / valueRange * chartHeight;
      
      ctx.fillText(
        new Intl.NumberFormat('en-ZA', {
          style: 'currency',
          currency: 'ZAR',
          notation: 'compact',
          maximumFractionDigits: 1
        }).format(value),
        padding - 10,
        y
      );
      
      // Draw grid line
      ctx.beginPath();
      ctx.strokeStyle = '#eee';
      ctx.lineWidth = 1;
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw x-axis labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    const years = cashFlows.map(cf => cf.year);
    const maxYear = Math.max(...years);
    const yearStep = Math.max(1, Math.ceil(maxYear / 10)); // Show at most 10 labels
    
    for (let year = 0; year <= maxYear; year += yearStep) {
      const x = padding + (year / maxYear) * chartWidth;
      
      ctx.fillText(`Year ${year}`, x, height - padding + 10);
      
      // Draw grid line
      ctx.beginPath();
      ctx.strokeStyle = '#eee';
      ctx.lineWidth = 1;
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Draw cumulative cash flow line
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6'; // Blue
    ctx.lineWidth = 3;
    
    cashFlows.forEach((cf, i) => {
      const x = padding + (cf.year / maxYear) * chartWidth;
      const y = height - padding - (cf.cumulativeCashFlow - minValue) / valueRange * chartHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();

    // Highlight payback period with red for negative cash flow
    ctx.beginPath();
    ctx.strokeStyle = '#ef4444'; // Red
    ctx.lineWidth = 3;
    
    let lastNegativeIndex = 0;
    
    for (let i = 0; i < cashFlows.length; i++) {
      const cf = cashFlows[i];
      if (cf.cumulativeCashFlow < 0) {
        const x = padding + (cf.year / maxYear) * chartWidth;
        const y = height - padding - (cf.cumulativeCashFlow - minValue) / valueRange * chartHeight;
        
        if (i === 0 || cashFlows[i-1].cumulativeCashFlow >= 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        lastNegativeIndex = i;
      }
    }
    
    // If there's a transition from negative to positive, draw to that point
    if (lastNegativeIndex < cashFlows.length - 1 && cashFlows[lastNegativeIndex + 1].cumulativeCashFlow >= 0) {
      const cf1 = cashFlows[lastNegativeIndex];
      const cf2 = cashFlows[lastNegativeIndex + 1];
      
      // Find the exact payback point (linear interpolation)
      const ratio = Math.abs(cf1.cumulativeCashFlow) / (cf2.cumulativeCashFlow - cf1.cumulativeCashFlow);
      const paybackYear = cf1.year + ratio;
      
      const x = padding + (paybackYear / maxYear) * chartWidth;
      const y = height - padding - (0 - minValue) / valueRange * chartHeight;
      
      ctx.lineTo(x, y);
    }
    
    ctx.stroke();

    // Draw payback period marker
    if (paybackPeriod > 0) {
      const paybackX = padding + (paybackPeriod / maxYear) * chartWidth;
      const paybackY = height - padding - (0 - minValue) / valueRange * chartHeight;
      
      ctx.beginPath();
      ctx.arc(paybackX, paybackY, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#10b981'; // Green
      ctx.fill();
      
      // Draw payback period label
      ctx.fillStyle = '#333';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`Payback: ${paybackPeriod.toFixed(1)} years`, paybackX, paybackY - 10);
    }

    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Investment Analysis', width / 2, 20);

  }, [cashFlows, paybackPeriod]);

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <LineChart className="h-6 w-6 mr-2" />
        Investment Analysis
      </h2>
      
      <div className="w-full bg-white p-4 rounded-lg shadow-md">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={500} 
          className="w-full h-auto"
        />
        
        <div className="mt-4 flex items-center justify-center space-x-6">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 rounded-sm mr-2"></div>
            <span className="text-sm">Cumulative Cash Flow</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded-sm mr-2"></div>
            <span className="text-sm">Negative Cash Flow Period</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm">Payback Point</span>
          </div>
        </div>
      </div>
      
      <div className="mt-6 w-full">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Investment Summary
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b text-left">Year</th>
                <th className="py-2 px-4 border-b text-right">Cash Flow (R)</th>
                <th className="py-2 px-4 border-b text-right">Cumulative Cash Flow (R)</th>
              </tr>
            </thead>
            <tbody>
              {cashFlows.map((cf) => (
                <tr key={cf.year} className={cf.cumulativeCashFlow < 0 ? "bg-red-50" : "hover:bg-gray-50"}>
                  <td className="py-2 px-4 border-b">{cf.year}</td>
                  <td className={`py-2 px-4 border-b text-right ${cf.cashFlow < 0 ? "text-red-600" : "text-green-600"}`}>
                    {new Intl.NumberFormat('en-ZA', {
                      style: 'currency',
                      currency: 'ZAR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(cf.cashFlow)}
                  </td>
                  <td className={`py-2 px-4 border-b text-right ${cf.cumulativeCashFlow < 0 ? "text-red-600" : "text-green-600"}`}>
                    {new Intl.NumberFormat('en-ZA', {
                      style: 'currency',
                      currency: 'ZAR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(cf.cumulativeCashFlow)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvestmentGraph;