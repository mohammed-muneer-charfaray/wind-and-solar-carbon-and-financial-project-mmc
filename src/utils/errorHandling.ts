export class CalculationError extends Error {
  public code: string;
  public context: any;

  constructor(message: string, code: string = 'CALC_ERROR', context: any = {}) {
    super(message);
    this.name = 'CalculationError';
    this.code = code;
    this.context = context;
  }
}

export class DataValidationError extends Error {
  public field: string;
  public value: any;

  constructor(message: string, field: string, value: any) {
    super(message);
    this.name = 'DataValidationError';
    this.field = field;
    this.value = value;
  }
}

export class MLModelError extends Error {
  public modelType: string;

  constructor(message: string, modelType: string) {
    super(message);
    this.name = 'MLModelError';
    this.modelType = modelType;
  }
}

export interface ErrorReport {
  timestamp: Date;
  error: Error;
  context: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorReport[] = [];
  private maxLogSize = 100;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public handleError(error: Error, context: any = {}, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    const errorReport: ErrorReport = {
      timestamp: new Date(),
      error,
      context,
      severity,
      resolved: false
    };

    this.errorLog.push(errorReport);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Log to console based on severity
    switch (severity) {
      case 'critical':
        console.error('CRITICAL ERROR:', error.message, context);
        break;
      case 'high':
        console.error('HIGH SEVERITY ERROR:', error.message, context);
        break;
      case 'medium':
        console.warn('MEDIUM SEVERITY ERROR:', error.message, context);
        break;
      case 'low':
        console.info('LOW SEVERITY ERROR:', error.message, context);
        break;
    }

    // Handle specific error types
    if (error instanceof DataValidationError) {
      this.handleDataValidationError(error);
    } else if (error instanceof CalculationError) {
      this.handleCalculationError(error);
    } else if (error instanceof MLModelError) {
      this.handleMLModelError(error);
    }
  }

  private handleDataValidationError(error: DataValidationError): void {
    // Flag NaN values specifically
    if (typeof error.value === 'number' && isNaN(error.value)) {
      console.warn(`NaN detected in field '${error.field}': ${error.message}`);
    }
  }

  private handleCalculationError(error: CalculationError): void {
    // Check for computational interruptions
    if (error.code === 'COMPUTATION_INTERRUPTED') {
      console.error('Computation was interrupted:', error.message);
      // Implement retry logic or fallback calculations
    }
  }

  private handleMLModelError(error: MLModelError): void {
    console.warn(`ML Model '${error.modelType}' error:`, error.message);
    // Fallback to conventional calculations
  }

  public getErrorLog(): ErrorReport[] {
    return [...this.errorLog];
  }

  public getUnresolvedErrors(): ErrorReport[] {
    return this.errorLog.filter(report => !report.resolved);
  }

  public markErrorResolved(timestamp: Date): void {
    const errorReport = this.errorLog.find(report => 
      report.timestamp.getTime() === timestamp.getTime()
    );
    if (errorReport) {
      errorReport.resolved = true;
    }
  }

  public clearErrorLog(): void {
    this.errorLog = [];
  }

  public generateErrorSummary(): {
    total: number;
    bySeverity: { [key: string]: number };
    byType: { [key: string]: number };
    unresolved: number;
  } {
    const summary = {
      total: this.errorLog.length,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byType: {} as { [key: string]: number },
      unresolved: 0
    };

    for (const report of this.errorLog) {
      summary.bySeverity[report.severity]++;
      
      const errorType = report.error.constructor.name;
      summary.byType[errorType] = (summary.byType[errorType] || 0) + 1;
      
      if (!report.resolved) {
        summary.unresolved++;
      }
    }

    return summary;
  }
}

export const errorHandler = ErrorHandler.getInstance();

// Utility functions for common error scenarios
export function validateNumericInput(value: any, fieldName: string, min?: number, max?: number): number {
  if (value === null || value === undefined || value === '') {
    throw new DataValidationError(`${fieldName} is required`, fieldName, value);
  }

  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) {
    throw new DataValidationError(`${fieldName} must be a valid number (NaN detected)`, fieldName, value);
  }

  if (!isFinite(numericValue)) {
    throw new DataValidationError(`${fieldName} must be a finite number`, fieldName, value);
  }

  if (min !== undefined && numericValue < min) {
    throw new DataValidationError(`${fieldName} must be at least ${min}`, fieldName, value);
  }

  if (max !== undefined && numericValue > max) {
    throw new DataValidationError(`${fieldName} must be at most ${max}`, fieldName, value);
  }

  return numericValue;
}

export function safeCalculation<T>(
  calculation: () => T,
  fallback: T,
  context: any = {}
): T {
  try {
    const result = calculation();
    
    // Check for NaN in result
    if (typeof result === 'number' && isNaN(result)) {
      throw new CalculationError('Calculation resulted in NaN', 'NAN_RESULT', context);
    }
    
    return result;
  } catch (error) {
    errorHandler.handleError(
      error instanceof Error ? error : new Error(String(error)),
      context,
      'medium'
    );
    return fallback;
  }
}

export function detectNaNInObject(obj: any, path: string = ''): string[] {
  const nanPaths: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof value === 'number' && isNaN(value)) {
      nanPaths.push(currentPath);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      nanPaths.push(...detectNaNInObject(value, currentPath));
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'number' && isNaN(item)) {
          nanPaths.push(`${currentPath}[${index}]`);
        } else if (typeof item === 'object' && item !== null) {
          nanPaths.push(...detectNaNInObject(item, `${currentPath}[${index}]`));
        }
      });
    }
  }
  
  return nanPaths;
}