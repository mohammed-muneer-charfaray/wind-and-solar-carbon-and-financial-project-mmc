import React, { useEffect } from 'react';
import { ElectricityPrice } from '../types';
import { TrendingUp } from 'lucide-react';

interface ElectricityPricePredictionProps {
  prices: ElectricityPrice[];
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const ElectricityPricePrediction: React.FC<ElectricityPricePredictionProps> = ({ prices, canvasRef }) => {
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
    const values = prices.map(p => p.price);
    const maxValue = Math.max(...values) * 1.1; // Add 10% margin
    const minValue = 0; // Start from zero for better visualization

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
      const value = minValue + (maxValue - minValue) * i / numYLabels;
      const y = height - padding - (value - minValue) / (maxValue - minValue) * chartHeight;
      
      ctx.fillText(
        `R${value.toFixed(2)}`,
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
    
    const years = prices.map(p => p.year);
    const maxYear = Math.max(...years);
    const yearStep = Math.max(1, Math.ceil(maxYear / 10)); // Show at most 10 labels
    
    for (let year = 1; year <= maxYear; year += yearStep) {
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

    // Draw price line
    ctx.beginPath();
    ctx.strokeStyle = '#8b5cf6'; // Purple
    ctx.lineWidth = 3;
    
    prices.forEach((price, i) => {
      const x = padding + (price.year / maxYear) * chartWidth;
      const y = height - padding - (price.price - minValue) / (maxValue - minValue) * chartHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();

    // Add gradient fill under the line
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.1)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    
    // Start from the bottom left
    ctx.moveTo(padding, height - padding);
    
    // Draw the line again
    prices.forEach((price, i) => {
      const x = padding + (price.year / maxYear) * chartWidth;
      const y = height - padding - (price.price - minValue) / (maxValue - minValue) * chartHeight;
      
      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    // Complete the path to the bottom right
    ctx.lineTo(padding + chartWidth, height - padding);
    ctx.closePath();
    ctx.fill();

    // Draw data points
    prices.forEach((price) => {
      const x = padding + (price.year / maxYear) * chartWidth;
      const y = height - padding - (price.price - minValue) / (maxValue - minValue) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#8b5cf6';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Electricity Price Forecast (25 Years)', width / 2, 20);

  }, [prices]);

  // Calculate average annual increase
  const calculateAverageIncrease = () => {
    if (prices.length < 2) return 0;
    
    const firstPrice = prices[0].price;
    const lastPrice = prices[prices.length - 1].price;
    const years = prices.length - 1;
    
    // Calculate compound annual growth rate
    return (Math.pow(lastPrice / firstPrice, 1 / years) - 1) * 100;
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <TrendingUp className="h-6 w-6 mr-2" />
        Electricity Price Prediction
      </h2>
      
      <div className="w-full bg-white p-4 rounded-lg shadow-md">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={500} 
          className="w-full h-auto"
        />
        
        <div className="mt-4 p-4 bg-purple-50 rounded-lg">
          <h3 className="font-semibold text-purple-800">Price Forecast Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div>
              <p className="text-sm text-gray-600">Starting Price:</p>
              <p className="text-lg font-bold">
                R{prices[0]?.price.toFixed(2)}/kWh
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Final Price (Year {prices.length}):</p>
              <p className="text-lg font-bold">
                R{prices[prices.length - 1]?.price.toFixed(2)}/kWh
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Average Annual Increase:</p>
              <p className="text-lg font-bold">
                {calculateAverageIncrease().toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 w-full">
        <h3 className="text-lg font-semibold mb-3">Electricity Price Data</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b text-left">Year</th>
                <th className="py-2 px-4 border-b text-right">Price (R/kWh)</th>
                <th className="py-2 px-4 border-b text-right">Increase from Previous</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((price, index) => (
                <tr key={price.year} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">Year {price.year}</td>
                  <td className="py-2 px-4 border-b text-right">
                    R{price.price.toFixed(2)}
                  </td>
                  <td className="py-2 px-4 border-b text-right">
                    {index === 0 ? '-' : (
                      `${((price.price / prices[index - 1].price - 1) * 100).toFixed(2)}%`
                    )}
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

export default ElectricityPricePrediction;