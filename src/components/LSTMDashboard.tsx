import React, { useState, useEffect } from 'react';
import { Brain, Upload, Database, TrendingUp, Zap, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { LSTMManager, WeatherPrediction, UsagePrediction, FinancialPrediction } from '../utils/lstmModels';
import { llmIntegration, LLMAnalysis } from '../utils/llmIntegration';
import { excelDataProcessor, ProcessedUsageData } from '../utils/excelDataProcessor';

interface LSTMDashboardProps {
  location: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  };
  onRecommendationsUpdate: (analysis: LLMAnalysis) => void;
}

const LSTMDashboard: React.FC<LSTMDashboardProps> = ({ location, onRecommendationsUpdate }) => {
  const [lstmManager] = useState(() => new LSTMManager());
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [weatherPredictions, setWeatherPredictions] = useState<WeatherPrediction[]>([]);
  const [usagePredictions, setUsagePredictions] = useState<UsagePrediction[]>([]);
  const [financialPredictions, setFinancialPredictions] = useState<FinancialPrediction[]>([]);
  const [llmAnalysis, setLLMAnalysis] = useState<LLMAnalysis | null>(null);
  
  const [usageData, setUsageData] = useState<ProcessedUsageData[]>([]);
  const [uploadStatus, setUploadStatus] = useState<{
    status: 'idle' | 'uploading' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  useEffect(() => {
    initializeLSTMs();
    // Generate sample usage data for demonstration
    const sampleData = excelDataProcessor.generateSampleData(30);
    setUsageData(sampleData);
  }, []);

  const initializeLSTMs = async () => {
    setIsInitializing(true);
    try {
      await lstmManager.initialize();
      setIsInitialized(true);
    } catch (error) {
      console.error('LSTM initialization failed:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus({ status: 'uploading', message: 'Processing file...' });

    try {
      const text = await file.text();
      let processedData: ProcessedUsageData[] = [];

      if (file.name.endsWith('.csv')) {
        processedData = excelDataProcessor.processCSVData(text);
      } else if (file.name.endsWith('.json')) {
        const jsonData = JSON.parse(text);
        processedData = excelDataProcessor.processJSONData(jsonData);
      } else {
        throw new Error('Unsupported file format. Please use CSV or JSON.');
      }

      const validation = excelDataProcessor.validateData(processedData);
      
      if (validation.errors.length > 0) {
        setUploadStatus({ 
          status: 'error', 
          message: `Validation errors: ${validation.errors.slice(0, 3).join(', ')}` 
        });
        return;
      }

      setUsageData(validation.valid);
      setUploadStatus({ 
        status: 'success', 
        message: `Successfully loaded ${validation.valid.length} records${validation.warnings.length > 0 ? ` with ${validation.warnings.length} warnings` : ''}` 
      });

    } catch (error) {
      setUploadStatus({ 
        status: 'error', 
        message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  };

  const runLSTMAnalysis = async () => {
    if (!isInitialized) {
      await initializeLSTMs();
    }

    setIsAnalyzing(true);
    try {
      // Generate historical weather data (in real implementation, this would come from weather service)
      const historicalWeather = Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (24 - i) * 60 * 60 * 1000),
        temperature: 20 + Math.sin(i * 0.26) * 8,
        humidity: 65 + (Math.random() - 0.5) * 20,
        windSpeed: 10 + (Math.random() - 0.5) * 6,
        solarIrradiance: Math.max(0, 600 * Math.sin(i * 0.26)),
        cloudCover: 30 + (Math.random() - 0.5) * 40,
        precipitation: 0,
        pressure: 1013
      }));

      // Generate historical price data
      const historicalPrices = Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (24 - i) * 60 * 60 * 1000),
        electricityPrice: 2.2 + Math.sin(i * 0.26) * 0.5
      }));

      // Run LSTM predictions
      const predictions = await lstmManager.generatePredictions(
        historicalWeather,
        usageData.slice(-168), // Last week of usage data
        historicalPrices,
        24 // 24 hours ahead
      );

      setWeatherPredictions(predictions.weather);
      setUsagePredictions(predictions.usage);
      setFinancialPredictions(predictions.financial);

      // Run LLM analysis
      const analysis = await llmIntegration.analyzeRenewableOptions(
        location,
        predictions.weather,
        predictions.usage,
        predictions.financial
      );

      setLLMAnalysis(analysis);
      onRecommendationsUpdate(analysis);

    } catch (error) {
      console.error('LSTM analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'uploading': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      case 'uploading': return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>;
      default: return <Database className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center">
          <Brain className="h-6 w-6 mr-2 text-purple-600" />
          LSTM & LLM Analysis Dashboard
        </h2>
        <div className="flex space-x-3">
          <button
            onClick={runLSTMAnalysis}
            disabled={isAnalyzing || isInitializing}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
          >
            <Zap className="h-4 w-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {/* LSTM Status */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-3">LSTM Models Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${isInitialized ? 'text-green-600' : 'text-gray-400'}`}>
              {isInitializing ? 'INIT' : isInitialized ? 'READY' : 'IDLE'}
            </div>
            <div className="text-sm text-gray-600">Weather LSTM</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isInitialized ? 'text-green-600' : 'text-gray-400'}`}>
              {isInitializing ? 'INIT' : isInitialized ? 'READY' : 'IDLE'}
            </div>
            <div className="text-sm text-gray-600">Usage LSTM</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isInitialized ? 'text-green-600' : 'text-gray-400'}`}>
              {isInitializing ? 'INIT' : isInitialized ? 'READY' : 'IDLE'}
            </div>
            <div className="text-sm text-gray-600">Financial LSTM</div>
          </div>
        </div>
      </div>

      {/* Data Upload */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Upload className="h-5 w-5 mr-2" />
          Usage Data Upload
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Excel/CSV Usage Data
          </label>
          <input
            type="file"
            accept=".csv,.json,.xlsx"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div className={`flex items-center space-x-2 ${getStatusColor(uploadStatus.status)}`}>
          {getStatusIcon(uploadStatus.status)}
          <span className="text-sm">{uploadStatus.message || 'No file uploaded'}</span>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Expected columns:</strong> timestamp, energy_consumption, peak_demand, base_load, sector</p>
          <p><strong>Current data:</strong> {usageData.length} records loaded</p>
        </div>
      </div>

      {/* LLM Analysis Results */}
      {llmAnalysis && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            LLM Renewable Energy Analysis
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {llmAnalysis.location.distanceToCoast}km
              </div>
              <div className="text-sm text-gray-600">Distance to Coast</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {llmAnalysis.totalRecommendedCapacity.toFixed(1)}kW
              </div>
              <div className="text-sm text-gray-600">Recommended Capacity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(llmAnalysis.confidence * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Analysis Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                R{(llmAnalysis.estimatedCost / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm text-gray-600">Estimated Cost</div>
            </div>
          </div>

          {/* Renewable Recommendations */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3">Renewable Energy Recommendations</h4>
            <div className="space-y-3">
              {llmAnalysis.renewableRecommendations.map((rec, index) => (
                <div key={index} className={`p-3 rounded-lg border ${rec.recommended ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-3 ${rec.recommended ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      <span className="font-medium capitalize">{rec.energyType} Energy</span>
                      {rec.recommended && (
                        <span className="ml-2 text-sm text-green-600">({rec.capacity}kW)</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">
                      {(rec.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 ml-6">{rec.reasoning}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Backup Power Requirement */}
          {llmAnalysis.backupRequirement.required && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Backup Power Requirement</h4>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    {llmAnalysis.backupRequirement.capacity}kW {llmAnalysis.backupRequirement.type}
                  </span>
                  <span className="text-sm text-gray-600">
                    {llmAnalysis.backupRequirement.duration} hours duration
                  </span>
                </div>
                <p className="text-sm text-gray-600">{llmAnalysis.backupRequirement.reasoning}</p>
              </div>
            </div>
          )}

          {/* Analysis Reasoning */}
          <div>
            <h4 className="font-semibold mb-3">Analysis Reasoning</h4>
            <ul className="space-y-2">
              {llmAnalysis.reasoning.map((reason, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Predictions Summary */}
      {(weatherPredictions.length > 0 || usagePredictions.length > 0 || financialPredictions.length > 0) && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            24-Hour Predictions Summary
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {weatherPredictions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Weather Forecast</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Avg Temperature:</span>
                    <span>{(weatherPredictions.reduce((sum, w) => sum + w.temperature, 0) / weatherPredictions.length).toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Wind Speed:</span>
                    <span>{(weatherPredictions.reduce((sum, w) => sum + w.windSpeed, 0) / weatherPredictions.length).toFixed(1)} m/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Solar Irradiance:</span>
                    <span>{(weatherPredictions.reduce((sum, w) => sum + w.solarIrradiance, 0) / weatherPredictions.length).toFixed(0)} W/m²</span>
                  </div>
                </div>
              </div>
            )}

            {usagePredictions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Usage Forecast</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Avg Consumption:</span>
                    <span>{(usagePredictions.reduce((sum, u) => sum + u.predictedConsumption, 0) / usagePredictions.length).toFixed(1)} kWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Peak Demand:</span>
                    <span>{Math.max(...usagePredictions.map(u => u.predictedPeakDemand)).toFixed(1)} kW</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Confidence:</span>
                    <span>{(usagePredictions.reduce((sum, u) => sum + u.confidence, 0) / usagePredictions.length * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            )}

            {financialPredictions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Financial Forecast</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Avg Electricity Price:</span>
                    <span>R{(financialPredictions.reduce((sum, f) => sum + f.electricityPrice, 0) / financialPredictions.length).toFixed(2)}/kWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Demand Charge:</span>
                    <span>R{(financialPredictions.reduce((sum, f) => sum + f.demandCharge, 0) / financialPredictions.length).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Carbon Tax:</span>
                    <span>R{(financialPredictions.reduce((sum, f) => sum + f.carbonTax, 0) / financialPredictions.length).toFixed(0)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LSTMDashboard;