import * as tf from '@tensorflow/tfjs';

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedData: any;
}

export interface IntermediateVariables {
  [key: string]: number | number[] | undefined;
}

export class DataProcessor {
  private intermediateStorage: Map<string, any> = new Map();
  private validationRules: Map<string, (value: any) => boolean> = new Map();

  constructor() {
    this.initializeValidationRules();
  }

  private initializeValidationRules(): void {
    // Define validation rules for different data types
    this.validationRules.set('capacity', (value) => !isNaN(value) && value > 0);
    this.validationRules.set('efficiency', (value) => !isNaN(value) && value > 0 && value <= 100);
    this.validationRules.set('electricityPrice', (value) => !isNaN(value) && value > 0);
    this.validationRules.set('interestRate', (value) => !isNaN(value) && value >= 0 && value <= 100);
    this.validationRules.set('operationalLifetime', (value) => !isNaN(value) && value > 0 && value <= 50);
  }

  /**
   * Normalize heterogeneous data formats to standardized structure
   */
  normalizeData(rawData: any): any {
    const normalized: any = {};
    
    for (const [key, value] of Object.entries(rawData)) {
      if (value === null || value === undefined || value === '') {
        normalized[key] = NaN;
        continue;
      }

      // Handle different data formats
      if (typeof value === 'string') {
        // Try to parse numeric strings
        const numericValue = parseFloat(value.replace(/[^\d.-]/g, ''));
        normalized[key] = isNaN(numericValue) ? NaN : numericValue;
      } else if (typeof value === 'number') {
        normalized[key] = isFinite(value) ? value : NaN;
      } else if (Array.isArray(value)) {
        normalized[key] = value.map(v => {
          const num = typeof v === 'string' ? parseFloat(v) : v;
          return isFinite(num) ? num : NaN;
        });
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  /**
   * Validate data integrity and flag missing values
   */
  validateData(data: any): DataValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalizedData = this.normalizeData(data);

    for (const [key, value] of Object.entries(normalizedData)) {
      // Check for NaN values
      if (typeof value === 'number' && isNaN(value)) {
        errors.push(`Missing or invalid value for ${key}: NaN detected`);
        continue;
      }

      // Apply validation rules
      const validator = this.validationRules.get(key);
      if (validator && !validator(value)) {
        errors.push(`Invalid value for ${key}: ${value}`);
      }

      // Check for extreme values that might indicate data entry errors
      if (typeof value === 'number') {
        if (key === 'capacity' && value > 1000) {
          warnings.push(`Unusually high capacity value: ${value} kW`);
        }
        if (key === 'electricityPrice' && value > 10) {
          warnings.push(`Unusually high electricity price: R${value}/kWh`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalizedData
    };
  }

  /**
   * Store intermediate calculation results
   */
  storeIntermediateVariable(key: string, value: any): void {
    this.intermediateStorage.set(key, value);
  }

  /**
   * Retrieve intermediate calculation results
   */
  getIntermediateVariable(key: string): any {
    return this.intermediateStorage.get(key);
  }

  /**
   * Clear intermediate storage
   */
  clearIntermediateStorage(): void {
    this.intermediateStorage.clear();
  }

  /**
   * Get all intermediate variables for debugging
   */
  getAllIntermediateVariables(): IntermediateVariables {
    const variables: IntermediateVariables = {};
    for (const [key, value] of this.intermediateStorage.entries()) {
      variables[key] = value;
    }
    return variables;
  }

  /**
   * Handle missing data using ML-based imputation
   */
  async imputeMissingData(data: any, strategy: 'mean' | 'median' | 'ml' = 'mean'): Promise<any> {
    const result = { ...data };
    
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === 'number' && isNaN(value)) {
        switch (strategy) {
          case 'mean':
            result[key] = this.getDefaultValue(key);
            break;
          case 'median':
            result[key] = this.getDefaultValue(key);
            break;
          case 'ml':
            result[key] = await this.mlBasedImputation(key, data);
            break;
        }
      }
    }

    return result;
  }

  private getDefaultValue(key: string): number {
    const defaults: { [key: string]: number } = {
      capacity: 10,
      efficiency: 18,
      electricityPrice: 2.20,
      interestRate: 7,
      operationalLifetime: 25,
      gridEmissionFactor: 0.95,
      costPerKw: 15000,
      systemSize: 10,
      installationCost: 150000,
      dailyProductionHours: 5,
      degradationRate: 0.5,
      operationalCosts: 5000,
      electricityPriceIncrease: 8,
      financingYears: 10,
      inflationRate: 5,
      discountRate: 8
    };

    return defaults[key] || 0;
  }

  private async mlBasedImputation(key: string, context: any): Promise<number> {
    // Simple ML-based imputation using correlation with other variables
    try {
      const correlatedValues = this.getCorrelatedValues(key, context);
      if (correlatedValues.length > 0) {
        const mean = correlatedValues.reduce((sum, val) => sum + val, 0) / correlatedValues.length;
        return mean;
      }
    } catch (error) {
      console.warn(`ML imputation failed for ${key}, using default value`);
    }
    
    return this.getDefaultValue(key);
  }

  private getCorrelatedValues(key: string, context: any): number[] {
    const correlations: { [key: string]: string[] } = {
      capacity: ['systemSize'],
      systemSize: ['capacity', 'installationCost'],
      installationCost: ['systemSize', 'costPerKw'],
      electricityPrice: ['electricityPriceIncrease'],
      interestRate: ['discountRate', 'inflationRate']
    };

    const relatedKeys = correlations[key] || [];
    const values: number[] = [];

    for (const relatedKey of relatedKeys) {
      const value = context[relatedKey];
      if (typeof value === 'number' && !isNaN(value)) {
        values.push(value);
      }
    }

    return values;
  }
}

export const dataProcessor = new DataProcessor();