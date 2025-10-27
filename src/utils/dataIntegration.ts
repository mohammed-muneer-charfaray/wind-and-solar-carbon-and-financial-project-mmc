import { localStorageManager, DataRecord } from './localStorageManager';
import { SystemParameters, FinancialParameters, WeatherData } from '../types';

export interface StoredSystemConfiguration {
  id: string;
  name: string;
  description?: string;
  systemParams: SystemParameters;
  financialParams: FinancialParameters;
  createdAt: Date;
  lastModified: Date;
}

export interface StoredCalculationResult {
  id: string;
  configurationId: string;
  results: any;
  weatherData?: WeatherData[];
  usageData?: any[];
  mlAnalysis?: any;
  createdAt: Date;
}

export class DataIntegrationService {
  private static instance: DataIntegrationService;

  private constructor() {}

  public static getInstance(): DataIntegrationService {
    if (!DataIntegrationService.instance) {
      DataIntegrationService.instance = new DataIntegrationService();
    }
    return DataIntegrationService.instance;
  }

  /**
   * Save system configuration
   */
  async saveSystemConfiguration(
    name: string,
    systemParams: SystemParameters,
    financialParams: FinancialParameters,
    description?: string
  ): Promise<string> {
    const config: StoredSystemConfiguration = {
      id: this.generateId(),
      name,
      description,
      systemParams,
      financialParams,
      createdAt: new Date(),
      lastModified: new Date()
    };

    const recordId = await localStorageManager.storeData('system', config, {
      source: 'user_input',
      version: '1.0'
    });

    return recordId;
  }

  /**
   * Load system configuration
   */
  async loadSystemConfiguration(id: string): Promise<StoredSystemConfiguration | null> {
    const record = await localStorageManager.retrieveData(id);
    return record?.data as StoredSystemConfiguration || null;
  }

  /**
   * Get all system configurations
   */
  async getAllSystemConfigurations(): Promise<StoredSystemConfiguration[]> {
    const records = await localStorageManager.queryData('system');
    return records.map(record => record.data as StoredSystemConfiguration);
  }

  /**
   * Save calculation results
   */
  async saveCalculationResults(
    configurationId: string,
    results: any,
    weatherData?: WeatherData[],
    usageData?: any[],
    mlAnalysis?: any
  ): Promise<string> {
    const resultData: StoredCalculationResult = {
      id: this.generateId(),
      configurationId,
      results,
      weatherData,
      usageData,
      mlAnalysis,
      createdAt: new Date()
    };

    const recordId = await localStorageManager.storeData('results', resultData, {
      source: 'calculation_engine',
      version: '1.0'
    });

    return recordId;
  }

  /**
   * Load calculation results
   */
  async loadCalculationResults(id: string): Promise<StoredCalculationResult | null> {
    const record = await localStorageManager.retrieveData(id);
    return record?.data as StoredCalculationResult || null;
  }

  /**
   * Save weather data
   */
  async saveWeatherData(
    location: { latitude: number; longitude: number; city: string },
    weatherData: WeatherData[]
  ): Promise<string> {
    const data = {
      location,
      weatherData,
      retrievedAt: new Date()
    };

    const recordId = await localStorageManager.storeData('weather', data, {
      source: 'weather_service',
      version: '1.0'
    });

    return recordId;
  }

  /**
   * Load weather data for location
   */
  async loadWeatherData(
    latitude: number,
    longitude: number,
    maxAge: number = 3600000 // 1 hour in milliseconds
  ): Promise<WeatherData[] | null> {
    const cutoffTime = new Date(Date.now() - maxAge);
    const records = await localStorageManager.queryData('weather', cutoffTime);

    // Find matching location (within 0.1 degree tolerance)
    const matchingRecord = records.find(record => {
      const data = record.data;
      const latDiff = Math.abs(data.location.latitude - latitude);
      const lonDiff = Math.abs(data.location.longitude - longitude);
      return latDiff < 0.1 && lonDiff < 0.1;
    });

    return matchingRecord?.data.weatherData || null;
  }

  /**
   * Save usage data from Excel import
   */
  async saveUsageData(
    filename: string,
    usageData: any[],
    metadata?: any
  ): Promise<string> {
    const data = {
      filename,
      usageData,
      importedAt: new Date(),
      recordCount: usageData.length,
      metadata
    };

    const recordId = await localStorageManager.storeData('usage', data, {
      source: 'excel_import',
      version: '1.0'
    });

    return recordId;
  }

  /**
   * Load usage data
   */
  async loadUsageData(filename?: string): Promise<any[] | null> {
    const records = await localStorageManager.queryData('usage');

    if (filename) {
      const matchingRecord = records.find(record => 
        record.data.filename === filename
      );
      return matchingRecord?.data.usageData || null;
    }

    // Return most recent usage data
    const sortedRecords = records.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return sortedRecords[0]?.data.usageData || null;
  }

  /**
   * Save ML model data
   */
  async saveMLModel(
    modelType: string,
    modelData: any,
    performance?: any
  ): Promise<string> {
    const data = {
      modelType,
      modelData,
      performance,
      trainedAt: new Date()
    };

    const recordId = await localStorageManager.storeData('ml_model', data, {
      source: 'ml_training',
      version: '1.0'
    });

    return recordId;
  }

  /**
   * Load ML model data
   */
  async loadMLModel(modelType: string): Promise<any | null> {
    const records = await localStorageManager.queryData('ml_model');
    
    const matchingRecord = records.find(record => 
      record.data.modelType === modelType
    );

    return matchingRecord?.data.modelData || null;
  }

  /**
   * Save financial data
   */
  async saveFinancialData(
    source: string,
    financialData: any[]
  ): Promise<string> {
    const data = {
      source,
      financialData,
      savedAt: new Date()
    };

    const recordId = await localStorageManager.storeData('financial', data, {
      source: source,
      version: '1.0'
    });

    return recordId;
  }

  /**
   * Auto-save functionality
   */
  async enableAutoSave(
    configurationId: string,
    interval: number = 300000 // 5 minutes
  ): Promise<void> {
    setInterval(async () => {
      try {
        // Auto-save current state
        const timestamp = new Date();
        await localStorageManager.storeData('system', {
          autoSave: true,
          configurationId,
          timestamp
        }, {
          source: 'auto_save',
          version: '1.0'
        });
      } catch (error) {
        console.warn('Auto-save failed:', error);
      }
    }, interval);
  }

  /**
   * Data synchronization between components
   */
  async syncData(): Promise<void> {
    // Implement data synchronization logic
    // This could include checking for data consistency,
    // updating cached values, etc.
  }

  /**
   * Clean up old data
   */
  async cleanupOldData(maxAge: number = 2592000000): Promise<number> {
    // 30 days in milliseconds
    const cutoffTime = new Date(Date.now() - maxAge);
    let deletedCount = 0;

    const types: DataRecord['type'][] = ['weather', 'usage', 'financial', 'results'];
    
    for (const type of types) {
      const oldRecords = await localStorageManager.queryData(type, undefined, cutoffTime);
      // Note: This would require implementing a delete method in localStorageManager
      deletedCount += oldRecords.length;
    }

    return deletedCount;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const dataIntegrationService = DataIntegrationService.getInstance();