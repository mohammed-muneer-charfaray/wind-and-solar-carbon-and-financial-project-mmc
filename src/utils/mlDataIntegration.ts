import * as tf from '@tensorflow/tfjs';
import { SystemParameters, FinancialParameters, EnergySourceType, WeatherData } from '../types';
import { dataProcessor } from './dataProcessor';
import { WeatherService } from './weatherService';
import { errorHandler } from './errorHandling';

const weatherService = new WeatherService();

export interface MLIntegratedData {
  systemParams: SystemParameters;
  financialParams: FinancialParameters;
  weatherAdjustedFactors: { [key in EnergySourceType]: number };
  missingDataFlags: string[];
  confidenceScore: number;
  recommendations: string[];
}

export class MLDataIntegrator {
  private static instance: MLDataIntegrator;
  private averageDatabase: Map<string, number> = new Map();
  private weatherModel: tf.LayersModel | null = null;

  private constructor() {
    this.initializeAverageDatabase();
    this.initializeWeatherModel();
  }

  public static getInstance(): MLDataIntegrator {
    if (!MLDataIntegrator.instance) {
      MLDataIntegrator.instance = new MLDataIntegrator();
    }
    return MLDataIntegrator.instance;
  }

  /**
   * Initialize database with frequently used averages for South African context
   */
  private initializeAverageDatabase(): void {
    // Solar energy averages
    this.averageDatabase.set('solar_efficiency', 18.5);
    this.averageDatabase.set('solar_costPerKw', 15000);
    this.averageDatabase.set('solar_dailyProductionHours', 5.2);
    this.averageDatabase.set('solar_degradationRate', 0.5);
    this.averageDatabase.set('solar_operationalCosts', 200);

    // Wind energy averages
    this.averageDatabase.set('wind_efficiency', 35);
    this.averageDatabase.set('wind_costPerKw', 18000);
    this.averageDatabase.set('wind_dailyProductionHours', 8.5);
    this.averageDatabase.set('wind_degradationRate', 0.3);
    this.averageDatabase.set('wind_operationalCosts', 400);

    // Hydro energy averages
    this.averageDatabase.set('hydro_efficiency', 85);
    this.averageDatabase.set('hydro_costPerKw', 25000);
    this.averageDatabase.set('hydro_dailyProductionHours', 20);
    this.averageDatabase.set('hydro_degradationRate', 0.1);
    this.averageDatabase.set('hydro_operationalCosts', 300);

    // Wave energy averages
    this.averageDatabase.set('wave_efficiency', 25);
    this.averageDatabase.set('wave_costPerKw', 35000);
    this.averageDatabase.set('wave_dailyProductionHours', 16);
    this.averageDatabase.set('wave_degradationRate', 0.8);
    this.averageDatabase.set('wave_operationalCosts', 800);

    // Financial averages
    this.averageDatabase.set('electricityPrice', 2.20);
    this.averageDatabase.set('electricityPriceIncrease', 8);
    this.averageDatabase.set('interestRate', 7);
    this.averageDatabase.set('inflationRate', 5);
    this.averageDatabase.set('discountRate', 8);
    this.averageDatabase.set('financingYears', 10);

    // System averages
    this.averageDatabase.set('operationalLifetime', 25);
    this.averageDatabase.set('gridEmissionFactor', 0.95);
  }

  /**
   * Initialize weather prediction model
   */
  private async initializeWeatherModel(): Promise<void> {
    try {
      this.weatherModel = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [8], units: 32, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 4, activation: 'sigmoid' }) // Output: solar, wind, hydro, wave factors
        ]
      });

      this.weatherModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError'
      });
    } catch (error) {
      console.warn('Weather model initialization failed:', error);
    }
  }

  /**
   * Main integration function that processes all inputs with ML enhancement
   */
  async integrateAndAnalyze(
    rawSystemParams: Partial<SystemParameters>,
    rawFinancialParams: Partial<FinancialParameters>
  ): Promise<MLIntegratedData> {
    try {
      // Step 1: Validate and normalize input data
      const systemValidation = dataProcessor.validateData(rawSystemParams);
      const financialValidation = dataProcessor.validateData(rawFinancialParams);

      // Step 2: Fill missing data using ML and averages
      const processedSystemParams = await this.fillMissingSystemData(
        systemValidation.normalizedData
      );
      const processedFinancialParams = await this.fillMissingFinancialData(
        financialValidation.normalizedData
      );

      // Step 3: Get weather data and calculate adjustment factors
      const weatherData = await this.getWeatherData(processedSystemParams.location);
      const weatherFactors = await this.calculateWeatherAdjustedFactors(
        processedSystemParams,
        weatherData
      );

      // Step 4: Calculate confidence score
      const confidenceScore = this.calculateIntegratedConfidence(
        processedSystemParams,
        processedFinancialParams,
        weatherData
      );

      // Step 5: Generate ML-based recommendations
      const recommendations = this.generateMLRecommendations(
        processedSystemParams,
        processedFinancialParams,
        weatherFactors
      );

      // Step 6: Identify missing data flags
      const missingDataFlags = this.identifyMissingDataFlags(
        rawSystemParams,
        rawFinancialParams
      );

      return {
        systemParams: processedSystemParams,
        financialParams: processedFinancialParams,
        weatherAdjustedFactors: weatherFactors,
        missingDataFlags,
        confidenceScore,
        recommendations
      };

    } catch (error) {
      errorHandler.handleError(error as Error, { rawSystemParams, rawFinancialParams }, 'high');
      throw error;
    }
  }

  /**
   * Fill missing system parameters using ML and averages
   */
  private async fillMissingSystemData(
    systemData: Partial<SystemParameters>
  ): Promise<SystemParameters> {
    const filled: SystemParameters = {
      energySources: systemData.energySources || [],
      totalCapacity: 0,
      averageEfficiency: 0,
      gridEmissionFactor: systemData.gridEmissionFactor || this.averageDatabase.get('gridEmissionFactor')!,
      operationalLifetime: systemData.operationalLifetime || this.averageDatabase.get('operationalLifetime')!,
      totalInstallationCost: 0,
      totalOperationalCosts: 0,
      location: systemData.location || {
        latitude: -26.2041, // Johannesburg default
        longitude: 28.0473,
        city: 'Johannesburg',
        country: 'South Africa'
      },
      weatherData: systemData.weatherData
    };

    // If no energy sources specified, create default solar system
    if (filled.energySources.length === 0) {
      filled.energySources.push({
        type: 'solar',
        enabled: true,
        capacity: 10,
        efficiency: this.averageDatabase.get('solar_efficiency')!,
        costPerKw: this.averageDatabase.get('solar_costPerKw')!,
        dailyProductionHours: this.averageDatabase.get('solar_dailyProductionHours')!,
        degradationRate: this.averageDatabase.get('solar_degradationRate')!,
        specificOperationalCosts: this.averageDatabase.get('solar_operationalCosts')!
      });
    }

    // Fill missing data for each energy source
    filled.energySources = filled.energySources.map(source => {
      const sourceType = source.type;
      return {
        ...source,
        capacity: source.capacity || 10,
        efficiency: source.efficiency || this.averageDatabase.get(`${sourceType}_efficiency`)!,
        costPerKw: source.costPerKw || this.averageDatabase.get(`${sourceType}_costPerKw`)!,
        dailyProductionHours: source.dailyProductionHours || this.averageDatabase.get(`${sourceType}_dailyProductionHours`)!,
        degradationRate: source.degradationRate || this.averageDatabase.get(`${sourceType}_degradationRate`)!,
        specificOperationalCosts: source.specificOperationalCosts || this.averageDatabase.get(`${sourceType}_operationalCosts`)!
      };
    });

    // Calculate totals
    filled.totalCapacity = filled.energySources
      .filter(source => source.enabled)
      .reduce((sum, source) => sum + source.capacity, 0);

    filled.averageEfficiency = filled.energySources
      .filter(source => source.enabled)
      .reduce((sum, source, _, arr) => sum + source.efficiency / arr.length, 0);

    filled.totalInstallationCost = filled.energySources
      .filter(source => source.enabled)
      .reduce((sum, source) => sum + (source.capacity * source.costPerKw), 0);

    filled.totalOperationalCosts = filled.energySources
      .filter(source => source.enabled)
      .reduce((sum, source) => sum + (source.capacity * source.specificOperationalCosts), 0);

    return filled;
  }

  /**
   * Fill missing financial parameters
   */
  private async fillMissingFinancialData(
    financialData: Partial<FinancialParameters>
  ): Promise<FinancialParameters> {
    return {
      electricityPrice: financialData.electricityPrice || this.averageDatabase.get('electricityPrice')!,
      electricityPriceIncrease: financialData.electricityPriceIncrease || this.averageDatabase.get('electricityPriceIncrease')!,
      financingYears: financialData.financingYears || this.averageDatabase.get('financingYears')!,
      interestRate: financialData.interestRate || this.averageDatabase.get('interestRate')!,
      inflationRate: financialData.inflationRate || this.averageDatabase.get('inflationRate')!,
      discountRate: financialData.discountRate || this.averageDatabase.get('discountRate')!
    };
  }

  /**
   * Get weather data for the system location
   */
  private async getWeatherData(location: SystemParameters['location']): Promise<WeatherData[]> {
    try {
      const forecast = await weatherService.getWeatherForecast(
        location.latitude,
        location.longitude,
        7 // 7-day forecast
      );
      return forecast;
    } catch (error) {
      console.warn('Weather data retrieval failed, using defaults:', error);
      return [];
    }
  }

  /**
   * Calculate weather-adjusted factors for each energy source
   */
  private async calculateWeatherAdjustedFactors(
    systemParams: SystemParameters,
    weatherData: WeatherData[]
  ): Promise<{ [key in EnergySourceType]: number }> {
    const factors: { [key in EnergySourceType]: number } = {
      solar: 1.0,
      wind: 1.0,
      hydro: 1.0,
      wave: 1.0
    };

    if (weatherData.length === 0) {
      return factors;
    }

    // Use ML model if available, otherwise use conventional calculation
    if (this.weatherModel) {
      try {
        const weatherFeatures = this.prepareWeatherFeatures(weatherData);
        const prediction = this.weatherModel.predict(weatherFeatures) as tf.Tensor;
        const factorValues = await prediction.data();
        
        factors.solar = factorValues[0];
        factors.wind = factorValues[1];
        factors.hydro = factorValues[2];
        factors.wave = factorValues[3];
        
        weatherFeatures.dispose();
        prediction.dispose();
      } catch (error) {
        console.warn('ML weather prediction failed, using conventional method:', error);
        return this.calculateConventionalWeatherFactors(weatherData);
      }
    } else {
      return this.calculateConventionalWeatherFactors(weatherData);
    }

    return factors;
  }

  /**
   * Prepare weather features for ML model
   */
  private prepareWeatherFeatures(weatherData: WeatherData[]): tf.Tensor {
    // Average weather conditions over the forecast period
    const avgWeather = weatherData.reduce((acc, data) => ({
      temperature: acc.temperature + data.temperature / weatherData.length,
      humidity: acc.humidity + data.humidity / weatherData.length,
      windSpeed: acc.windSpeed + data.windSpeed / weatherData.length,
      solarIrradiance: acc.solarIrradiance + data.solarIrradiance / weatherData.length,
      cloudCover: acc.cloudCover + data.cloudCover / weatherData.length,
      precipitation: acc.precipitation + data.precipitation / weatherData.length,
      waveHeight: acc.waveHeight + (data.waveHeight || 0) / weatherData.length,
      waterFlow: acc.waterFlow + (data.waterFlow || 0) / weatherData.length
    }), {
      temperature: 0, humidity: 0, windSpeed: 0, solarIrradiance: 0,
      cloudCover: 0, precipitation: 0, waveHeight: 0, waterFlow: 0
    });

    // Normalize features
    const features = [
      avgWeather.temperature / 40, // Normalize to 0-1
      avgWeather.humidity / 100,
      avgWeather.windSpeed / 30,
      avgWeather.solarIrradiance / 1000,
      avgWeather.cloudCover / 100,
      avgWeather.precipitation / 20,
      avgWeather.waveHeight / 5,
      avgWeather.waterFlow / 200
    ];

    return tf.tensor2d([features]);
  }

  /**
   * Calculate weather factors using conventional methods
   */
  private calculateConventionalWeatherFactors(weatherData: WeatherData[]): { [key in EnergySourceType]: number } {
    const avgWeather = weatherData[0]; // Use first day as representative
    const energyFactors = weatherService.calculateEnergyFactors(avgWeather);

    return {
      solar: energyFactors.solarFactor,
      wind: energyFactors.windFactor,
      hydro: energyFactors.hydroFactor,
      wave: energyFactors.waveFactor
    };
  }

  /**
   * Calculate integrated confidence score
   */
  private calculateIntegratedConfidence(
    systemParams: SystemParameters,
    financialParams: FinancialParameters,
    weatherData: WeatherData[]
  ): number {
    let confidence = 1.0;

    // Reduce confidence for missing weather data
    if (weatherData.length === 0) {
      confidence *= 0.8;
    }

    // Reduce confidence for single energy source (less diversified)
    const enabledSources = systemParams.energySources.filter(s => s.enabled);
    if (enabledSources.length === 1) {
      confidence *= 0.9;
    } else if (enabledSources.length > 3) {
      confidence *= 1.1; // Bonus for diversification
    }

    // Check for extreme values
    if (systemParams.totalCapacity > 1000) {
      confidence *= 0.9; // Large systems have more uncertainty
    }

    if (financialParams.interestRate > 15) {
      confidence *= 0.8; // High interest rates are unusual
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Generate ML-based recommendations
   */
  private generateMLRecommendations(
    systemParams: SystemParameters,
    financialParams: FinancialParameters,
    weatherFactors: { [key in EnergySourceType]: number }
  ): string[] {
    const recommendations: string[] = [];

    // Energy source recommendations based on weather factors
    const sortedFactors = Object.entries(weatherFactors)
      .sort(([,a], [,b]) => b - a);

    if (sortedFactors[0][1] > 0.8) {
      recommendations.push(`Excellent conditions for ${sortedFactors[0][0]} energy (${(sortedFactors[0][1] * 100).toFixed(1)}% efficiency)`);
    }

    // Diversification recommendations
    const enabledSources = systemParams.energySources.filter(s => s.enabled);
    if (enabledSources.length === 1) {
      recommendations.push('Consider diversifying with additional energy sources to reduce weather dependency');
    }

    // Financial recommendations
    if (financialParams.interestRate > 10) {
      recommendations.push('High interest rate detected - consider alternative financing options');
    }

    // Capacity recommendations
    if (systemParams.totalCapacity < 5) {
      recommendations.push('Small system size may result in higher per-kW costs - consider scaling up');
    }

    // Weather-based maintenance recommendations
    const avgWindSpeed = weatherFactors.wind * 15; // Approximate wind speed
    if (avgWindSpeed > 20) {
      recommendations.push('High wind conditions - schedule additional structural inspections');
    }

    return recommendations;
  }

  /**
   * Identify missing data flags
   */
  private identifyMissingDataFlags(
    rawSystemParams: Partial<SystemParameters>,
    rawFinancialParams: Partial<FinancialParameters>
  ): string[] {
    const flags: string[] = [];

    // Check system parameters
    if (!rawSystemParams.energySources || rawSystemParams.energySources.length === 0) {
      flags.push('Energy sources not specified - using default solar configuration');
    }

    if (!rawSystemParams.location) {
      flags.push('Location not specified - using Johannesburg, South Africa as default');
    }

    // Check financial parameters
    if (rawFinancialParams.electricityPrice === undefined) {
      flags.push('Electricity price not specified - using South African average');
    }

    if (rawFinancialParams.interestRate === undefined) {
      flags.push('Interest rate not specified - using market average');
    }

    return flags;
  }

  /**
   * Get average value for a parameter
   */
  getAverage(key: string): number | undefined {
    return this.averageDatabase.get(key);
  }

  /**
   * Update average database with new data
   */
  updateAverage(key: string, value: number): void {
    this.averageDatabase.set(key, value);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.weatherModel) {
      this.weatherModel.dispose();
      this.weatherModel = null;
    }
  }
}

export const mlDataIntegrator = MLDataIntegrator.getInstance();