import React, { useState, useEffect } from 'react';
import { Brain, Zap, TrendingUp, Grid, Battery, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';
import { 
  WeatherUsageLSTM, 
  FinanceReturnLSTM, 
  GridRenewableAnalyzer,
  WeatherUsageCorrelation,
  FinanceReturnPrediction,
  GridRenewableCapacity
} from '../utils/advancedLSTMModels';
import { WeatherData } from '../types';

interface AdvancedLSTMDashboardProps {
  weatherData: WeatherData[];
  usageData: any[];
  financialData: any[];
  onGridAnalysisUpdate: (analysis: GridRenewableCapacity) => void;
}

const AdvancedLSTMDashboard: React.FC<AdvancedLSTMDashboardProps> = ({
  weatherData,
  usageData,
  financialData,
  onGridAnalysisUpdate
}) => {
  const [weatherUsageLSTM] = useState(() => new WeatherUsageLSTM());
  const [financeReturnLSTM] = useState(() => new FinanceReturnLSTM());
  const [gridAnalyzer] = useState(() => new GridRenewableAnalyzer());
  
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [weatherUsageCorrelations, setWeatherUsageCorrelations] = useState<WeatherUsageCorrelation[]>([]);
  const [financeReturns, setFinanceReturns] = useState<FinanceReturnPrediction[]>([]);
  const [gridAnalysis, setGridAnalysis] = useState<GridRenewableCapacity | null>(null);
  
  const [gridData, setGridData] = useState({
    totalCapacity: 58000, // South Africa's total capacity ~58GW
    currentRenewable: 8000, // Current renewable ~8GW
    peakDemand: 32000, // Peak demand ~32GW
    baseLoad: 22000 // Base load ~22GW
  });

  useEffect(() => {
    initializeLSTMs();
  }, []);

  const initializeLSTMs = async () => {
    setIsInitializing(true);
    try {
      await Promise.all([
        weatherUsageLSTM.initialize(),
        financeReturnLSTM.initialize(),
        gridAnalyzer.initialize()
      ]);
      setIsInitialized(true);
    } catch (error) {
      console.error('Advanced LSTM initialization failed:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const runAdvancedAnalysis = async () => {
    if (!isInitialized) {
      await initializeLSTMs();
    }

    setIsAnalyzing(true);
    try {
      // Run weather-usage correlation analysis
      const weatherUsageResults = await weatherUsageLSTM.predictWeatherUsageCorrelation(
        weatherData,
        usageData,
        24
      );
      setWeatherUsageCorrelations(weatherUsageResults);

      // Run finance-return analysis
      const financeResults = await financeReturnLSTM.predictFinanceReturn(
        financialData,
        [], // Market data would be provided here
        24
      );
      setFinanceReturns(financeResults);

      // Run grid renewable capacity analysis
      const gridResults = await gridAnalyzer.analyzeGridRenewableCapacity(
        gridData,
        weatherData,
        usageData,
        financialData
      );
      setGridAnalysis(gridResults);
      onGridAnalysisUpdate(gridResults);

    } catch (error) {
      console.error('Advanced LSTM analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-blue-600 bg-blue-100';
      case 'C': return 'text-yellow-600 bg-yellow-100';
      case 'D': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getFeasibilityColor = (feasibility: string) => {
    switch (feasibility) {
      case 'High': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center">
          <Brain className="h-6 w-6 mr-2 text-purple-600" />
          Advanced LSTM Analysis Dashboard
        </h2>
        <div className="flex space-x-3">
          <button
            onClick={runAdvancedAnalysis}
            disabled={isAnalyzing || isInitializing}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
          >
            <Zap className="h-4 w-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Run Advanced Analysis'}
          </button>
        </div>
      </div>

      {/* LSTM Models Status */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-3">Advanced LSTM Models Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${isInitialized ? 'text-green-600' : 'text-gray-400'}`}>
              {isInitializing ? 'INIT' : isInitialized ? 'READY' : 'IDLE'}
            </div>
            <div className="text-sm text-gray-600">Weather-Usage LSTM</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isInitialized ? 'text-green-600' : 'text-gray-400'}`}>
              {isInitializing ? 'INIT' : isInitialized ? 'READY' : 'IDLE'}
            </div>
            <div className="text-sm text-gray-600">Finance-Return LSTM</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isInitialized ? 'text-green-600' : 'text-gray-400'}`}>
              {isInitializing ? 'INIT' : isInitialized ? 'READY' : 'IDLE'}
            </div>
            <div className="text-sm text-gray-600">Grid Analyzer</div>
          </div>
        </div>
      </div>

      {/* Grid Configuration */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Grid className="h-5 w-5 mr-2" />
          Grid Configuration (South Africa)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Capacity (MW)
            </label>
            <input
              type="number"
              value={gridData.totalCapacity}
              onChange={(e) => setGridData(prev => ({ ...prev, totalCapacity: parseInt(e.target.value) || 0 }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Renewable (MW)
            </label>
            <input
              type="number"
              value={gridData.currentRenewable}
              onChange={(e) => setGridData(prev => ({ ...prev, currentRenewable: parseInt(e.target.value) || 0 }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Peak Demand (MW)
            </label>
            <input
              type="number"
              value={gridData.peakDemand}
              onChange={(e) => setGridData(prev => ({ ...prev, peakDemand: parseInt(e.target.value) || 0 }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base Load (MW)
            </label>
            <input
              type="number"
              value={gridData.baseLoad}
              onChange={(e) => setGridData(prev => ({ ...prev, baseLoad: parseInt(e.target.value) || 0 }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Grid Renewable Analysis Results */}
      {gridAnalysis && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Battery className="h-5 w-5 mr-2" />
            Grid Renewable Transition Analysis
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {gridAnalysis.renewablePercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Current Renewable</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(gridAnalysis.maxRenewableCapacity / 1000).toFixed(1)}GW
              </div>
              <div className="text-sm text-gray-600">Max Renewable Capacity</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getFeasibilityColor(gridAnalysis.transitionFeasibility)}`}>
                {gridAnalysis.transitionFeasibility}
              </div>
              <div className="text-sm text-gray-600">Transition Feasibility</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {gridAnalysis.transitionTimeframe}
              </div>
              <div className="text-sm text-gray-600">Years to Complete</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Capacity Analysis</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Current Total:</span>
                  <span className="font-medium">{(gridAnalysis.currentCapacity / 1000).toFixed(1)}GW</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Renewable:</span>
                  <span className="font-medium">{(gridAnalysis.renewableCapacity / 1000).toFixed(1)}GW</span>
                </div>
                <div className="flex justify-between">
                  <span>Stability Limit:</span>
                  <span className="font-medium">{(gridAnalysis.gridStabilityLimit / 1000).toFixed(1)}GW</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Renewable:</span>
                  <span className="font-medium">{(gridAnalysis.maxRenewableCapacity / 1000).toFixed(1)}GW</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Investment Requirements</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Required Investment:</span>
                  <span className="font-medium">R{(gridAnalysis.requiredInvestment / 1000000000).toFixed(1)}B</span>
                </div>
                <div className="flex justify-between">
                  <span>Additional Capacity:</span>
                  <span className="font-medium">{((gridAnalysis.maxRenewableCapacity - gridAnalysis.renewableCapacity) / 1000).toFixed(1)}GW</span>
                </div>
                <div className="flex justify-between">
                  <span>Transition Feasibility:</span>
                  <span className={`font-medium ${getFeasibilityColor(gridAnalysis.transitionFeasibility)}`}>
                    {gridAnalysis.transitionFeasibility}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Timeline:</span>
                  <span className="font-medium">{gridAnalysis.transitionTimeframe} years</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weather-Usage Correlation Results */}
      {weatherUsageCorrelations.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Weather-Usage Correlation Analysis
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(weatherUsageCorrelations.reduce((sum, c) => sum + c.weatherImpact, 0) / weatherUsageCorrelations.length * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Avg Weather Impact</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(weatherUsageCorrelations.reduce((sum, c) => sum + c.usageAdjustment, 0) / weatherUsageCorrelations.length * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Usage Adjustment</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(weatherUsageCorrelations.reduce((sum, c) => sum + c.confidence, 0) / weatherUsageCorrelations.length * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Avg Confidence</div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Correlation Factors (24h Average)</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              {weatherUsageCorrelations.length > 0 && (
                <>
                  <div className="text-center">
                    <div className="font-medium">Temperature</div>
                    <div>{(weatherUsageCorrelations.reduce((sum, c) => sum + c.correlationFactors.temperature, 0) / weatherUsageCorrelations.length).toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Humidity</div>
                    <div>{(weatherUsageCorrelations.reduce((sum, c) => sum + c.correlationFactors.humidity, 0) / weatherUsageCorrelations.length).toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Wind Speed</div>
                    <div>{(weatherUsageCorrelations.reduce((sum, c) => sum + c.correlationFactors.windSpeed, 0) / weatherUsageCorrelations.length).toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Solar Irradiance</div>
                    <div>{(weatherUsageCorrelations.reduce((sum, c) => sum + c.correlationFactors.solarIrradiance, 0) / weatherUsageCorrelations.length).toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Cloud Cover</div>
                    <div>{(weatherUsageCorrelations.reduce((sum, c) => sum + c.correlationFactors.cloudCover, 0) / weatherUsageCorrelations.length).toFixed(2)}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Finance-Return Analysis Results */}
      {financeReturns.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Finance-Return Analysis
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(financeReturns.reduce((sum, f) => sum + f.expectedReturn, 0) / financeReturns.length).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Avg Expected Return</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {(financeReturns.reduce((sum, f) => sum + f.riskFactor, 0) / financeReturns.length * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Avg Risk Factor</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(financeReturns.reduce((sum, f) => sum + f.marketVolatility, 0) / financeReturns.length * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Market Volatility</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold px-3 py-1 rounded-full ${getGradeColor(financeReturns[0]?.investmentGrade || 'C')}`}>
                {financeReturns[0]?.investmentGrade || 'C'}
              </div>
              <div className="text-sm text-gray-600">Investment Grade</div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Investment Grade Distribution (24h)</h4>
            <div className="grid grid-cols-4 gap-2 text-sm">
              {['A', 'B', 'C', 'D'].map(grade => {
                const count = financeReturns.filter(f => f.investmentGrade === grade).length;
                const percentage = (count / financeReturns.length * 100).toFixed(0);
                return (
                  <div key={grade} className="text-center">
                    <div className={`font-medium px-2 py-1 rounded ${getGradeColor(grade)}`}>
                      Grade {grade}
                    </div>
                    <div>{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Processing Indicator */}
      {(isAnalyzing || isInitializing) && (
        <div className="bg-blue-50 p-4 rounded-lg flex items-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
          <div>
            <div className="font-medium text-blue-800">
              {isInitializing ? 'Initializing Advanced LSTM Models' : 'Running Advanced Analysis'}
            </div>
            <div className="text-sm text-blue-600">
              {isInitializing 
                ? 'Setting up Weather-Usage, Finance-Return, and Grid Analysis models...'
                : 'Processing weather correlations, financial returns, and grid capacity analysis...'
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedLSTMDashboard;