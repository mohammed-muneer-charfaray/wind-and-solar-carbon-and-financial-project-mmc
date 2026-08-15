import React, { useState } from 'react';
import { Brain, TrendingUp, Zap, AlertCircle, CheckCircle, Battery, Fuel } from 'lucide-react';
import { EnergySourceConfig, SystemParameters, FinancialParameters } from '../types';
import { EnergyOptimizer, EnergyOutputPrediction, BatteryRecommendation } from '../utils/energyOptimizer';

interface LSTMDashboardProps {
  energySources?: EnergySourceConfig[];
  systemParams?: Partial<SystemParameters>;
  financialParams?: Partial<FinancialParameters>;
  dailyLoad?: number;
  onRecommendationsUpdate?: (data: any) => void;
}

const LSTMDashboard: React.FC<LSTMDashboardProps> = ({
  energySources = [],
  systemParams = {},
  financialParams = {},
  dailyLoad = 50,
  onRecommendationsUpdate
}) => {
  const [predictions, setPredictions] = useState<EnergyOutputPrediction[]>([]);
  const [batteryRecommendation, setBatteryRecommendation] = useState<BatteryRecommendation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [batterySize, setBatterySize] = useState<number>(0);
  const [costPerKwh, setCostPerKwh] = useState<number>(200);

  const runPrediction = async () => {
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

      const predictions = optimizer.predictEnergyOutput(7);
      setPredictions(predictions);

      const batteryRec = optimizer.calculateBatteryRequirements(
        dailyLoad,
        1,
        0.95,
        costPerKwh
      );
      setBatteryRecommendation(batteryRec);
      setBatterySize(batteryRec.recommendedCapacity);

      setHasRun(true);

      if (onRecommendationsUpdate) {
        onRecommendationsUpdate({
          predictions,
          batteryRecommendation: batteryRec
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const avgGeneration = predictions.length > 0 ?
    predictions.reduce((sum, p) => sum + p.expectedOutput, 0) / predictions.length : 0;

  const generatorNeeded = avgGeneration < dailyLoad;
  const deficit = Math.max(0, dailyLoad - avgGeneration);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center mb-2">
              <Brain className="h-6 w-6 mr-3 text-blue-600" />
              LSTM Energy Output Prediction
            </h2>
            <p className="text-gray-600">7-day forecast with battery & generator recommendations</p>
          </div>
          <button
            onClick={runPrediction}
            disabled={isAnalyzing || !energySources || energySources.length === 0}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isAnalyzing || !energySources || energySources.length === 0
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isAnalyzing ? 'Analyzing...' : 'Run Prediction'}
          </button>
        </div>
      </div>

      {/* Input Configuration */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">System Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Daily Load (kWh)</label>
            <p className="text-lg font-bold text-gray-900">{dailyLoad}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Energy Sources</label>
            <p className="text-lg font-bold text-gray-900">{energySources?.filter(s => s.enabled).length || 0}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Total Capacity (kW)</label>
            <p className="text-lg font-bold text-gray-900">
              {(energySources?.filter(s => s.enabled).reduce((sum, s) => sum + s.capacity, 0) || 0).toFixed(1)}
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Battery Cost ($/kWh)</label>
            <input
              type="number"
              value={costPerKwh}
              onChange={(e) => setCostPerKwh(parseFloat(e.target.value) || 200)}
              className="w-full px-2 py-1 border border-gray-300 rounded"
              min="100"
              max="500"
            />
          </div>
        </div>
      </div>

      {/* Predictions Grid */}
      {hasRun && predictions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {predictions.map(pred => (
            <div key={pred.day} className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-lg transition-shadow">
              <h3 className="font-semibold text-gray-900 mb-3">Day {pred.day}</h3>

              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Expected Output</span>
                  <p className="text-xl font-bold text-green-600">{pred.expectedOutput.toFixed(1)} kWh</p>
                </div>

                <div className="border-t pt-2">
                  <span className="text-sm text-gray-600">vs Load</span>
                  <p className={`text-sm font-medium ${
                    pred.expectedOutput >= dailyLoad ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {pred.expectedOutput >= dailyLoad ? '✓ Surplus' : '✗ Deficit'} ({
                      (pred.expectedOutput - dailyLoad).toFixed(1)
                    } kWh)
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Confidence</span>
                  <span className="font-medium text-gray-900">{(pred.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !hasRun && (!energySources || energySources.length === 0) ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-yellow-600 mb-4" />
          <p className="text-gray-600 mb-2">No energy sources configured</p>
          <p className="text-sm text-gray-500">Add energy sources in Enhanced Input to generate predictions</p>
        </div>
      ) : !hasRun ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">No predictions generated yet</p>
          <p className="text-sm text-gray-500">Click "Run Prediction" to generate LSTM forecasts</p>
        </div>
      ) : null}

      {/* Battery & Generator Recommendation */}
      {hasRun && batteryRecommendation && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Battery Storage */}
          <div className="bg-white p-6 rounded-lg shadow border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Battery className="h-5 w-5 mr-2 text-blue-600" />
              Battery Storage Recommendation
            </h3>

            <div className="space-y-4">
              <div className="border-b pb-3">
                <label className="block text-sm text-gray-600 mb-1">Required Capacity</label>
                <p className="text-2xl font-bold text-gray-900">{batteryRecommendation.requiredCapacity.toFixed(1)} kWh</p>
              </div>

              <div className="border-b pb-3">
                <label className="block text-sm text-gray-600 mb-1">Recommended Capacity (with 20% buffer)</label>
                <input
                  type="number"
                  value={batterySize}
                  onChange={(e) => setBatterySize(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-lg font-bold"
                />
                <p className="text-xs text-gray-500 mt-1">Editable for optimization</p>
              </div>

              <div className="border-b pb-3">
                <label className="block text-sm text-gray-600 mb-1">Installation Cost</label>
                <p className="text-2xl font-bold text-blue-600">
                  ${(batterySize * costPerKwh).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
              </div>

              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-blue-900">
                  Covers {batteryRecommendation.generatorDeficit > 0 ? ((batterySize * costPerKwh) / batteryRecommendation.generatorDeficit * 100).toFixed(0) : '100'}% of deficit days
                </p>
              </div>
            </div>
          </div>

          {/* Generator Backup */}
          <div className="bg-white p-6 rounded-lg shadow border border-orange-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Fuel className="h-5 w-5 mr-2 text-orange-600" />
              Generator Backup Assessment
            </h3>

            <div className="space-y-4">
              <div className="border-b pb-3">
                <label className="block text-sm text-gray-600 mb-1">Status</label>
                <div className="flex items-center">
                  {generatorNeeded ? (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                      <p className="text-lg font-bold text-red-600">Generator Required</p>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <p className="text-lg font-bold text-green-600">Self-Sufficient</p>
                    </>
                  )}
                </div>
              </div>

              {generatorNeeded && (
                <>
                  <div className="border-b pb-3">
                    <label className="block text-sm text-gray-600 mb-1">Daily Deficit</label>
                    <p className="text-2xl font-bold text-orange-600">{deficit.toFixed(1)} kWh/day</p>
                  </div>

                  <div className="border-b pb-3">
                    <label className="block text-sm text-gray-600 mb-1">Annual Deficit (Low Generation Days)</label>
                    <p className="text-2xl font-bold text-orange-600">{(deficit * 90).toFixed(0)} kWh/year</p>
                  </div>

                  <div className="bg-orange-50 p-3 rounded">
                    <p className="text-sm text-orange-900">
                      Battery + generator hybrid needed. Generator provides peak capacity backup and covers seasonal shortfalls.
                    </p>
                  </div>
                </>
              )}

              {!generatorNeeded && (
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm text-green-900">
                    System generates sufficient power. Battery storage recommended for load balancing and peak shaving.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {hasRun && predictions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="text-sm text-gray-600 mb-2 flex items-center">
              <Zap className="h-4 w-4 mr-2 text-yellow-600" />
              Avg Energy Output
            </div>
            <p className="text-2xl font-bold text-gray-900">{avgGeneration.toFixed(1)} kWh</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="text-sm text-gray-600 mb-2 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
              Load Requirement
            </div>
            <p className="text-2xl font-bold text-gray-900">{dailyLoad} kWh</p>
          </div>

          <div className={`bg-white p-4 rounded-lg shadow border ${
            avgGeneration >= dailyLoad ? 'border-green-200' : 'border-red-200'
          }`}>
            <div className={`text-sm mb-2 flex items-center ${
              avgGeneration >= dailyLoad ? 'text-green-600' : 'text-red-600'
            }`}>
              {avgGeneration >= dailyLoad ? <CheckCircle className="h-4 w-4 mr-2" /> : <AlertCircle className="h-4 w-4 mr-2" />}
              Balance
            </div>
            <p className={`text-2xl font-bold ${
              avgGeneration >= dailyLoad ? 'text-green-600' : 'text-red-600'
            }`}>
              {(avgGeneration - dailyLoad).toFixed(1)} kWh
            </p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-medium">LSTM Prediction:</span> Uses Long Short-Term Memory neural networks to forecast energy generation based on your configured energy sources. Automatically calculates required battery storage and identifies generator backup needs.
        </p>
      </div>
    </div>
  );
};

export default LSTMDashboard;
