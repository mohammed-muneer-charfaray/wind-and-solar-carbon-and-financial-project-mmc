import React from 'react';
import { SystemParameters, FinancialParameters } from '../types';

interface InputFormProps {
  systemParams: SystemParameters;
  setSystemParams: React.Dispatch<React.SetStateAction<SystemParameters>>;
  financialParams: FinancialParameters;
  setFinancialParams: React.Dispatch<React.SetStateAction<FinancialParameters>>;
  onCalculate: () => void;
}

const InputForm: React.FC<InputFormProps> = ({
  systemParams,
  setSystemParams,
  financialParams,
  setFinancialParams,
  onCalculate
}) => {
  const handleSystemParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSystemParams(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };

  const handleFinancialParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFinancialParams(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">System Parameters</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Capacity (kW)
          </label>
          <input
            type="number"
            name="capacity"
            value={systemParams.capacity}
            onChange={handleSystemParamChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Efficiency (%)
          </label>
          <input
            type="number"
            name="efficiency"
            value={systemParams.efficiency}
            onChange={handleSystemParamChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Grid Emission Factor (kg CO₂/kWh)
          </label>
          <input
            type="number"
            name="gridEmissionFactor"
            value={systemParams.gridEmissionFactor}
            onChange={handleSystemParamChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Operational Lifetime (years)
          </label>
          <input
            type="number"
            name="operationalLifetime"
            value={systemParams.operationalLifetime}
            onChange={handleSystemParamChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cost per kW (R)
          </label>
          <input
            type="number"
            name="costPerKw"
            value={systemParams.costPerKw}
            onChange={handleSystemParamChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            System Size (kW)
          </label>
          <input
            type="number"
            name="systemSize"
            value={systemParams.systemSize}
            onChange={handleSystemParamChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Installation Cost (R)
          </label>
          <input
            type="number"
            name="installationCost"
            value={systemParams.installationCost}
            onChange={handleSystemParamChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Daily Production Hours
          </label>
          <input
            type="number"
            name="dailyProductionHours"
            value={systemParams.dailyProductionHours}
            onChange={handleSystemParamChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Degradation Rate (% per year)
          </label>
          <input
            type="number"
            name="degradationRate"
            value={systemParams.degradationRate}
            onChange={handleSystemParamChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Operational Costs (R per year)
          </label>
          <input
            type="number"
            name="operationalCosts"
            value={systemParams.operationalCosts}
            onChange={handleSystemParamChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Financial Parameters</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Electricity Price (R per kWh)
          </label>
          <input
            type="number"
            name="electricityPrice"
            value={financialParams.electricityPrice}
            onChange={handleFinancialParamChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Electricity Price Increase (% per year)
          </label>
          <input
            type="number"
            name="electricityPriceIncrease"
            value={financialParams.electricityPriceIncrease}
            onChange={handleFinancialParamChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Financing Years
          </label>
          <input
            type="number"
            name="financingYears"
            value={financialParams.financingYears}
            onChange={handleFinancialParamChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interest Rate (%)
          </label>
          <input
            type="number"
            name="interestRate"
            value={financialParams.interestRate}
            onChange={handleFinancialParamChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Inflation Rate (%)
          </label>
          <input
            type="number"
            name="inflationRate"
            value={financialParams.inflationRate}
            onChange={handleFinancialParamChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Discount Rate (%)
          </label>
          <input
            type="number"
            name="discountRate"
            value={financialParams.discountRate}
            onChange={handleFinancialParamChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-center mt-6">
        <button
          onClick={onCalculate}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Calculate Results
        </button>
      </div>
    </div>
  );
};

export default InputForm;