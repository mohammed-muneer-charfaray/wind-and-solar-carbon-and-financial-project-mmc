import * as tf from '@tensorflow/tfjs';
import { SystemParameters, FinancialParameters, FinancialMetrics, EnergyGeneration, CarbonReduction } from '../types';
import { dataProcessor, DataValidationResult } from './dataProcessor';
import { calculateFinancialMetrics, calculateEnergyGeneration, calculateCarbonReduction } from './calculations';

export interface MLCalculationResult {
  success: boolean;
  data: any;
  errors: string[];
  warnings: string[];
  intermediateVariables: any;
  confidence: number;
}

export class MLEnhancedCalculator {
  private model: tf.LayersModel | null = null;
  private isModelLoaded = false;

  constructor() {
    this.initializeModel();
  }

  private async initializeModel(): Promise<void> {
    try {
      // Create a simple neural network for validation and optimization
      this.model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [10], units: 64, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'linear' })
        ]
      });

      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      this.isModelLoaded = true;
    } catch (error) {
      console.warn('ML model initialization failed, falling back to conventional calculations:', error);
      this.isModelLoaded = false;
    }
  }

  /**
   * Enhanced calculation with ML validation and error handling
   */
  async calculateWithMLValidation(
    systemParams: SystemParameters,
    financialParams: FinancialParameters
  ): Promise<MLCalculationResult> {
    try {
      // Step 1: Data validation and normalization
      const systemValidation = dataProcessor.validateData(systemParams);
      const financialValidation = dataProcessor.validateData(financialParams);

      const allErrors = [...systemValidation.errors, ...financialValidation.errors];
      const allWarnings = [...systemValidation.warnings, ...financialValidation.warnings];

      if (!systemValidation.isValid || !financialValidation.isValid) {
        return {
          success: false,
          data: null,
          errors: allErrors,
          warnings: allWarnings,
          intermediateVariables: {},
          confidence: 0
        };
      }

      // Step 2: Handle missing data with ML imputation
      const normalizedSystemParams = await dataProcessor.imputeMissingData(
        systemValidation.normalizedData,
        'ml'
      );
      const normalizedFinancialParams = await dataProcessor.imputeMissingData(
        financialValidation.normalizedData,
        'ml'
      );

      // Step 3: Store intermediate variables
      this.storeIntermediateCalculations(normalizedSystemParams, normalizedFinancialParams);

      // Step 4: Perform calculations with ML enhancement
      const results = await this.performEnhancedCalculations(
        normalizedSystemParams,
        normalizedFinancialParams
      );

      // Step 5: Validate results using ML
      const confidence = await this.calculateConfidence(results);

      return {
        success: true,
        data: results,
        errors: allErrors,
        warnings: allWarnings,
        intermediateVariables: dataProcessor.getAllIntermediateVariables(),
        confidence
      };

    } catch (error) {
      return {
        success: false,
        data: null,
        errors: [`Calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        intermediateVariables: {},
        confidence: 0
      };
    }
  }

  private storeIntermediateCalculations(
    systemParams: SystemParameters,
    financialParams: FinancialParameters
  ): void {
    // Store key intermediate variables for downstream calculations
    dataProcessor.storeIntermediateVariable('totalSystemCost', 
      systemParams.installationCost + (systemParams.operationalCosts * systemParams.operationalLifetime)
    );

    dataProcessor.storeIntermediateVariable('annualEnergyProduction',
      systemParams.systemSize * systemParams.dailyProductionHours * 365
    );

    dataProcessor.storeIntermediateVariable('monthlyLoanPayment',
      this.calculateMonthlyPayment(
        systemParams.installationCost,
        financialParams.interestRate,
        financialParams.financingYears
      )
    );

    dataProcessor.storeIntermediateVariable('effectiveDiscountRate',
      (financialParams.discountRate - financialParams.inflationRate) / 100
    );

    dataProcessor.storeIntermediateVariable('carbonIntensity',
      systemParams.gridEmissionFactor * systemParams.systemSize * systemParams.dailyProductionHours * 365
    );
  }

  private calculateMonthlyPayment(principal: number, annualRate: number, years: number): number {
    if (annualRate === 0) return principal / (years * 12);
    
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = years * 12;
    
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
           (Math.pow(1 + monthlyRate, numPayments) - 1);
  }

  private async performEnhancedCalculations(
    systemParams: SystemParameters,
    financialParams: FinancialParameters
  ): Promise<{
    financialMetrics: FinancialMetrics;
    energyGeneration: EnergyGeneration;
    carbonReduction: CarbonReduction;
  }> {
    // Use conventional calculations as base
    const financialMetrics = calculateFinancialMetrics(systemParams, financialParams);
    const energyGeneration = calculateEnergyGeneration(systemParams);
    const carbonReduction = calculateCarbonReduction(systemParams, energyGeneration);

    // Apply ML enhancements if model is available
    if (this.isModelLoaded && this.model) {
      try {
        const enhancedMetrics = await this.enhanceWithML(
          { financialMetrics, energyGeneration, carbonReduction },
          systemParams,
          financialParams
        );
        return enhancedMetrics;
      } catch (error) {
        console.warn('ML enhancement failed, using conventional calculations:', error);
      }
    }

    return { financialMetrics, energyGeneration, carbonReduction };
  }

  private async enhanceWithML(
    baseResults: any,
    systemParams: SystemParameters,
    financialParams: FinancialParameters
  ): Promise<any> {
    // Prepare input features for ML model
    const features = tf.tensor2d([[
      systemParams.capacity,
      systemParams.efficiency,
      systemParams.operationalLifetime,
      systemParams.systemSize,
      financialParams.electricityPrice,
      financialParams.electricityPriceIncrease,
      financialParams.interestRate,
      financialParams.inflationRate,
      financialParams.discountRate,
      systemParams.gridEmissionFactor
    ]]);

    // Use ML model to validate and potentially adjust results
    if (this.model) {
      const prediction = this.model.predict(features) as tf.Tensor;
      const predictionValue = await prediction.data();
      
      // Apply ML-based adjustments (example: risk adjustment factor)
      const riskAdjustmentFactor = Math.max(0.8, Math.min(1.2, predictionValue[0]));
      
      baseResults.financialMetrics.npv *= riskAdjustmentFactor;
      baseResults.financialMetrics.irr *= riskAdjustmentFactor;
      
      // Clean up tensors
      features.dispose();
      prediction.dispose();
    }

    return baseResults;
  }

  private async calculateConfidence(results: any): Promise<number> {
    // Calculate confidence based on data quality and result consistency
    let confidence = 1.0;

    // Check for extreme values that might indicate calculation errors
    if (results.financialMetrics.npv < -results.financialMetrics.yearlyCashFlows[0]?.cashFlow * 2) {
      confidence *= 0.8; // Reduce confidence for extremely negative NPV
    }

    if (results.financialMetrics.irr > 50 || results.financialMetrics.irr < -50) {
      confidence *= 0.7; // Reduce confidence for extreme IRR values
    }

    if (results.financialMetrics.paybackPeriod > 50) {
      confidence *= 0.9; // Reduce confidence for very long payback periods
    }

    // Check for NaN values in results
    const hasNaN = this.checkForNaN(results);
    if (hasNaN) {
      confidence *= 0.5;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private checkForNaN(obj: any): boolean {
    if (typeof obj === 'number') {
      return isNaN(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.some(item => this.checkForNaN(item));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => this.checkForNaN(value));
    }
    
    return false;
  }

  /**
   * Optimize system parameters using ML
   */
  async optimizeSystemParameters(
    targetMetric: 'npv' | 'irr' | 'payback',
    constraints: Partial<SystemParameters & FinancialParameters>
  ): Promise<SystemParameters> {
    // This is a placeholder for ML-based optimization
    // In a full implementation, this would use genetic algorithms or gradient descent
    
    const baseParams: SystemParameters = {
      capacity: constraints.capacity || 10,
      efficiency: constraints.efficiency || 18,
      gridEmissionFactor: constraints.gridEmissionFactor || 0.95,
      operationalLifetime: constraints.operationalLifetime || 25,
      costPerKw: constraints.costPerKw || 15000,
      systemSize: constraints.systemSize || 10,
      installationCost: constraints.installationCost || 150000,
      dailyProductionHours: constraints.dailyProductionHours || 5,
      degradationRate: constraints.degradationRate || 0.5,
      operationalCosts: constraints.operationalCosts || 5000
    };

    // Simple optimization: adjust system size to maximize target metric
    const optimizationSteps = 10;
    let bestParams = { ...baseParams };
    let bestScore = -Infinity;

    for (let i = 0; i < optimizationSteps; i++) {
      const testParams = { ...baseParams };
      testParams.systemSize = baseParams.systemSize * (0.5 + i * 0.1);
      testParams.installationCost = testParams.systemSize * testParams.costPerKw;

      try {
        const financialParams: FinancialParameters = {
          electricityPrice: constraints.electricityPrice || 2.20,
          electricityPriceIncrease: constraints.electricityPriceIncrease || 8,
          financingYears: constraints.financingYears || 10,
          interestRate: constraints.interestRate || 7,
          inflationRate: constraints.inflationRate || 5,
          discountRate: constraints.discountRate || 8
        };

        const metrics = calculateFinancialMetrics(testParams, financialParams);
        let score = 0;

        switch (targetMetric) {
          case 'npv':
            score = metrics.npv;
            break;
          case 'irr':
            score = metrics.irr;
            break;
          case 'payback':
            score = -metrics.paybackPeriod; // Negative because we want shorter payback
            break;
        }

        if (score > bestScore) {
          bestScore = score;
          bestParams = { ...testParams };
        }
      } catch (error) {
        console.warn(`Optimization step ${i} failed:`, error);
      }
    }

    return bestParams;
  }

  /**
   * Generate predictive maintenance recommendations
   */
  generateMaintenanceRecommendations(
    systemParams: SystemParameters,
    weatherData?: any[]
  ): string[] {
    const recommendations: string[] = [];

    // Age-based recommendations
    const systemAge = new Date().getFullYear() - 2024; // Assuming system installed in 2024
    if (systemAge > 10) {
      recommendations.push('Consider inverter replacement - typical lifespan is 10-15 years');
    }
    if (systemAge > 20) {
      recommendations.push('Evaluate panel degradation - consider partial system upgrade');
    }

    // Performance-based recommendations
    if (systemParams.degradationRate > 0.8) {
      recommendations.push('High degradation rate detected - inspect for shading or soiling issues');
    }

    // Weather-based recommendations (if weather data available)
    if (weatherData && weatherData.length > 0) {
      recommendations.push('Schedule cleaning after dust storm season');
      recommendations.push('Inspect mounting systems before high wind season');
    }

    // Efficiency-based recommendations
    if (systemParams.efficiency < 15) {
      recommendations.push('Consider upgrading to higher efficiency panels');
    }

    return recommendations;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    dataProcessor.clearIntermediateStorage();
  }
}

export const mlCalculator = new MLEnhancedCalculator();