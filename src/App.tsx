import React, { useState, useRef } from 'react';
import { Calculator, Wind, Sun, DollarSign, BarChart3, LineChart, Leaf, Download, Target, Brain } from 'lucide-react';
import InputForm from './components/InputForm';
import GoalsForm from './components/GoalsForm';
import MLDashboard from './components/MLDashboard';
import FinancialMetrics from './components/FinancialMetrics';
import InvestmentGraph from './components/InvestmentGraph';
import EnergyGenerationTable from './components/EnergyGenerationTable';
import CarbonReductionChart from './components/CarbonReductionChart';
import ElectricityPricePrediction from './components/ElectricityPricePrediction';
import { mlCalculator } from './utils/mlEnhancedCalculations';
import { calculateFinancialMetrics, calculateEnergyGeneration, calculateCarbonReduction } from './utils/calculations';
import { exportToPDF } from './utils/pdfExport';
import { SystemParameters, FinancialParameters, CalculatedResults } from './types';

function App() {
  const [activeTab, setActiveTab] = useState('input');
  const [systemParams, setSystemParams] = useState<SystemParameters>({
    capacity: 10, // kW
    efficiency: 18, // %
    gridEmissionFactor: 0.95, // kg CO₂/kWh
    operationalLifetime: 25, // years
    costPerKw: 15000, // R
    systemSize: 10, // kW
    installationCost: 150000, // R
    dailyProductionHours: 5, // hours
    degradationRate: 0.5, // % per year
    operationalCosts: 5000, // R per year
  });

  const [financialParams, setFinancialParams] = useState<FinancialParameters>({
    electricityPrice: 2.20, // R per kWh
    electricityPriceIncrease: 8, // % per year
    financingYears: 10, // years
    interestRate: 7, // %
    inflationRate: 5, // %
    discountRate: 8, // %
  });

  const [results, setResults] = useState<CalculatedResults | null>(null);
  
  // Refs for canvas elements
  const investmentGraphRef = useRef<HTMLCanvasElement>(null);
  const electricityPriceChartRef = useRef<HTMLCanvasElement>(null);
  const carbonReductionChartRef = useRef<HTMLCanvasElement>(null);

  const calculateResults = () => {
    // Use ML-enhanced calculations
    mlCalculator.calculateWithMLValidation(systemParams, financialParams)
      .then(mlResults => {
        if (mlResults.success) {
          setResults({
            ...mlResults.data,
            electricityPrices: Array.from({ length: systemParams.operationalLifetime }, (_, i) => ({
              year: i + 1,
              price: financialParams.electricityPrice * Math.pow(1 + financialParams.electricityPriceIncrease / 100, i)
            }))
          });
          setActiveTab('financial');
        } else {
          // Fallback to conventional calculations
          const financialMetrics = calculateFinancialMetrics(systemParams, financialParams);
          const energyGeneration = calculateEnergyGeneration(systemParams);
          const carbonReduction = calculateCarbonReduction(systemParams, energyGeneration);

          setResults({
            financialMetrics,
            energyGeneration,
            carbonReduction,
            electricityPrices: Array.from({ length: systemParams.operationalLifetime }, (_, i) => ({
              year: i + 1,
              price: financialParams.electricityPrice * Math.pow(1 + financialParams.electricityPriceIncrease / 100, i)
            }))
          });
          setActiveTab('financial');
        }
      })
      .catch(error => {
        console.error('ML calculation failed, using fallback:', error);
        // Fallback to conventional calculations
        const financialMetrics = calculateFinancialMetrics(systemParams, financialParams);
        const energyGeneration = calculateEnergyGeneration(systemParams);
        const carbonReduction = calculateCarbonReduction(systemParams, energyGeneration);

        setResults({
          financialMetrics,
          energyGeneration,
          carbonReduction,
          electricityPrices: Array.from({ length: systemParams.operationalLifetime }, (_, i) => ({
            year: i + 1,
            price: financialParams.electricityPrice * Math.pow(1 + financialParams.electricityPriceIncrease / 100, i)
          }))
        });
        setActiveTab('financial');
      });
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
    setSystemParams(prev => ({
      ...prev,
      capacity,
      systemSize,
      installationCost: systemSize * prev.costPerKw
    }));
  };
  const handleMLResultsUpdate = (mlResults: any) => {
    if (mlResults.optimizedParams) {
      setSystemParams(prev => ({ ...prev, ...mlResults.optimizedParams }));
    }
    if (mlResults.financialMetrics) {
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
              Input Parameters
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
            {activeTab === 'goals' && (
              <GoalsForm onCalculate={handleGoalsCalculation} />
            )}
            {activeTab === 'ml' && (
              <MLDashboard 
                systemParams={systemParams}
                financialParams={financialParams}
                onResultsUpdate={handleMLResultsUpdate}
              />
            )}
            {activeTab === 'input' && (
              <InputForm
                systemParams={systemParams}
                setSystemParams={setSystemParams}
                financialParams={financialParams}
                setFinancialParams={setFinancialParams}
                onCalculate={calculateResults}
              />
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