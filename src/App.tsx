import React, { useState, useRef } from 'react';
import { Calculator, Wind, Sun, DollarSign, BarChart3, LineChart, Leaf, Download, Target, Brain } from 'lucide-react';
import EnhancedInputForm from './components/EnhancedInputForm';
import ManualInputForm from './components/ManualInputForm';
import GoalsForm from './components/GoalsForm';
import MLDashboard from './components/MLDashboard';
import FinancialMetrics from './components/FinancialMetrics';
import InvestmentGraph from './components/InvestmentGraph';
import EnergyGenerationTable from './components/EnergyGenerationTable';
import CarbonReductionChart from './components/CarbonReductionChart';
import ElectricityPricePrediction from './components/ElectricityPricePrediction';
import { calculateFinancialMetrics, calculateEnergyGeneration, calculateCarbonReduction } from './utils/calculations';
import { exportToPDF } from './utils/pdfExport';
import { CalculatedResults, SystemParameters, FinancialParameters } from './types';

interface MLIntegratedData {
  systemParams: any;
  financialParams: any;
  weatherAdjustedFactors: { [key: string]: number };
  missingDataFlags: string[];
  confidenceScore: number;
  recommendations: string[];
}

function App() {
  const [activeTab, setActiveTab] = useState('input');
  const [integratedData, setIntegratedData] = useState<MLIntegratedData | null>(null);
  const [results, setResults] = useState<CalculatedResults | null>(null);
  const [inputMode, setInputMode] = useState<'enhanced' | 'manual'>('enhanced');
  
  // Refs for canvas elements
  const investmentGraphRef = useRef<HTMLCanvasElement>(null);
  const electricityPriceChartRef = useRef<HTMLCanvasElement>(null);
  const carbonReductionChartRef = useRef<HTMLCanvasElement>(null);

  const handleIntegratedCalculation = (data: MLIntegratedData) => {
    setIntegratedData(data);
    
    // Calculate results using conventional calculations
    const financialMetrics = calculateFinancialMetrics(data.systemParams, data.financialParams);
    const energyGeneration = calculateEnergyGeneration(data.systemParams);
    const carbonReduction = calculateCarbonReduction(data.systemParams, energyGeneration);
    
    // Generate electricity price forecast
    const electricityPrices = Array.from({ length: data.systemParams.operationalLifetime || 25 }, (_, i) => ({
      year: i + 1,
      price: (data.financialParams.electricityPrice || 2.20) * Math.pow(1 + (data.financialParams.electricityPriceIncrease || 8) / 100, i)
    }));
    
    setResults({
      financialMetrics,
      energyGeneration,
      carbonReduction,
      electricityPrices
    });
    
    setActiveTab('financial');
  };

  const handleManualCalculation = (systemParams: SystemParameters, financialParams: FinancialParameters) => {
    // Calculate results using conventional calculations with manual inputs
    const financialMetrics = calculateFinancialMetrics(systemParams, financialParams);
    const energyGeneration = calculateEnergyGeneration(systemParams);
    const carbonReduction = calculateCarbonReduction(systemParams, energyGeneration);
    
    // Generate electricity price forecast
    const electricityPrices = Array.from({ length: systemParams.operationalLifetime || 25 }, (_, i) => ({
      year: i + 1,
      price: financialParams.electricityPrice * Math.pow(1 + financialParams.electricityPriceIncrease / 100, i)
    }));
    
    setResults({
      financialMetrics,
      energyGeneration,
      carbonReduction,
      electricityPrices
    });
    
    // Create integrated data for consistency
    setIntegratedData({
      systemParams,
      financialParams,
      weatherAdjustedFactors: {
        solar: 1.0,
        wind: 1.0,
        hydro: 1.0,
        wave: 1.0
      },
      missingDataFlags: [],
      confidenceScore: 1.0,
      recommendations: ['Manual input mode - all parameters user-defined']
    });
    
    setActiveTab('financial');
  };

  const handleExportPDF = () => {
    if (!results) return;

    const canvasElements = {
      'Investment Analysis': investmentGraphRef.current!,
      'Electricity Price Prediction': electricityPriceChartRef.current!,
      'Carbon Reduction': carbonReductionChartRef.current!
    };

    exportToPDF(results, canvasElements);
  };

  const handleGoalsCalculation = (capacity: number, systemSize: number) => {
    // Update the first energy source or create a new one
    if (integratedData) {
      const updatedSources = [...integratedData.systemParams.energySources];
      if (updatedSources.length > 0) {
        updatedSources[0] = {
          ...updatedSources[0],
          capacity: systemSize
        };
      }
      
      const updatedData: MLIntegratedData = {
        ...integratedData,
        systemParams: {
          ...integratedData.systemParams,
          energySources: updatedSources,
          totalCapacity: systemSize
        }
      };
      
      setIntegratedData(updatedData);
    }
  };
  
  const handleMLResultsUpdate = (mlResults: any) => {
    if (mlResults.financialMetrics && integratedData) {
      setResults(prev => prev ? { ...prev, ...mlResults } : null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-green-500 text-white p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sun className="h-8 w-8" />
            <Wind className="h-8 w-8" />
            <h1 className="text-2xl font-bold">Solar & Wind Financial Analysis</h1>
          </div>
          {results && (
            <button
              onClick={handleExportPDF}
              className="flex items-center px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Download className="h-5 w-5 mr-2" />
              Export PDF
            </button>
          )}
        </div>
      </header>

      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="flex border-b overflow-x-auto">
            <button
              className={`px-4 py-3 font-medium flex items-center whitespace-nowrap ${
                activeTab === 'goals' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('goals')}
            >
              <Target className="h-4 w-4 mr-2" />
              Set Goals
            </button>
            <button
              className={`px-4 py-3 font-medium flex items-center whitespace-nowrap ${
                activeTab === 'ml' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('ml')}
            >
              <Brain className="h-4 w-4 mr-2" />
              ML Analysis
            </button>
            <button
              className={`px-4 py-3 font-medium flex items-center whitespace-nowrap ${
                activeTab === 'input' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('input')}
            >
              <Calculator className="h-4 w-4 mr-2" />
              {inputMode === 'enhanced' ? 'Enhanced Input' : 'Manual Input'}
            </button>
            <button
              className={`px-4 py-3 font-medium flex items-center whitespace-nowrap ${
                activeTab === 'financial' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('financial')}
              disabled={!results}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Financial Metrics
            </button>
            <button
              className={`px-4 py-3 font-medium flex items-center whitespace-nowrap ${
                activeTab === 'investment' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('investment')}
              disabled={!results}
            >
              <LineChart className="h-4 w-4 mr-2" />
              Investment Analysis
            </button>
            <button
              className={`px-4 py-3 font-medium flex items-center whitespace-nowrap ${
                activeTab === 'electricity' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('electricity')}
              disabled={!results}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Electricity Price
            </button>
            <button
              className={`px-4 py-3 font-medium flex items-center whitespace-nowrap ${
                activeTab === 'energy' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('energy')}
              disabled={!results}
            >
              <Sun className="h-4 w-4 mr-2" />
              Energy Generation
            </button>
            <button
              className={`px-4 py-3 font-medium flex items-center whitespace-nowrap ${
                activeTab === 'carbon' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('carbon')}
              disabled={!results}
            >
              <Leaf className="h-4 w-4 mr-2" />
              Carbon Reduction
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'input' && (
              <div className="mb-6">
                <div className="flex items-center justify-center space-x-4 mb-6">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setInputMode('enhanced')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        inputMode === 'enhanced'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Brain className="h-4 w-4 mr-2 inline" />
                      ML Enhanced
                    </button>
                    <button
                      onClick={() => setInputMode('manual')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        inputMode === 'manual'
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Calculator className="h-4 w-4 mr-2 inline" />
                      Manual Input
                    </button>
                  </div>
                </div>
                
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-600">
                    {inputMode === 'enhanced' 
                      ? 'AI-powered analysis with weather integration and automatic data validation'
                      : 'Complete manual control over all system parameters and calculations'
                    }
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'goals' && (
              <GoalsForm onCalculate={handleGoalsCalculation} />
            )}
            {activeTab === 'ml' && (
              <MLDashboard 
                systemParams={integratedData?.systemParams || { energySources: [], totalCapacity: 0, averageEfficiency: 0, gridEmissionFactor: 0.95, operationalLifetime: 25, totalInstallationCost: 0, totalOperationalCosts: 0, location: { latitude: -26.2041, longitude: 28.0473, city: 'Johannesburg', country: 'South Africa' } }}
                financialParams={integratedData?.financialParams || { electricityPrice: 2.20, electricityPriceIncrease: 8, financingYears: 10, interestRate: 7, inflationRate: 5, discountRate: 8 }}
                onResultsUpdate={handleMLResultsUpdate}
              />
            )}
            {activeTab === 'input' && (
              <>
                {inputMode === 'enhanced' ? (
                  <EnhancedInputForm onCalculate={handleIntegratedCalculation} />
                ) : (
                  <ManualInputForm onCalculate={handleManualCalculation} />
                )}
              </>
            )}
            {activeTab === 'financial' && results && (
              <FinancialMetrics metrics={results.financialMetrics} />
            )}
            {activeTab === 'investment' && results && (
              <InvestmentGraph 
                cashFlows={results.financialMetrics.yearlyCashFlows} 
                paybackPeriod={results.financialMetrics.paybackPeriod}
                canvasRef={investmentGraphRef}
              />
            )}
            {activeTab === 'electricity' && results && (
              <ElectricityPricePrediction 
                prices={results.electricityPrices}
                canvasRef={electricityPriceChartRef}
              />
            )}
            {activeTab === 'energy' && results && (
              <EnergyGenerationTable data={results.energyGeneration} />
            )}
            {activeTab === 'carbon' && results && (
              <CarbonReductionChart 
                data={results.carbonReduction}
                canvasRef={carbonReductionChartRef}
              />
            )}
          </div>
        </div>
      </div>

      <footer className="bg-gray-800 text-white p-4 mt-auto">
        <div className="container mx-auto text-center text-sm">
          <p>© 2025 Solar & Wind Financial Analysis Tool</p>
        </div>
      </footer>
    </div>
  );
}

export default App;