import React from 'react';
import { EnergyGeneration } from '../types';
import { Sun, Calendar, BarChart } from 'lucide-react';

interface EnergyGenerationTableProps {
  data: EnergyGeneration;
}

const EnergyGenerationTable: React.FC<EnergyGenerationTableProps> = ({ data }) => {
  const formatEnergy = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)} GWh`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)} MWh`;
    } else {
      return `${value.toFixed(2)} kWh`;
    }
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-bold mb-6 text-center">Energy Generation Prediction</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-yellow-100 rounded-full mr-4">
              <Sun className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Daily Output</h3>
          </div>
          <p className="text-3xl font-bold">{formatEnergy(data.daily)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full mr-4">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Monthly Output</h3>
          </div>
          <p className="text-3xl font-bold">{formatEnergy(data.monthly)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-green-100 rounded-full mr-4">
              <BarChart className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Yearly Output</h3>
          </div>
          <p className="text-3xl font-bold">{formatEnergy(data.yearly)}</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold">Lifetime Energy Production</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left font-semibold text-gray-700 border-b">Year</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-700 border-b">Energy Production</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-700 border-b">Cumulative Production</th>
              </tr>
            </thead>
            <tbody>
              {data.lifetime.map((yearData, index) => {
                // Calculate cumulative energy up to this year
                const cumulativeEnergy = data.lifetime
                  .slice(0, index + 1)
                  .reduce((sum, year) => sum + year.energy, 0);
                
                return (
                  <tr key={yearData.year} className="hover:bg-gray-50">
                    <td className="py-3 px-4 border-b">Year {yearData.year}</td>
                    <td className="py-3 px-4 text-right border-b">
                      {formatEnergy(yearData.energy)}
                    </td>
                    <td className="py-3 px-4 text-right border-b">
                      {formatEnergy(cumulativeEnergy)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td className="py-3 px-4 font-semibold">Total (Lifetime)</td>
                <td className="py-3 px-4 text-right font-semibold">
                  {formatEnergy(data.lifetime.reduce((sum, year) => sum + year.energy, 0))}
                </td>
                <td className="py-3 px-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EnergyGenerationTable;