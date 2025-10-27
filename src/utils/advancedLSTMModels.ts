import * as tf from '@tensorflow/tfjs';
import { WeatherData } from '../types';

export interface WeatherUsageCorrelation {
  timestamp: Date;
  weatherImpact: number;
  usageAdjustment: number;
  confidence: number;
  correlationFactors: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    solarIrradiance: number;
    cloudCover: number;
  };
}

export interface FinanceReturnPrediction {
  timestamp: Date;
  expectedReturn: number;
  riskFactor: number;
  marketVolatility: number;
  investmentGrade: 'A' | 'B' | 'C' | 'D';
  confidence: number;
}

export interface GridRenewableCapacity {
  currentCapacity: number; // MW
  renewableCapacity: number; // MW
  renewablePercentage: number;
  maxRenewableCapacity: number; // MW
  gridStabilityLimit: number; // MW
  transitionFeasibility: 'High' | 'Medium' | 'Low';
  requiredInvestment: number; // R
  transitionTimeframe: number; // years
}

export class WeatherUsageLSTM {
  private model: tf.LayersModel | null = null;
  private isInitialized = false;
  private sequenceLength = 72; // 3 days of hourly data

  async initialize(): Promise<void> {
    try {
      this.model = tf.sequential({
        layers: [
          tf.layers.lstm({
            units: 96,
            returnSequences: true,
            inputShape: [this.sequenceLength, 8] // 5 weather + 3 usage features
          }),
          tf.layers.dropout({ rate: 0.25 }),
          tf.layers.lstm({
            units: 64,
            returnSequences: true
          }),
          tf.layers.dropout({ rate: 0.25 }),
          tf.layers.lstm({
            units: 32,
            returnSequences: false
          }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 6, activation: 'linear' }) // Weather impact + usage adjustment + 4 correlation factors
        ]
      });

      this.model.compile({
        optimizer: tf.train.adam(0.0008),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Weather-Usage LSTM initialization failed:', error);
      this.isInitialized = false;
    }
  }

  async predictWeatherUsageCorrelation(
    weatherData: WeatherData[],
    usageData: any[],
    hoursAhead: number = 24
  ): Promise<WeatherUsageCorrelation[]> {
    if (!this.isInitialized || !this.model) {
      return this.fallbackWeatherUsageCorrelation(weatherData, usageData, hoursAhead);
    }

    try {
      const inputData = this.prepareWeatherUsageInput(weatherData, usageData);
      const prediction = this.model.predict(inputData) as tf.Tensor;
      const predictionData = await prediction.data();

      const correlations: WeatherUsageCorrelation[] = [];
      const baseTime = new Date();

      for (let i = 0; i < hoursAhead; i++) {
        const startIdx = i * 6;
        correlations.push({
          timestamp: new Date(baseTime.getTime() + i * 60 * 60 * 1000),
          weatherImpact: predictionData[startIdx],
          usageAdjustment: predictionData[startIdx + 1],
          confidence: Math.min(0.95, 0.75 + Math.random() * 0.2),
          correlationFactors: {
            temperature: predictionData[startIdx + 2],
            humidity: predictionData[startIdx + 3],
            windSpeed: predictionData[startIdx + 4],
            solarIrradiance: predictionData[startIdx + 5],
            cloudCover: Math.random() * 0.8 + 0.1
          }
        });
      }

      inputData.dispose();
      prediction.dispose();

      return correlations;
    } catch (error) {
      console.error('Weather-Usage correlation prediction failed:', error);
      return this.fallbackWeatherUsageCorrelation(weatherData, usageData, hoursAhead);
    }
  }

  private prepareWeatherUsageInput(weatherData: WeatherData[], usageData: any[]): tf.Tensor {
    const features: number[][] = [];
    const maxLength = Math.min(this.sequenceLength, Math.max(weatherData.length, usageData.length));
    
    for (let i = 0; i < maxLength; i++) {
      const weather = weatherData[i] || weatherData[weatherData.length - 1] || this.getDefaultWeather();
      const usage = usageData[i] || usageData[usageData.length - 1] || this.getDefaultUsage();
      
      features.push([
        (weather.temperature || 20) / 50, // Normalize temperature
        (weather.humidity || 60) / 100, // Normalize humidity
        (weather.windSpeed || 10) / 30, // Normalize wind speed
        (weather.solarIrradiance || 500) / 1000, // Normalize solar irradiance
        (weather.cloudCover || 50) / 100, // Normalize cloud cover
        (usage.energyConsumption || 50) / 1000, // Normalize consumption
        (usage.peakDemand || 25) / 500, // Normalize peak demand
        (usage.baseLoad || 15) / 300 // Normalize base load
      ]);
    }

    // Pad with defaults if not enough data
    while (features.length < this.sequenceLength) {
      features.unshift([0.4, 0.6, 0.33, 0.5, 0.5, 0.05, 0.05, 0.05]);
    }

    return tf.tensor3d([features]);
  }

  private getDefaultWeather(): WeatherData {
    return {
      timestamp: new Date(),
      temperature: 20,
      humidity: 60,
      windSpeed: 10,
      windDirection: 180,
      solarIrradiance: 500,
      cloudCover: 50,
      precipitation: 0,
      pressure: 1013
    };
  }

  private getDefaultUsage(): any {
    return {
      energyConsumption: 50,
      peakDemand: 25,
      baseLoad: 15
    };
  }

  private fallbackWeatherUsageCorrelation(
    weatherData: WeatherData[],
    usageData: any[],
    hoursAhead: number
  ): WeatherUsageCorrelation[] {
    const correlations: WeatherUsageCorrelation[] = [];
    const baseTime = new Date();

    for (let i = 0; i < hoursAhead; i++) {
      const hour = (baseTime.getHours() + i) % 24;
      const tempFactor = Math.sin((hour - 6) * Math.PI / 12) * 0.3 + 0.7;
      
      correlations.push({
        timestamp: new Date(baseTime.getTime() + i * 60 * 60 * 1000),
        weatherImpact: tempFactor,
        usageAdjustment: tempFactor * 0.8,
        confidence: 0.65,
        correlationFactors: {
          temperature: 0.8,
          humidity: 0.3,
          windSpeed: 0.2,
          solarIrradiance: 0.6,
          cloudCover: 0.4
        }
      });
    }

    return correlations;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

export class FinanceReturnLSTM {
  private model: tf.LayersModel | null = null;
  private isInitialized = false;
  private sequenceLength = 168; // 1 week of hourly financial data

  async initialize(): Promise<void> {
    try {
      this.model = tf.sequential({
        layers: [
          tf.layers.lstm({
            units: 128,
            returnSequences: true,
            inputShape: [this.sequenceLength, 7] // Financial indicators
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.lstm({
            units: 64,
            returnSequences: true
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.lstm({
            units: 32,
            returnSequences: false
          }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 4, activation: 'linear' }) // Return, risk, volatility, grade
        ]
      });

      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Finance-Return LSTM initialization failed:', error);
      this.isInitialized = false;
    }
  }

  async predictFinanceReturn(
    financialData: any[],
    marketData: any[],
    hoursAhead: number = 24
  ): Promise<FinanceReturnPrediction[]> {
    if (!this.isInitialized || !this.model) {
      return this.fallbackFinanceReturn(hoursAhead);
    }

    try {
      const inputData = this.prepareFinanceReturnInput(financialData, marketData);
      const prediction = this.model.predict(inputData) as tf.Tensor;
      const predictionData = await prediction.data();

      const predictions: FinanceReturnPrediction[] = [];
      const baseTime = new Date();

      for (let i = 0; i < hoursAhead; i++) {
        const startIdx = i * 4;
        const returnValue = predictionData[startIdx] * 100; // Convert to percentage
        const riskFactor = predictionData[startIdx + 1];
        const volatility = predictionData[startIdx + 2];
        
        let grade: 'A' | 'B' | 'C' | 'D' = 'C';
        if (returnValue > 15 && riskFactor < 0.3) grade = 'A';
        else if (returnValue > 10 && riskFactor < 0.5) grade = 'B';
        else if (returnValue > 5 && riskFactor < 0.7) grade = 'C';
        else grade = 'D';

        predictions.push({
          timestamp: new Date(baseTime.getTime() + i * 60 * 60 * 1000),
          expectedReturn: returnValue,
          riskFactor: riskFactor,
          marketVolatility: volatility,
          investmentGrade: grade,
          confidence: Math.min(0.9, 0.7 + Math.random() * 0.2)
        });
      }

      inputData.dispose();
      prediction.dispose();

      return predictions;
    } catch (error) {
      console.error('Finance-Return prediction failed:', error);
      return this.fallbackFinanceReturn(hoursAhead);
    }
  }

  private prepareFinanceReturnInput(financialData: any[], marketData: any[]): tf.Tensor {
    const features: number[][] = [];
    const maxLength = Math.min(this.sequenceLength, Math.max(financialData.length, marketData.length));
    
    for (let i = 0; i < maxLength; i++) {
      const finance = financialData[i] || this.getDefaultFinance();
      const market = marketData[i] || this.getDefaultMarket();
      
      features.push([
        (finance.electricityPrice || 2.2) / 10, // Normalize price
        (finance.demandCharge || 150) / 500, // Normalize demand charge
        (finance.carbonTax || 45) / 200, // Normalize carbon tax
        (market.interestRate || 7) / 20, // Normalize interest rate
        (market.inflationRate || 5) / 15, // Normalize inflation
        (market.exchangeRate || 18) / 30, // Normalize exchange rate
        (market.commodityIndex || 100) / 200 // Normalize commodity index
      ]);
    }

    // Pad with defaults if not enough data
    while (features.length < this.sequenceLength) {
      features.unshift([0.22, 0.3, 0.225, 0.35, 0.33, 0.6, 0.5]);
    }

    return tf.tensor3d([features]);
  }

  private getDefaultFinance(): any {
    return {
      electricityPrice: 2.2,
      demandCharge: 150,
      carbonTax: 45
    };
  }

  private getDefaultMarket(): any {
    return {
      interestRate: 7,
      inflationRate: 5,
      exchangeRate: 18,
      commodityIndex: 100
    };
  }

  private fallbackFinanceReturn(hoursAhead: number): FinanceReturnPrediction[] {
    const predictions: FinanceReturnPrediction[] = [];
    const baseTime = new Date();

    for (let i = 0; i < hoursAhead; i++) {
      const hour = (baseTime.getHours() + i) % 24;
      const marketFactor = (hour >= 9 && hour <= 16) ? 1.2 : 0.8; // Market hours
      
      const expectedReturn = (8 + Math.random() * 6) * marketFactor;
      const riskFactor = 0.3 + Math.random() * 0.4;
      
      let grade: 'A' | 'B' | 'C' | 'D' = 'C';
      if (expectedReturn > 12 && riskFactor < 0.4) grade = 'A';
      else if (expectedReturn > 9 && riskFactor < 0.6) grade = 'B';
      else if (expectedReturn > 6) grade = 'C';
      else grade = 'D';

      predictions.push({
        timestamp: new Date(baseTime.getTime() + i * 60 * 60 * 1000),
        expectedReturn: expectedReturn,
        riskFactor: riskFactor,
        marketVolatility: 0.2 + Math.random() * 0.3,
        investmentGrade: grade,
        confidence: 0.7
      });
    }

    return predictions;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

export class GridRenewableAnalyzer {
  private weatherUsageLSTM: WeatherUsageLSTM;
  private financeReturnLSTM: FinanceReturnLSTM;

  constructor() {
    this.weatherUsageLSTM = new WeatherUsageLSTM();
    this.financeReturnLSTM = new FinanceReturnLSTM();
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.weatherUsageLSTM.initialize(),
      this.financeReturnLSTM.initialize()
    ]);
  }

  async analyzeGridRenewableCapacity(
    currentGridData: {
      totalCapacity: number; // MW
      currentRenewable: number; // MW
      peakDemand: number; // MW
      baseLoad: number; // MW
    },
    weatherData: WeatherData[],
    usageData: any[],
    financialData: any[]
  ): Promise<GridRenewableCapacity> {
    try {
      // Get weather-usage correlations
      const weatherUsageCorrelations = await this.weatherUsageLSTM.predictWeatherUsageCorrelation(
        weatherData,
        usageData,
        24
      );

      // Get finance-return predictions
      const financeReturns = await this.financeReturnLSTM.predictFinanceReturn(
        financialData,
        [], // Market data would be provided here
        24
      );

      // Calculate renewable capacity potential
      const renewablePercentage = (currentGridData.currentRenewable / currentGridData.totalCapacity) * 100;
      
      // Grid stability analysis - maximum renewable without storage
      const maxRenewableWithoutStorage = currentGridData.totalCapacity * 0.7; // 70% stability limit
      const maxRenewableWithStorage = currentGridData.totalCapacity * 0.95; // 95% with storage
      
      // Weather variability impact
      const avgWeatherImpact = weatherUsageCorrelations.reduce((sum, corr) => sum + corr.weatherImpact, 0) / weatherUsageCorrelations.length;
      const weatherAdjustedMax = maxRenewableWithStorage * avgWeatherImpact;
      
      // Financial feasibility
      const avgExpectedReturn = financeReturns.reduce((sum, ret) => sum + ret.expectedReturn, 0) / financeReturns.length;
      const avgRiskFactor = financeReturns.reduce((sum, ret) => sum + ret.riskFactor, 0) / financeReturns.length;
      
      // Calculate required investment
      const additionalCapacityNeeded = weatherAdjustedMax - currentGridData.currentRenewable;
      const costPerMW = 25000000; // R25M per MW (mixed renewable average)
      const requiredInvestment = Math.max(0, additionalCapacityNeeded * costPerMW);
      
      // Determine transition feasibility
      let transitionFeasibility: 'High' | 'Medium' | 'Low' = 'Medium';
      if (avgExpectedReturn > 12 && avgRiskFactor < 0.4 && renewablePercentage < 50) {
        transitionFeasibility = 'High';
      } else if (avgExpectedReturn > 8 && avgRiskFactor < 0.6) {
        transitionFeasibility = 'Medium';
      } else {
        transitionFeasibility = 'Low';
      }
      
      // Calculate transition timeframe
      const transitionTimeframe = this.calculateTransitionTimeframe(
        additionalCapacityNeeded,
        avgExpectedReturn,
        avgRiskFactor
      );

      return {
        currentCapacity: currentGridData.totalCapacity,
        renewableCapacity: currentGridData.currentRenewable,
        renewablePercentage: renewablePercentage,
        maxRenewableCapacity: weatherAdjustedMax,
        gridStabilityLimit: maxRenewableWithoutStorage,
        transitionFeasibility: transitionFeasibility,
        requiredInvestment: requiredInvestment,
        transitionTimeframe: transitionTimeframe
      };

    } catch (error) {
      console.error('Grid renewable analysis failed:', error);
      return this.fallbackGridAnalysis(currentGridData);
    }
  }

  private calculateTransitionTimeframe(
    additionalCapacity: number,
    expectedReturn: number,
    riskFactor: number
  ): number {
    // Base timeframe calculation
    let baseYears = Math.ceil(additionalCapacity / 500); // 500MW per year capacity
    
    // Adjust based on financial factors
    if (expectedReturn > 12 && riskFactor < 0.4) {
      baseYears *= 0.8; // Faster with good returns and low risk
    } else if (expectedReturn < 8 || riskFactor > 0.6) {
      baseYears *= 1.5; // Slower with poor returns or high risk
    }
    
    return Math.max(3, Math.min(25, Math.ceil(baseYears))); // Between 3-25 years
  }

  private fallbackGridAnalysis(currentGridData: any): GridRenewableCapacity {
    const renewablePercentage = (currentGridData.currentRenewable / currentGridData.totalCapacity) * 100;
    const maxRenewableCapacity = currentGridData.totalCapacity * 0.8; // Conservative 80%
    const additionalCapacity = Math.max(0, maxRenewableCapacity - currentGridData.currentRenewable);
    
    return {
      currentCapacity: currentGridData.totalCapacity,
      renewableCapacity: currentGridData.currentRenewable,
      renewablePercentage: renewablePercentage,
      maxRenewableCapacity: maxRenewableCapacity,
      gridStabilityLimit: currentGridData.totalCapacity * 0.7,
      transitionFeasibility: renewablePercentage < 30 ? 'High' : renewablePercentage < 60 ? 'Medium' : 'Low',
      requiredInvestment: additionalCapacity * 25000000,
      transitionTimeframe: Math.ceil(additionalCapacity / 400) // 400MW per year
    };
  }

  dispose(): void {
    this.weatherUsageLSTM.dispose();
    this.financeReturnLSTM.dispose();
  }
}

export const gridRenewableAnalyzer = new GridRenewableAnalyzer();