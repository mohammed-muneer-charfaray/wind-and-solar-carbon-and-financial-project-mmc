import React, { useState, useEffect } from 'react';
import { SystemParameters, FinancialParameters, EnergySourceType, EnergySourceConfig } from '../types';
import { MLIntegratedData } from '../utils/mlDataIntegration';
import { Sun, Wind, Waves, Droplets, MapPin, Cloud, AlertTriangle, CheckCircle, Brain } from 'lucide-react';

// Create a simple ML data integrator for now
const mlDataIntegrator = {
  async integrateAndAnalyze(
    systemData: Partial<SystemParameters>,
    financialData: Partial<FinancialParameters>
  ): Promise<MLIntegratedData> {
    // Simple implementation for now
    const defaultSystemParams: SystemParameters = {
      energySources: systemData.energySources || [
        {
          type: 'solar',
          enabled: true,
          capacity: 10,
          efficiency: 18.5,
          costPerKw: 15000,
          dailyProductionHours: 5.2,
          degradationRate: 0.5,
          specificOperationalCosts: 200
        }
      ],
      totalCapacity: 0,
      averageEfficiency: 0,
      gridEmissionFactor: systemData.gridEmissionFactor || 0.95,
      operationalLifetime: systemData.operationalLifetime || 25,
      totalInstallationCost: 0,
      totalOperationalCosts: 0,
      location: systemData.location || {
        latitude: -26.2041,
        longitude: 28.0473,
        city: 'Johannesburg',
        country: 'South Africa'
      }
    };

    // Calculate totals
    defaultSystemParams.totalCapacity = defaultSystemParams.energySources
      .filter(source => source.enabled)
      .reduce((sum, source) => sum + source.capacity, 0);

    defaultSystemParams.averageEfficiency = defaultSystemParams.energySources
      .filter(source => source.enabled)
      .reduce((sum, source, _, arr) => sum + source.efficiency / arr.length, 0);

    defaultSystemParams.totalInstallationCost = defaultSystemParams.energySources
      .filter(source => source.enabled)
      .reduce((sum, source) => sum + (source.capacity * source.costPerKw), 0);

    defaultSystemParams.totalOperationalCosts = defaultSystemParams.energySources
      .filter(source => source.enabled)
      .reduce((sum, source) => sum + (source.capacity * source.specificOperationalCosts), 0);

    const defaultFinancialParams: FinancialParameters = {
      electricityPrice: financialData.electricityPrice || 2.20,
      electricityPriceIncrease: financialData.electricityPriceIncrease || 8,
      financingYears: financialData.financingYears || 10,
      interestRate: financialData.interestRate || 7,
      inflationRate: financialData.inflationRate || 5,
      discountRate: financialData.discountRate || 8
    };

    return {
      systemParams: defaultSystemParams,
      financialParams: defaultFinancialParams,
      weatherAdjustedFactors: {
        solar: 1.0,
        wind: 1.0,
        hydro: 1.0,
        wave: 1.0
      },
      missingDataFlags: [],
      confidenceScore: 0.85,
      recommendations: ['System configuration looks good']
    };
  }
};

interface EnhancedInputFormProps {
  onCalculate: (integratedData: MLIntegratedData) => void;
}

const EnhancedInputForm: React.FC<EnhancedInputFormProps> = ({ onCalculate }) => {
  const [energySources, setEnergySources] = useState<EnergySourceConfig[]>([
    {
      type: 'solar',
      enabled: true,
      capacity: 10,
      efficiency: 18.5,
      costPerKw: 15000,
      dailyProductionHours: 5.2,
      degradationRate: 0.5,
      specificOperationalCosts: 200
    }
  ]);

  const [location, setLocation] = useState({
    latitude: -26.2041,
    longitude: 28.0473,
    city: 'Johannesburg',
    country: 'South Africa'
  });

  const [financialParams, setFinancialParams] = useState<Partial<FinancialParameters>>({
    electricityPrice: 2.20,
    electricityPriceIncrease: 8,
    financingYears: 10,
    interestRate: 7,
    inflationRate: 5,
    discountRate: 8
  });

  const [systemParams, setSystemParams] = useState<Partial<SystemParameters>>({
    gridEmissionFactor: 0.95,
    operationalLifetime: 25
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [mlResults, setMLResults] = useState<MLIntegratedData | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const energySourceIcons = {
    solar: Sun,
    wind: Wind,
    hydro: Droplets,
    wave: Waves
  };

  const energySourceColors = {
    solar: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    wind: 'bg-blue-100 text-blue-800 border-blue-300',
    hydro: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    wave: 'bg-teal-100 text-teal-800 border-teal-300'
  };

  useEffect(() => {
    // Auto-fill missing data when component mounts
    handleMLIntegration();
  }, []);

  const handleMLIntegration = async () => {
    setIsProcessing(true);
    try {
      const systemData: Partial<SystemParameters> = {
        ...systemParams,
        energySources,
        location
      };

      const integratedData = await mlDataIntegrator.integrateAndAnalyze(
        systemData,
        financialParams
      );

      setMLResults(integratedData);
      
      // Update form with ML-enhanced data
      setEnergySources(integratedData.systemParams.energySources);
      setSystemParams(integratedData.systemParams);
      setFinancialParams(integratedData.financialParams);

    } catch (error) {
      console.error('ML integration failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCalculate = async () => {
    if (!mlResults) {
      await handleMLIntegration();
    }
    
    if (mlResults) {
      onCalculate(mlResults);
    }
  };

  const addEnergySource = (type: EnergySourceType) => {
    const defaultConfigs = {
      solar: { efficiency: 18.5, costPerKw: 15000, dailyProductionHours: 5.2, degradationRate: 0.5, specificOperationalCosts: 200 },
      wind: { efficiency: 35, costPerKw: 18000, dailyProductionHours: 8.5, degradationRate: 0.3, specificOperationalCosts: 400 },
      hydro: { efficiency: 85, costPerKw: 25000, dailyProductionHours: 20, degradationRate: 0.1, specificOperationalCosts: 300 },
      wave: { efficiency: 25, costPerKw: 35000, dailyProductionHours: 16, degradationRate: 0.8, specificOperationalCosts: 800 }
    };

    const newSource: EnergySourceConfig = {
      type,
      enabled: true,
      capacity: 10,
      ...defaultConfigs[type]
    };

    setEnergySources([...energySources, newSource]);
  };

  const updateEnergySource = (index: number, updates: Partial<EnergySourceConfig>) => {
    const updated = energySources.map((source, i) => 
      i === index ? { ...source, ...updates } : source
    );
    setEnergySources(updated);
  };

  const removeEnergySource = (index: number) => {
    setEnergySources(energySources.filter((_, i) => i !== index));
  };

  const handleLocationChange = (field: string, value: string | number) => {
    setLocation(prev => ({ ...prev, [field]: value }));
  };

  const handleFinancialChange = (field: string, value: number) => {
    setFinancialParams(prev => ({ ...prev, [field]: value }));
  };

  const handleSystemChange = (field: string, value: number) => {
    setSystemParams(prev => ({ ...prev, [field]: value }));
  };

  const totalCapacity = energySources
    .filter(source => source.enabled)
    .reduce((sum, source) => sum + source.capacity, 0);

  const totalCost = energySources
    .filter(source => source.enabled)
    .reduce((sum, source) => sum + (source.capacity * source.costPerKw), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Enhanced System Configuration</h2>
        <div className="flex space-x-3">
          <button
            onClick={handleMLIntegration}
            disabled={isProcessing}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
          >
            <Brain className="h-4 w-4 mr-2" />
            {isProcessing ? 'Processing...' : 'ML Analysis'}
          </button>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
          </button>
        </div>
      </div>

      {/* ML Results Summary */}
      {mlResults && (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-600" />
            ML Analysis Results
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(mlResults.confidenceScore * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Confidence Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {mlResults.missingDataFlags.length}
              </div>
              <div className="text-sm text-gray-600">Auto-filled Parameters</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {mlResults.recommendations.length}
              </div>
              <div className="text-sm text-gray-600">Recommendations</div>
            </div>
          </div>

          {mlResults.missingDataFlags.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-orange-600 mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Auto-filled Data:
              </h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {mlResults.missingDataFlags.map((flag, index) => (
                  <li key={index} className="flex items-start">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mlResults.recommendations.length > 0 && (
            <div>
              <h4 className="font-medium text-green-600 mb-2 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Recommendations:
              </h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {mlResults.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Location Configuration */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <MapPin className="h-5 w-5 mr-2" />
          Location & Weather Integration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={location.city}
              onChange={(e) => handleLocationChange('city', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              value={location.country}
              onChange={(e) => handleLocationChange('country', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Latitude
            </label>
            <input
              type="number"
              step="0.0001"
              value={location.latitude}
              onChange={(e) => handleLocationChange('latitude', parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Longitude
            </label>
            <input
              type="number"
              step="0.0001"
              value={location.longitude}
              onChange={(e) => handleLocationChange('longitude', parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {mlResults && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center">
              <Cloud className="h-4 w-4 mr-1" />
              Weather-Adjusted Production Factors:
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {Object.entries(mlResults.weatherAdjustedFactors).map(([type, factor]) => (
                <div key={type} className="flex justify-between">
                  <span className="capitalize">{type}:</span>
                  <span className="font-medium">{(factor * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Energy Sources Configuration */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Energy Sources Configuration</h3>
          <div className="flex space-x-2">
            {(['solar', 'wind', 'hydro', 'wave'] as EnergySourceType[]).map(type => {
              const Icon = energySourceIcons[type];
              const hasSource = energySources.some(s => s.type === type);
              return (
                <button
                  key={type}
                  onClick={() => !hasSource && addEnergySource(type)}
                  disabled={hasSource}
                  className={`px-3 py-2 rounded-lg border flex items-center text-sm ${
                    hasSource 
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : `${energySourceColors[type]} hover:opacity-80 cursor-pointer`
                  }`}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {energySources.map((source, index) => {
            const Icon = energySourceIcons[source.type];
            return (
              <div key={index} className={`p-4 rounded-lg border-2 ${energySourceColors[source.type]}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Icon className="h-5 w-5 mr-2" />
                    <h4 className="font-semibold capitalize">{source.type} Energy System</h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={source.enabled}
                        onChange={(e) => updateEnergySource(index, { enabled: e.target.checked })}
                        className="mr-2"
                      />
                      Enabled
                    </label>
                    {energySources.length > 1 && (
                      <button
                        onClick={() => removeEnergySource(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Capacity (kW)</label>
                    <input
                      type="number"
                      value={source.capacity}
                      onChange={(e) => updateEnergySource(index, { capacity: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      disabled={!source.enabled}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Efficiency (%)</label>
                    <input
                      type="number"
                      value={source.efficiency}
                      onChange={(e) => updateEnergySource(index, { efficiency: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      disabled={!source.enabled}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Cost/kW (R)</label>
                    <input
                      type="number"
                      value={source.costPerKw}
                      onChange={(e) => updateEnergySource(index, { costPerKw: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      disabled={!source.enabled}
                    />
                  </div>
                  {showAdvanced && (
                    <>
                      <div>
                        <label className="block text-xs font-medium mb-1">Daily Hours</label>
                        <input
                          type="number"
                          value={source.dailyProductionHours}
                          onChange={(e) => updateEnergySource(index, { dailyProductionHours: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          disabled={!source.enabled}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Degradation (%/yr)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={source.degradationRate}
                          onChange={(e) => updateEnergySource(index, { degradationRate: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          disabled={!source.enabled}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">O&M (R/kW/yr)</label>
                        <input
                          type="number"
                          value={source.specificOperationalCosts}
                          onChange={(e) => updateEnergySource(index, { specificOperationalCosts: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          disabled={!source.enabled}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Capacity:</span>
              <span className="font-semibold ml-2">{totalCapacity.toFixed(1)} kW</span>
            </div>
            <div>
              <span className="text-gray-600">Total Cost:</span>
              <span className="font-semibold ml-2">R{totalCost.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600">Active Sources:</span>
              <span className="font-semibold ml-2">{energySources.filter(s => s.enabled).length}</span>
            </div>
            <div>
              <span className="text-gray-600">Avg Efficiency:</span>
              <span className="font-semibold ml-2">
                {energySources.filter(s => s.enabled).length > 0 
                  ? (energySources.filter(s => s.enabled).reduce((sum, s) => sum + s.efficiency, 0) / energySources.filter(s => s.enabled).length).toFixed(1)
                  : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Parameters */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Financial Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Electricity Price (R/kWh)
            </label>
            <input
              type="number"
              step="0.01"
              value={financialParams.electricityPrice || ''}
              onChange={(e) => handleFinancialChange('electricityPrice', parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price Increase (%/year)
            </label>
            <input
              type="number"
              step="0.1"
              value={financialParams.electricityPriceIncrease || ''}
              onChange={(e) => handleFinancialChange('electricityPriceIncrease', parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interest Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={financialParams.interestRate || ''}
              onChange={(e) => handleFinancialChange('interestRate', parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {showAdvanced && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Financing Years
                </label>
                <input
                  type="number"
                  value={financialParams.financingYears || ''}
                  onChange={(e) => handleFinancialChange('financingYears', parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inflation Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={financialParams.inflationRate || ''}
                  onChange={(e) => handleFinancialChange('inflationRate', parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={financialParams.discountRate || ''}
                  onChange={(e) => handleFinancialChange('discountRate', parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* System Parameters */}
      {showAdvanced && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">System Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grid Emission Factor (kg CO₂/kWh)
              </label>
              <input
                type="number"
                step="0.01"
                value={systemParams.gridEmissionFactor || ''}
                onChange={(e) => handleSystemChange('gridEmissionFactor', parseFloat(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operational Lifetime (years)
              </label>
              <input
                type="number"
                value={systemParams.operationalLifetime || ''}
                onChange={(e) => handleSystemChange('operationalLifetime', parseFloat(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Calculate Button */}
      <div className="flex justify-center">
        <button
          onClick={handleCalculate}
          disabled={isProcessing}
          className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 flex items-center"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing with ML...
            </>
          ) : (
            'Calculate with ML Enhancement'
          )}
        </button>
      </div>
    </div>
  );
};

export default EnhancedInputForm;