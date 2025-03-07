import React, { useEffect } from 'react';
import { CarbonReduction } from '../types';
import { Leaf, Factory } from 'lucide-react';

interface CarbonReductionChartProps {
  data: CarbonReduction;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const CarbonReductionChart: React.FC<CarbonReductionChartProps> = ({ data, canvasRef }) => {
  const formatCarbon = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M kg`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}k kg`;
    }
    return `${value.toFixed(2)} kg`;
  };

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

    // Find max value for scaling
    const values = data.yearlyReduction.map(yr => yr.reduction);
    const maxValue = Math.max(...values) * 1.1; // Add 10% margin

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

    // Draw y-axis labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    const numYLabels = 5;
    for (let i = 0; i <= numYLabels; i++) {
      const value = (maxValue * i) / numYLabels;
      const y = height - padding - (value / maxValue) * chartHeight;
      
      ctx.fillText(formatCarbon(value), padding - 10, y);
      
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
    
    const years = data.yearlyReduction.map(yr => yr.year);
    const maxYear = Math.max(...years);
    const yearStep = Math.max(1, Math.ceil(maxYear / 10)); // Show at most 10 labels
    
    for (let year = 1; year <= maxYear; year += yearStep) {
      const x = padding + ((year - 1) / (maxYear - 1)) * chartWidth;
      
      ctx.fillText(`Year ${year}`, x, height - padding + 10);
      
      // Draw grid line
      ctx.beginPath();
      ctx.strokeStyle = '#eee';
      ctx.lineWidth = 1;
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Draw bars
    const barWidth = chartWidth / data.yearlyReduction.length * 0.7;
    const barSpacing = chartWidth / data.yearlyReduction.length * 0.3;
    
    data.yearlyReduction.forEach((yearData, i) => {
      const x = padding + i * (barWidth + barSpacing) + barSpacing / 2;
      const barHeight = (yearData.reduction / maxValue) * chartHeight;
      const y = height - padding - barHeight;
      
      // Create gradient for bar
      const gradient = ctx.createLinearGradient(x, y, x, height - padding);
      gradient.addColorStop(0, '#10b981'); // Green at top
      gradient.addColorStop(1, '#34d399'); // Lighter green at bottom
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Add border to bar
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barWidth, barHeight);
    });

    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Carbon Reduction vs Coal Power Generation', width / 2, 20);

  }, [data]);

  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-bold mb-6 text-center flex items-center justify-center">
        <Leaf className="h-6 w-6 mr-2 text-green-600" />
        Carbon Reduction Estimation
      </h2>
      
      <div className="w-full bg-white p-4 rounded-lg shadow-md">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={500} 
          className="w-full h-auto"
        />
        
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
          <span className="text-sm">CO₂ Reduction Compared to Coal Power Generation</span>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">Environmental Impact</h4>
          <p className="text-sm text-gray-700">
            This renewable energy system will prevent approximately {formatCarbon(data.lifetime)} of CO₂ emissions 
            over its {data.yearlyReduction.length}-year lifetime compared to coal power generation. 
            This is equivalent to:
          </p>
          
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            <li className="flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-green-600 mr-2"></span>
              Planting approximately {Math.round(data.lifetime / 21.7)} trees
            </li>
            <li className="flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-green-600 mr-2"></span>
              Taking about {Math.round(data.lifetime / 4600)} cars off the road for the entire system lifetime
            </li>
            <li className="flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-green-600 mr-2"></span>
              Avoiding the burning of approximately {Math.round(data.lifetime / 2.42)} kg of coal
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CarbonReductionChart;