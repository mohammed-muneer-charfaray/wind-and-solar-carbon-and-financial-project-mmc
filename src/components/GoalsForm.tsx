import React, { useState } from 'react';
import { Target, Calculator } from 'lucide-react';
import { calculateSystemParameters } from '../utils/calculations';

interface GoalsFormProps {
  onCalculate: (capacity: number, systemSize: number) => void;
}

const GoalsForm: React.FC<GoalsFormProps> = ({ onCalculate }) => {
  const [selectedMetric, setSelectedMetric] = useState<string>('daily');
  const [value, setValue] = useState<string>('');
  const [results, setResults] = useState<{
    calculatedCapacity: number;
    calculatedSystemSize: number;
  } | null>(null);

  const handleCalculate = () => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue <= 0) return;

    let dailyEnergy = 0;
    let monthlyEnergy = 0;
    let yearlyEnergy = 0;
    let yearlyCarbon = 0;

    switch (selectedMetric) {
      case 'daily':
        dailyEnergy = numericValue;
        monthlyEnergy = numericValue * 30;
        yearlyEnergy = numericValue * 365;
        yearlyCarbon = yearlyEnergy * 0.95;
        break;
      case 'monthly':
        dailyEnergy = numericValue / 30;
        monthlyEnergy = numericValue;
        yearlyEnergy = numericValue * 12;
        yearlyCarbon = yearlyEnergy * 0.95;
        break;
      case 'yearly':
        dailyEnergy = numericValue / 365;
        monthlyEnergy = numericValue / 12;
        yearlyEnergy = numericValue;
        yearlyCarbon = yearlyEnergy * 0.95;
        break;
      case 'carbon':
        yearlyCarbon = numericValue;
        yearlyEnergy = yearlyCarbon / 0.95;
        monthlyEnergy = yearlyEnergy / 12;
        dailyEnergy = yearlyEnergy / 365;
        break;
    }

    const calculatedParams = calculateSystemParameters(
      dailyEnergy,
      monthlyEnergy,
      yearlyEnergy,
      yearlyCarbon,
      0.95,
      5
    );

    setResults(calculatedParams);
    onCalculate(calculatedParams.calculatedCapacity, calculatedParams.calculatedSystemSize);
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <Target className="h-6 w-6 mr-2" />
        Set System Goals
      </h2>

      <div className="w-full max-w-2xl bg-white p-6 rounded-lg shadow-md">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What would you like to achieve?
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              className={`p-4 rounded-lg border ${
                selectedMetric === 'daily'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedMetric('daily')}
            >
              Daily Energy
            </button>
            <button
              className={`p-4 rounded-lg border ${
                selectedMetric === 'monthly'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedMetric('monthly')}
            >
              Monthly Energy
            </button>
            <button
              className={`p-4 rounded-lg border ${
                selectedMetric === 'yearly'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedMetric('yearly')}
            >
              Yearly Energy
            </button>
            <button
              className={`p-4 rounded-lg border ${
                selectedMetric === 'carbon'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedMetric('carbon')}
            >
              Carbon Reduction
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Value
          </label>
          <div className="flex space-x-4">
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder={
                selectedMetric === 'daily'
                  ? 'Daily energy in kWh'
                  : selectedMetric === 'monthly'
                  ? 'Monthly energy in kWh'
                  : selectedMetric === 'yearly'
                  ? 'Yearly energy in kWh'
                  : 'Yearly CO₂ reduction in kg'
              }
            />
            <button
              onClick={handleCalculate}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center"
            >
              <Calculator className="h-5 w-5 mr-2" />
              Calculate
            </button>
          </div>
        </div>

        {results && (
          <div className="mt-6 p-6 bg-green-50 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-4">Recommended System Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">System Capacity</p>
                <p className="text-2xl font-bold text-green-700">{results.calculatedCapacity.toFixed(2)} kW</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">System Size</p>
                <p className="text-2xl font-bold text-green-700">{results.calculatedSystemSize.toFixed(2)} kW</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalsForm;