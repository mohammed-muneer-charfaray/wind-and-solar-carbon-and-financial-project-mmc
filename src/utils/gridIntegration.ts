import * as tf from '@tensorflow/tfjs';

export interface GridIntegrationConfig {
  gridCapacity: number; // MW
  renewablePercentage: number; // %
  demandProfile: number[]; // Hourly demand in MW
  weatherForecast: WeatherData[];
  maintenanceSchedule: MaintenanceEvent[];
}

export interface WeatherData {
  timestamp: Date;
  solarIrradiance: number; // W/m²
  windSpeed: number; // m/s
  temperature: number; // °C
  humidity: number; // %
  cloudCover: number; // %
}

export interface MaintenanceEvent {
  assetId: string;
  scheduledDate: Date;
  duration: number; // hours
  type: 'preventive' | 'corrective' | 'inspection';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface LoadDistributionResult {
  renewableAllocation: { [assetId: string]: number };
  conventionalBackup: number;
  gridStability: number;
  efficiency: number;
  carbonReduction: number;
}

export class GridIntegrationManager {
  private demandPredictionModel: tf.LayersModel | null = null;
  private loadOptimizationModel: tf.LayersModel | null = null;

  constructor() {
    this.initializeModels();
  }

  private async initializeModels(): Promise<void> {
    try {
      // Demand prediction model
      this.demandPredictionModel = tf.sequential({
        layers: [
          tf.layers.lstm({ units: 50, returnSequences: true, inputShape: [24, 5] }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.lstm({ units: 50, returnSequences: false }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 25, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'linear' })
        ]
      });

      this.demandPredictionModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      // Load optimization model
      this.loadOptimizationModel = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [10], units: 128, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({ units: 64, activation: 'relu' }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'sigmoid' })
        ]
      });

      this.loadOptimizationModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

    } catch (error) {
      console.warn('Grid integration models initialization failed:', error);
    }
  }

  /**
   * Predict energy demand based on historical data and weather forecast
   */
  async predictEnergyDemand(
    historicalDemand: number[],
    weatherForecast: WeatherData[],
    timeHorizon: number = 24
  ): Promise<number[]> {
    if (!this.demandPredictionModel) {
      // Fallback to simple pattern-based prediction
      return this.simpleDemandPrediction(historicalDemand, timeHorizon);
    }

    try {
      // Prepare input features
      const features = this.prepareDemandFeatures(historicalDemand, weatherForecast);
      const prediction = this.demandPredictionModel.predict(features) as tf.Tensor;
      const result = await prediction.data();
      
      features.dispose();
      prediction.dispose();
      
      return Array.from(result);
    } catch (error) {
      console.warn('ML demand prediction failed, using fallback:', error);
      return this.simpleDemandPrediction(historicalDemand, timeHorizon);
    }
  }

  private prepareDemandFeatures(demand: number[], weather: WeatherData[]): tf.Tensor {
    // Combine demand and weather data into feature matrix
    const features: number[][] = [];
    
    for (let i = 0; i < Math.min(24, demand.length); i++) {
      const weatherPoint = weather[i] || weather[weather.length - 1];
      features.push([
        demand[i] || 0,
        weatherPoint.temperature,
        weatherPoint.humidity,
        weatherPoint.cloudCover,
        weatherPoint.solarIrradiance / 1000 // Normalize
      ]);
    }
    
    return tf.tensor3d([features]);
  }

  private simpleDemandPrediction(historicalDemand: number[], timeHorizon: number): number[] {
    // Simple pattern-based prediction using moving average and seasonal patterns
    const prediction: number[] = [];
    const windowSize = Math.min(7, historicalDemand.length);
    
    for (let i = 0; i < timeHorizon; i++) {
      const recentValues = historicalDemand.slice(-windowSize);
      const average = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
      
      // Apply simple seasonal adjustment (higher demand during peak hours)
      const hour = i % 24;
      const seasonalFactor = this.getSeasonalFactor(hour);
      
      prediction.push(average * seasonalFactor);
    }
    
    return prediction;
  }

  private getSeasonalFactor(hour: number): number {
    // Simple seasonal pattern: higher demand during morning and evening peaks
    if (hour >= 6 && hour <= 9) return 1.3; // Morning peak
    if (hour >= 17 && hour <= 21) return 1.4; // Evening peak
    if (hour >= 22 || hour <= 5) return 0.7; // Night time
    return 1.0; // Normal hours
  }

  /**
   * Optimize load distribution across renewable resources
   */
  async optimizeLoadDistribution(
    config: GridIntegrationConfig,
    renewableAssets: { [assetId: string]: { capacity: number; availability: number } }
  ): Promise<LoadDistributionResult> {
    const totalDemand = config.demandProfile.reduce((sum, demand) => sum + demand, 0);
    const totalRenewableCapacity = Object.values(renewableAssets)
      .reduce((sum, asset) => sum + asset.capacity * asset.availability, 0);

    // Calculate optimal allocation
    const allocation: { [assetId: string]: number } = {};
    let remainingDemand = totalDemand;
    
    // Sort assets by efficiency/availability
    const sortedAssets = Object.entries(renewableAssets)
      .sort(([, a], [, b]) => (b.capacity * b.availability) - (a.capacity * a.availability));

    for (const [assetId, asset] of sortedAssets) {
      const maxContribution = asset.capacity * asset.availability;
      const contribution = Math.min(maxContribution, remainingDemand);
      
      allocation[assetId] = contribution;
      remainingDemand -= contribution;
      
      if (remainingDemand <= 0) break;
    }

    // Calculate metrics
    const renewableGeneration = Object.values(allocation).reduce((sum, val) => sum + val, 0);
    const conventionalBackup = Math.max(0, remainingDemand);
    const efficiency = renewableGeneration / totalDemand;
    const gridStability = this.calculateGridStability(config, allocation);
    const carbonReduction = renewableGeneration * 0.95; // kg CO₂ saved

    return {
      renewableAllocation: allocation,
      conventionalBackup,
      gridStability,
      efficiency,
      carbonReduction
    };
  }

  private calculateGridStability(
    config: GridIntegrationConfig,
    allocation: { [assetId: string]: number }
  ): number {
    // Simple stability metric based on renewable percentage and distribution
    const totalAllocation = Object.values(allocation).reduce((sum, val) => sum + val, 0);
    const renewableRatio = totalAllocation / config.gridCapacity;
    
    // Stability decreases with higher renewable percentage due to intermittency
    // but improves with better distribution
    const distributionFactor = Object.keys(allocation).length / 10; // Normalize by expected number of assets
    const stabilityScore = Math.max(0.1, 1 - (renewableRatio * 0.3) + (distributionFactor * 0.2));
    
    return Math.min(1.0, stabilityScore);
  }

  /**
   * Generate predictive maintenance schedule
   */
  generateMaintenanceSchedule(
    assets: { [assetId: string]: { age: number; performance: number; type: string } },
    weatherForecast: WeatherData[],
    demandForecast: number[]
  ): MaintenanceEvent[] {
    const schedule: MaintenanceEvent[] = [];
    const currentDate = new Date();

    for (const [assetId, asset] of Object.entries(assets)) {
      // Age-based maintenance
      if (asset.age > 5) {
        schedule.push({
          assetId,
          scheduledDate: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
          duration: 8,
          type: 'preventive',
          priority: 'medium'
        });
      }

      // Performance-based maintenance
      if (asset.performance < 0.8) {
        schedule.push({
          assetId,
          scheduledDate: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
          duration: 12,
          type: 'corrective',
          priority: 'high'
        });
      }

      // Weather-based maintenance
      const severeWeatherDays = weatherForecast.filter(w => 
        w.windSpeed > 15 || w.temperature > 40 || w.humidity > 90
      );

      if (severeWeatherDays.length > 0) {
        schedule.push({
          assetId,
          scheduledDate: new Date(severeWeatherDays[0].timestamp.getTime() - 24 * 60 * 60 * 1000),
          duration: 4,
          type: 'inspection',
          priority: 'medium'
        });
      }
    }

    // Sort by priority and date
    return schedule.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.scheduledDate.getTime() - b.scheduledDate.getTime();
    });
  }

  /**
   * Simulate grid transition to renewable energy
   */
  simulateGridTransition(
    currentConfig: GridIntegrationConfig,
    targetRenewablePercentage: number,
    transitionYears: number
  ): {
    yearlyProgress: { year: number; renewablePercentage: number; carbonReduction: number }[];
    totalInvestment: number;
    paybackPeriod: number;
  } {
    const yearlyProgress: { year: number; renewablePercentage: number; carbonReduction: number }[] = [];
    const currentYear = new Date().getFullYear();
    
    const startPercentage = currentConfig.renewablePercentage;
    const percentageIncrease = (targetRenewablePercentage - startPercentage) / transitionYears;
    
    let cumulativeCarbonReduction = 0;
    
    for (let year = 0; year <= transitionYears; year++) {
      const renewablePercentage = Math.min(
        targetRenewablePercentage,
        startPercentage + (percentageIncrease * year)
      );
      
      const yearlyGeneration = currentConfig.gridCapacity * 8760 * (renewablePercentage / 100); // MWh
      const carbonReduction = yearlyGeneration * 0.95; // kg CO₂
      cumulativeCarbonReduction += carbonReduction;
      
      yearlyProgress.push({
        year: currentYear + year,
        renewablePercentage,
        carbonReduction: cumulativeCarbonReduction
      });
    }
    
    // Estimate investment and payback
    const additionalCapacity = currentConfig.gridCapacity * (targetRenewablePercentage - startPercentage) / 100;
    const totalInvestment = additionalCapacity * 2000000; // R2M per MW (rough estimate)
    const annualSavings = additionalCapacity * 8760 * 2.20; // R/MWh saved
    const paybackPeriod = totalInvestment / annualSavings;
    
    return {
      yearlyProgress,
      totalInvestment,
      paybackPeriod
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.demandPredictionModel) {
      this.demandPredictionModel.dispose();
      this.demandPredictionModel = null;
    }
    if (this.loadOptimizationModel) {
      this.loadOptimizationModel.dispose();
      this.loadOptimizationModel = null;
    }
  }
}

export const gridIntegrationManager = new GridIntegrationManager();