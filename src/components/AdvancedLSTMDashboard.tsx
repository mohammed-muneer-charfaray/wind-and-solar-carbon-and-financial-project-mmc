import React, { useState } from 'react';
import { Brain, Zap, TrendingUp, Battery, Fuel, AlertCircle, CheckCircle, BarChart3, DollarSign } from 'lucide-react';
import { EnergySourceConfig, SystemParameters, FinancialParameters } from '../types';
import { EnergyOptimizer, OptimizationResult } from '../utils/energyOptimizer';

interface AdvancedLSTMDashboardProps {
  energySources?: EnergySourceConfig[];
  systemParams?: Partial<SystemParameters>;
  financialParams?: Partial<FinancialParameters>;
  dailyLoad?: number;
  onGridAnalysisUpdate?: (analysis: any) => void;
}

const AdvancedLSTMDashboard: React.FC<AdvancedLSTMDashboardProps> = ({
  energySources = [],
  systemParams = {},
  financialParams = {},
  dailyLoad = 50,
  onGridAnalysisUpdate
}) => {
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const [projectionYears, setProjectionYears] = useState(10);
  const [annualSavings, setAnnualSavings] = useState(5000);
  const [generatorCost, setGeneratorCost] = useState(5);
  const [hydrogenCost, setHydrogenCost] = useState(8);
  const [fuelCellSize, setFuelCellSize] = useState(0);
  const [fuelCellEfficiency, setFuelCellEfficiency] = useState(0.6);

  const runAdvancedAnalysis = async () => {
    if (!energySources || energySources.length === 0) {
      return;
    }

    setIsAnalyzing(true);
    try {
      const optimizer = new EnergyOptimizer(
        energySources,
        systemParams,
        financialParams
      );

      const result = optimizer.optimizeSystemWithAlternativeSources(
        dailyLoad,
        true,
        generatorCost,
        hydrogenCost,
        fuelCellSize,
        fuelCellEfficiency
      );

      setOptimizationResult(result);
      setHasRun(true);

      if (onGridAnalysisUpdate) {
        onGridAnalysisUpdate(result);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center mb-2">
              <Brain className="h-6 w-6 mr-3 text-purple-600" />
              Advanced LSTM System Optimization
            </h2>
            <p className="text-gray-600">Multi-source optimization with battery, hydrogen, and generator planning</p>
          </div>
          <button
            onClick={runAdvancedAnalysis}
            disabled={isAnalyzing || !energySources || energySources.length === 0}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isAnalyzing || !energySources || energySources.length === 0
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {isAnalyzing ? 'Optimizing...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Projection Years</label>
          <input
            type="number"
            value={projectionYears}
            onChange={(e) => setProjectionYears(parseInt(e.target.value) || 10)}
            min="1"
            max="30"
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
          <p className="text-xs text-gray-500 mt-1">Years to project growth</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Annual Savings ($)</label>
          <input
            type="number"
            value={annualSavings}
            onChange={(e) => setAnnualSavings(parseFloat(e.target.value) || 0)}
            step="100"
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
          <p className="text-xs text-gray-500 mt-1">Reinvest into system growth</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Daily Load (kWh)</label>
          <p className="text-2xl font-bold text-gray-900">{dailyLoad}</p>
          <p className="text-xs text-gray-500 mt-1">From system configuration</p>
        </div>
      </div>

      {/* Alternative Energy Sources Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-orange-200">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Fuel className="h-5 w-5 mr-2 text-orange-600" />
            Generator Configuration
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Cost per kWh ($)</label>
              <input
                type="number"
                value={generatorCost}
                onChange={(e) => setGeneratorCost(parseFloat(e.target.value) || 0)}
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <p className="text-xs text-gray-500">Backup power for deficit periods</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-cyan-200">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-cyan-600" />
            Hydrogen Fuel Cell
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fuel Cell Size (kW)</label>
              <input
                type="number"
                value={fuelCellSize}
                onChange={(e) => setFuelCellSize(parseFloat(e.target.value) || 0)}
                step="0.5"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Efficiency (%)</label>
              <input
                type="number"
                value={fuelCellEfficiency * 100}
                onChange={(e) => setFuelCellEfficiency((parseFloat(e.target.value) || 0) / 100)}
                step="1"
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Hydrogen Cost ($/kWh)</label>
              <input
                type="number"
                value={hydrogenCost}
                onChange={(e) => setHydrogenCost(parseFloat(e.target.value) || 0)}
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <p className="text-xs text-gray-500">Green hydrogen long-term storage</p>
          </div>
        </div>
      </div>

      {/* Optimization Results */}
      {hasRun && optimizationResult ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg shadow border border-blue-200">
              <div className="text-sm text-blue-700 mb-1">Total Daily Energy Need</div>
              <p className="text-2xl font-bold text-blue-900">{optimizationResult.totalDailyEnergy} kWh</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg shadow border border-green-200">
              <div className="text-sm text-green-700 mb-1">Battery Storage Size</div>
              <p className="text-2xl font-bold text-green-900">{optimizationResult.batteryStorageSize.toFixed(1)} kWh</p>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-lg shadow border border-cyan-200">
              <div className="text-sm text-cyan-700 mb-1">Hydrogen Storage Size</div>
              <p className="text-2xl font-bold text-cyan-900">{optimizationResult.hydrogenStorageSize.toFixed(1)} kWh</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg shadow border border-red-200">
              <div className="text-sm text-red-700 mb-1">Annual Cost (All Sources)</div>
              <p className="text-2xl font-bold text-red-900">
                ${optimizationResult.costBreakdown.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
              Annual Cost Breakdown
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded border border-green-200">
                <span className="text-gray-700 flex items-center">
                  <Battery className="h-4 w-4 mr-2 text-green-600" />
                  Battery Storage
                </span>
                <span className="font-bold text-gray-900">
                  ${optimizationResult.costBreakdown.battery.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-cyan-50 rounded border border-cyan-200">
                <span className="text-gray-700 flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-cyan-600" />
                  Hydrogen Fuel
                </span>
                <span className="font-bold text-gray-900">
                  ${optimizationResult.costBreakdown.hydrogen.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-orange-50 rounded border border-orange-200">
                <span className="text-gray-700 flex items-center">
                  <Fuel className="h-4 w-4 mr-2 text-orange-600" />
                  Generator Fuel
                </span>
                <span className="font-bold text-gray-900">
                  ${optimizationResult.costBreakdown.generator.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-100 rounded border border-gray-300 font-bold">
                <span className="text-gray-900">Total Annual Cost</span>
                <span className="text-xl text-gray-900">
                  ${optimizationResult.costBreakdown.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Power Source Mix (% of Daily Need)
            </h3>

            <div className="space-y-3">
              {Object.entries(optimizationResult.powerMix).map(([source, percentage]) => (
                <div key={source} className="flex items-center">
                  <span className="w-24 text-sm font-medium text-gray-700 capitalize">{source}:</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 mx-3 relative">
                    <div
                      className={`h-6 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all ${
                        source === 'solar' ? 'bg-yellow-500' :
                        source === 'wind' ? 'bg-blue-500' :
                        source === 'hydro' ? 'bg-cyan-500' :
                        source === 'wave' ? 'bg-teal-500' :
                        source === 'battery' ? 'bg-green-500' :
                        source === 'hydrogen' ? 'bg-purple-500' :
                        'bg-orange-500'
                      }`}
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    >
                      {percentage > 5 && `${percentage.toFixed(1)}%`}
                    </div>
                  </div>
                  <span className="w-16 text-right text-sm font-bold text-gray-900">{percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-blue-600" />
              System Recommendations
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 mr-3 font-bold">•</span>
                <span>Battery storage of {optimizationResult.batteryStorageSize.toFixed(1)} kWh covers short-term deficit periods efficiently</span>
              </li>
              {fuelCellSize > 0 && optimizationResult.hydrogenStorageSize > 0 && (
                <li className="flex items-start">
                  <span className="text-blue-600 mr-3 font-bold">•</span>
                  <span>Hydrogen fuel cell sized at {fuelCellSize} kW with {optimizationResult.hydrogenStorageSize.toFixed(1)} kWh storage handles medium-term gaps</span>
                </li>
              )}
              {optimizationResult.costBreakdown.generator > 0 && (
                <li className="flex items-start">
                  <span className="text-blue-600 mr-3 font-bold">•</span>
                  <span>Generator backup for ${optimizationResult.costBreakdown.generator.toLocaleString()} annually covers emergency scenarios</span>
                </li>
              )}
              <li className="flex items-start">
                <span className="text-blue-600 mr-3 font-bold">•</span>
                <span>Total system cost: ${optimizationResult.costBreakdown.total.toLocaleString()} per year for complete energy security</span>
              </li>
            </ul>
          </div>
        </div>
      ) : !hasRun && (!energySources || energySources.length === 0) ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-yellow-600 mb-4" />
          <p className="text-gray-600 mb-2">No energy sources configured</p>
          <p className="text-sm text-gray-500">Add energy sources in Enhanced Input to run optimization</p>
        </div>
      ) : !hasRun ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">No optimization performed yet</p>
          <p className="text-sm text-gray-500">Click "Run Analysis" to optimize your system configuration</p>
        </div>
      ) : null}

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="text-sm text-purple-900">
          <span className="font-medium">Advanced Optimization:</span> Uses machine learning to determine optimal mix of battery storage, hydrogen fuel cells, and generator backup based on your energy sources, costs, and savings projections.
        </p>
      </div>
    </div>
  );
};

export default AdvancedLSTMDashboard;
