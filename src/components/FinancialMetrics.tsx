import React from 'react';
import { FinancialMetrics as FinancialMetricsType } from '../types';

interface FinancialMetricsProps {
  metrics: FinancialMetricsType;
}

const FinancialMetrics: React.FC<FinancialMetricsProps> = ({ metrics }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatNumber = (value: number, decimals = 2) => {
    return value.toFixed(decimals);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-center">Financial Metrics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-2 text-blue-600">Net Present Value (NPV)</h3>
          <p className="text-3xl font-bold">{formatCurrency(metrics.npv)}</p>
          <p className="text-sm text-gray-600 mt-2">
            The present value of all future cash flows over the entire lifetime of the investment.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-2 text-blue-600">Internal Rate of Return (IRR)</h3>
          <p className="text-3xl font-bold">{formatPercentage(metrics.irr)}</p>
          <p className="text-sm text-gray-600 mt-2">
            The annual rate of growth that an investment is expected to generate.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-2 text-blue-600">Payback Period</h3>
          <p className="text-3xl font-bold">{formatNumber(metrics.paybackPeriod)} years</p>
          <p className="text-sm text-gray-600 mt-2">
            The time required to recover the cost of an investment.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-2 text-blue-600">Return on Investment (ROI)</h3>
          <p className="text-3xl font-bold">{formatPercentage(metrics.roi)}</p>
          <p className="text-sm text-gray-600 mt-2">
            A performance measure used to evaluate the efficiency of an investment.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-2 text-blue-600">Levelized Cost of Energy (LCOE)</h3>
          <p className="text-3xl font-bold">R{formatNumber(metrics.lcoe)}/kWh</p>
          <p className="text-sm text-gray-600 mt-2">
            The average net present cost of electricity generation over the lifetime of the system.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinancialMetrics;