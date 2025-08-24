import React, { useState, useEffect } from 'react';
import { Brain, AlertTriangle, CheckCircle, TrendingUp, Settings, Zap } from 'lucide-react';
import { mlCalculator, MLCalculationResult } from '../utils/mlEnhancedCalculations';
import { dataProcessor, DataValidationResult } from '../utils/dataProcessor';
import { SystemParameters, FinancialParameters } from '../types';

interface MLDashboardProps {
  systemParams: SystemParameters;
  financialParams: FinancialParameters;
  onResultsUpdate: (results: any) => void;
}

const MLDashboard: React.FC<MLDashboardProps> = ({ 
  systemParams, 
  financialParams, 
  onResultsUpdate 
}) => {
  const [mlResults, setMLResults] = useState<MLCalculationResult | null>(null);
  const [validationResults, setValidationResults] = useState<{
    system: DataValidationResult;
    financial: DataValidationResult;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [intermediateVars, setIntermediateVars] = useState<any>({});

  useEffect(() => {
    validateData();
  }, [systemParams, financialParams]);

  const validateData = async () => {
    const systemValidation = dataProcessor.validateData(systemParams);
    const financialValidation = dataProcessor.validateData(financialParams);
    
    setValidationResults({
      system: systemValidation,
      financial: financialValidation
    });
  };

  const runMLCalculations = async () => {
    setIsProcessing(true);
    try {
      const results = await mlCalculator.calculateWithMLValidation(
        systemParams,
        financialParams
      );
      
      setMLResults(results);
      setIntermediateVars(results.intermediateVariables);
      
      if (results.success) {
        onResultsUpdate(results.data);
      }
    } catch (error) {
      console.error('ML calculation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const optimizeSystem = async () => {
    setIsProcessing(true);
    try {
      const optimizedParams = await mlCalculator.optimizeSystemParameters(
        'npv',
        { ...systemParams, ...financialParams }
      );
      
      // Update system parameters with optimized values
      onResultsUpdate({ optimizedParams });
    } catch (error) {
      console.error('System optimization failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center">
          <Brain className="h-6 w-6 mr-2 text-purple-600" />
          ML-Enhanced Analysis Dashboard
        </h2>
        <div className="flex space-x-3">
          <button
            onClick={runMLCalculations}
            disabled={isProcessing}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
          >
            <Zap className="h-4 w-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Run ML Analysis'}
          </button>
          <button
            onClick={optimizeSystem}
            disabled={isProcessing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <Settings className="h-4 w-4 mr-2" />
            Optimize System
          </button>
        </div>
      </div>

      {/* Data Validation Status */}
      {validationResults && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              {validationResults.system.isValid ? (
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
              )}
              System Parameters Validation
            </h3>
            
            {validationResults.system.errors.length > 0 && (
              <div className="mb-3">
                <h4 className="font-medium text-red-600 mb-1">Errors:</h4>
                <ul className="text-sm text-red-600 space-y-1">
                  {validationResults.system.errors.map((error, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-red-600 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {validationResults.system.warnings.length > 0 && (
              <div>
                <h4 className="font-medium text-yellow-600 mb-1">Warnings:</h4>
                <ul className="text-sm text-yellow-600 space-y-1">
                  {validationResults.system.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-yellow-600 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              {validationResults.financial.isValid ? (
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
              )}
              Financial Parameters Validation
            </h3>
            
            {validationResults.financial.errors.length > 0 && (
              <div className="mb-3">
                <h4 className="font-medium text-red-600 mb-1">Errors:</h4>
                <ul className="text-sm text-red-600 space-y-1">
                  {validationResults.financial.errors.map((error, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-red-600 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {validationResults.financial.warnings.length > 0 && (
              <div>
                <h4 className="font-medium text-yellow-600 mb-1">Warnings:</h4>
                <ul className="text-sm text-yellow-600 space-y-1">
                  {validationResults.financial.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-yellow-600 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ML Results */}
      {mlResults && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
            ML Analysis Results
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {mlResults.success ? 'SUCCESS' : 'FAILED'}
              </div>
              <div className="text-sm text-gray-600">Analysis Status</div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${getConfidenceColor(mlResults.confidence)}`}>
                {(mlResults.confidence * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">
                Confidence ({getConfidenceLabel(mlResults.confidence)})
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(intermediateVars).length}
              </div>
              <div className="text-sm text-gray-600">Intermediate Variables</div>
            </div>
          </div>

          {/* Intermediate Variables */}
          {Object.keys(intermediateVars).length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Intermediate Calculations</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(intermediateVars).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 p-3 rounded">
                    <div className="text-sm font-medium text-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-lg font-semibold">
                      {typeof value === 'number' 
                        ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                        : String(value)
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error and Warning Summary */}
          {(mlResults.errors.length > 0 || mlResults.warnings.length > 0) && (
            <div className="mt-6 space-y-3">
              {mlResults.errors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">Errors</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {mlResults.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {mlResults.warnings.length > 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">Warnings</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {mlResults.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="bg-blue-50 p-4 rounded-lg flex items-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
          <div>
            <div className="font-medium text-blue-800">Processing with ML Enhancement</div>
            <div className="text-sm text-blue-600">
              Validating data, running calculations, and optimizing results...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MLDashboard;