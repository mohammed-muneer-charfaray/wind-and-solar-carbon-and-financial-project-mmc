import React, { useState } from 'react';
import { SystemParameters, FinancialParameters, EnergySourceConfig, EnergySourceType } from '../types';
import { Calculator, Sun, Wind, Droplets, Waves, Plus, Trash2 } from 'lucide-react';

interface ManualInputFormProps {
  onCalculate: (systemParams: SystemParameters, financialParams: FinancialParameters) => void;
}

const ManualInputForm: React.FC<ManualInputFormProps> = ({ onCalculate }) => {
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

  const [systemParams, setSystemParams] = useState<Partial<SystemParameters>>({
    gridEmissionFactor: 0.95,
    operationalLifetime: 25,
    location: {
      latitude: -26.2041,
      longitude: 28.0473,
      city: 'Johannesburg',
      country: 'South Africa'
    }
  });

  const [financialParams, setFinancialParams] = useState<FinancialParameters>({
    electricityPrice: 2.20,
    electricityPriceIncrease: 8,
    financingYears: 10,
    interestRate: 7,
    inflationRate: 5,
    discountRate: 8
  });

  const energySourceIcons = {
    solar: Sun,
    wind: Wind,
    hydro: Droplets,
    wave: Waves
  };

  const energySourceDefaults = {
    solar: { efficiency: 18.5, costPerKw: 15000, dailyProductionHours: 5.2, degradationRate: 0.5, specificOperationalCosts: 200 },
    wind: { efficiency: 35, costPerKw: 18000, dailyProductionHours: 8.5, degradationRate: 0.3, specificOperationalCosts: 400 },
    hydro: { efficiency: 85, costPerKw: 25000, dailyProductionHours: 20, degradationRate: 0.1, specificOperationalCosts: 300 },
    wave: { efficiency: 25, costPerKw: 35000, dailyProductionHours: 16, degradationRate: 0.8, specificOperationalCosts: 800 }
  };

  const addEnergySource = (type: EnergySourceType) => {
    const newSource: EnergySourceConfig = {
      type,
      enabled: true,
      capacity: 10,
      ...energySourceDefaults[type]
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
    if (energySources.length > 1) {
      setEnergySources(energySources.filter((_, i) => i !== index));
    }
  };

  const handleSystemParamChange = (field: string, value: string | number) => {
    if (field.startsWith('location.')) {
      const locationField = field.split('.')[1];
      setSystemParams(prev => ({
        ...prev,
        location: {
          ...prev.location!,
          [locationField]: value
        }
      }));
    } else {
      setSystemParams(prev => ({
        ...prev,
        [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
      }));
    }
  };

  const handleFinancialParamChange = (field: string, value: string) => {
    setFinancialParams(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const handleCalculate = () => {
    // Calculate totals
    const enabledSources = energySources.filter(source => source.enabled);
    const totalCapacity = enabledSources.reduce((sum, source) => sum + source.capacity, 0);
    const averageEfficiency = enabledSources.reduce((sum, source, _, arr) => sum + source.efficiency / arr.length, 0);
    const totalInstallationCost = enabledSources.reduce((sum, source) => sum + (source.capacity * source.costPerKw), 0);
    const totalOperationalCosts = enabledSources.reduce((sum, source) => sum + (source.capacity * source.specificOperationalCosts), 0);

    const completeSystemParams: SystemParameters = {
      energySources,
      totalCapacity,
      averageEfficiency,
      gridEmissionFactor: systemParams.gridEmissionFactor || 0.95,
      operationalLifetime: systemParams.operationalLifetime || 25,
      totalInstallationCost,
      totalOperationalCosts,
      location: systemParams.location || {
        latitude: -26.2041,
        longitude: 28.0473,
        city: 'Johannesburg',
        country: 'South Africa'
      }
    };

    onCalculate(completeSystemParams, financialParams);
  };

  const totalCapacity = energySources.filter(s => s.enabled).reduce((sum, s) => sum + s.capacity, 0);
  const totalCost = energySources.filter(s => s.enabled).reduce((sum, s) => sum + (s.capacity * s.costPerKw), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Manual System Configuration</h2>
        <div className="text-sm text-gray-600">
          Complete manual control over all parameters
        </div>
      </div>

      {/* Location Configuration */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Location Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={systemParams.location?.city || ''}
              onChange={(e) => handleSystemParamChange('location.city', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <input
              type="text"
              value={systemParams.location?.country || ''}
              onChange={(e) => handleSystemParamChange('location.country', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
            <input
              type="number"
              step="0.0001"
              value={systemParams.location?.latitude || ''}
              onChange={(e) => handleSystemParamChange('location.latitude', parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
            <input
              type="number"
              step="0.0001"
              value={systemParams.location?.longitude || ''}
              onChange={(e) => handleSystemParamChange('location.longitude', parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Energy Sources Configuration */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Energy Sources</h3>
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
                      : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 cursor-pointer'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  <Plus className="h-3 w-3 ml-1" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {energySources.map((source, index) => {
            const Icon = energySourceIcons[source.type];
            return (
              <div key={index} className="p-4 border-2 border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Icon className="h-5 w-5 mr-2 text-blue-600" />
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
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
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
                      step="0.1"
                      value={source.efficiency}
                      onChange={(e) => updateEnergySource(index, { efficiency: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      disabled={!source.enabled}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Cost per kW (R)</label>
                    <input
                      type="number"
                      value={source.costPerKw}
                      onChange={(e) => updateEnergySource(index, { costPerKw: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      disabled={!source.enabled}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Daily Hours</label>
                    <input
                      type="number"
                      step="0.1"
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
              value={financialParams.electricityPrice}
              onChange={(e) => handleFinancialParamChange('electricityPrice', e.target.value)}
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
              value={financialParams.electricityPriceIncrease}
              onChange={(e) => handleFinancialParamChange('electricityPriceIncrease', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Financing Years
            </label>
            <input
              type="number"
              value={financialParams.financingYears}
              onChange={(e) => handleFinancialParamChange('financingYears', e.target.value)}
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
              value={financialParams.interestRate}
              onChange={(e) => handleFinancialParamChange('interestRate', e.target.value)}
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
              value={financialParams.inflationRate}
              onChange={(e) => handleFinancialParamChange('inflationRate', e.target.value)}
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
              value={financialParams.discountRate}
              onChange={(e) => handleFinancialParamChange('discountRate', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* System Parameters */}
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
              onChange={(e) => handleSystemParamChange('gridEmissionFactor', e.target.value)}
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
              onChange={(e) => handleSystemParamChange('operationalLifetime', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Calculate Button */}
      <div className="flex justify-center">
        <button
          onClick={handleCalculate}
          className="px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center"
        >
          <Calculator className="h-5 w-5 mr-2" />
          Calculate with Manual Inputs
        </button>
      </div>
    </div>
  );
};

export default ManualInputForm;