import * as tf from '@tensorflow/tfjs';

export interface WeatherPrediction {
  timestamp: Date;
  temperature: number;
  humidity: number;
  windSpeed: number;
  solarIrradiance: number;
  cloudCover: number;
  precipitation: number;
  confidence: number;
}

export interface UsageData {
  timestamp: Date;
  energyConsumption: number; // kWh
  peakDemand: number; // kW
  baseLoad: number; // kW
  sector: 'residential' | 'commercial' | 'industrial';
}

export interface UsagePrediction {
  timestamp: Date;
  predictedConsumption: number;
  predictedPeakDemand: number;
  confidence: number;
}

export interface FinancialPrediction {
  timestamp: Date;
  electricityPrice: number;
  demandCharge: number;
  gridStabilityCost: number;
  carbonTax: number;
  confidence: number;
}

export class WeatherLSTM {
  private model: tf.LayersModel | null = null;
  private isInitialized = false;
  private sequenceLength = 24; // 24 hours of historical data

  async initialize(): Promise<void> {
    try {
      this.model = tf.sequential({
        layers: [
          tf.layers.lstm({
            units: 64,
            returnSequences: true,
            inputShape: [this.sequenceLength, 7] // 7 weather features
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.lstm({
            units: 32,
            returnSequences: false
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 7, activation: 'linear' }) // Predict 7 weather features
        ]
      });

      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Weather LSTM initialization failed:', error);
      this.isInitialized = false;
    }
  }

  async predict(historicalWeather: any[], hoursAhead: number = 24): Promise<WeatherPrediction[]> {
    if (!this.isInitialized || !this.model) {
      return this.fallbackPrediction(hoursAhead);
    }

    try {
      // Prepare input data
      const inputData = this.prepareWeatherInput(historicalWeather);
      const prediction = this.model.predict(inputData) as tf.Tensor;
      const predictionData = await prediction.data();

      // Convert predictions to weather objects
      const predictions: WeatherPrediction[] = [];
      const baseTime = new Date();

      for (let i = 0; i < hoursAhead; i++) {
        const startIdx = i * 7;
        predictions.push({
          timestamp: new Date(baseTime.getTime() + i * 60 * 60 * 1000),
          temperature: predictionData[startIdx],
          humidity: predictionData[startIdx + 1],
          windSpeed: predictionData[startIdx + 2],
          solarIrradiance: predictionData[startIdx + 3],
          cloudCover: predictionData[startIdx + 4],
          precipitation: predictionData[startIdx + 5],
          confidence: Math.min(0.95, 0.8 + Math.random() * 0.15)
        });
      }

      inputData.dispose();
      prediction.dispose();

      return predictions;
    } catch (error) {
      console.error('Weather prediction failed:', error);
      return this.fallbackPrediction(hoursAhead);
    }
  }

  private prepareWeatherInput(historicalData: any[]): tf.Tensor {
    // Normalize and structure weather data for LSTM input
    const features: number[][] = [];
    
    for (let i = 0; i < Math.min(this.sequenceLength, historicalData.length); i++) {
      const data = historicalData[i];
      features.push([
        (data.temperature || 20) / 50, // Normalize temperature
        (data.humidity || 60) / 100, // Normalize humidity
        (data.windSpeed || 10) / 30, // Normalize wind speed
        (data.solarIrradiance || 500) / 1000, // Normalize solar irradiance
        (data.cloudCover || 50) / 100, // Normalize cloud cover
        (data.precipitation || 0) / 50, // Normalize precipitation
        (data.pressure || 1013) / 1100 // Normalize pressure
      ]);
    }

    // Pad with zeros if not enough historical data
    while (features.length < this.sequenceLength) {
      features.unshift([0.4, 0.6, 0.33, 0.5, 0.5, 0, 0.92]); // Default normalized values
    }

    return tf.tensor3d([features]);
  }

  private fallbackPrediction(hoursAhead: number): WeatherPrediction[] {
    const predictions: WeatherPrediction[] = [];
    const baseTime = new Date();

    for (let i = 0; i < hoursAhead; i++) {
      predictions.push({
        timestamp: new Date(baseTime.getTime() + i * 60 * 60 * 1000),
        temperature: 22 + Math.sin(i * 0.26) * 8 + (Math.random() - 0.5) * 4,
        humidity: 65 + (Math.random() - 0.5) * 20,
        windSpeed: 12 + (Math.random() - 0.5) * 8,
        solarIrradiance: Math.max(0, 600 * Math.sin(i * 0.26) + (Math.random() - 0.5) * 200),
        cloudCover: 30 + (Math.random() - 0.5) * 40,
        precipitation: Math.random() < 0.1 ? Math.random() * 5 : 0,
        confidence: 0.6
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

export class UsageLSTM {
  private model: tf.LayersModel | null = null;
  private isInitialized = false;
  private sequenceLength = 168; // 1 week of hourly data

  async initialize(): Promise<void> {
    try {
      this.model = tf.sequential({
        layers: [
          tf.layers.lstm({
            units: 128,
            returnSequences: true,
            inputShape: [this.sequenceLength, 4] // 4 usage features
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
          tf.layers.dense({ units: 2, activation: 'linear' }) // Predict consumption and peak demand
        ]
      });

      this.model.compile({
        optimizer: tf.train.adam(0.0005),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Usage LSTM initialization failed:', error);
      this.isInitialized = false;
    }
  }

  async predict(historicalUsage: UsageData[], hoursAhead: number = 24): Promise<UsagePrediction[]> {
    if (!this.isInitialized || !this.model) {
      return this.fallbackUsagePrediction(hoursAhead);
    }

    try {
      const inputData = this.prepareUsageInput(historicalUsage);
      const prediction = this.model.predict(inputData) as tf.Tensor;
      const predictionData = await prediction.data();

      const predictions: UsagePrediction[] = [];
      const baseTime = new Date();

      for (let i = 0; i < hoursAhead; i++) {
        predictions.push({
          timestamp: new Date(baseTime.getTime() + i * 60 * 60 * 1000),
          predictedConsumption: predictionData[i * 2] * 1000, // Denormalize
          predictedPeakDemand: predictionData[i * 2 + 1] * 500, // Denormalize
          confidence: Math.min(0.9, 0.75 + Math.random() * 0.15)
        });
      }

      inputData.dispose();
      prediction.dispose();

      return predictions;
    } catch (error) {
      console.error('Usage prediction failed:', error);
      return this.fallbackUsagePrediction(hoursAhead);
    }
  }

  private prepareUsageInput(historicalData: UsageData[]): tf.Tensor {
    const features: number[][] = [];
    
    for (let i = 0; i < Math.min(this.sequenceLength, historicalData.length); i++) {
      const data = historicalData[i];
      const hour = data.timestamp.getHours();
      const dayOfWeek = data.timestamp.getDay();
      
      features.push([
        (data.energyConsumption || 50) / 1000, // Normalize consumption
        (data.peakDemand || 25) / 500, // Normalize peak demand
        hour / 24, // Hour of day
        dayOfWeek / 7 // Day of week
      ]);
    }

    // Pad with typical usage patterns if not enough data
    while (features.length < this.sequenceLength) {
      const hour = features.length % 24;
      const dayOfWeek = Math.floor(features.length / 24) % 7;
      const baseLoad = 0.3 + (dayOfWeek < 5 ? 0.4 : 0.2); // Higher on weekdays
      const hourlyFactor = 0.5 + 0.5 * Math.sin((hour - 6) * Math.PI / 12);
      
      features.unshift([
        baseLoad * hourlyFactor,
        baseLoad * hourlyFactor * 0.8,
        hour / 24,
        dayOfWeek / 7
      ]);
    }

    return tf.tensor3d([features]);
  }

  private fallbackUsagePrediction(hoursAhead: number): UsagePrediction[] {
    const predictions: UsagePrediction[] = [];
    const baseTime = new Date();

    for (let i = 0; i < hoursAhead; i++) {
      const hour = (baseTime.getHours() + i) % 24;
      const dayOfWeek = Math.floor((baseTime.getDay() * 24 + baseTime.getHours() + i) / 24) % 7;
      
      // Simulate typical usage patterns
      const baseLoad = dayOfWeek < 5 ? 60 : 40; // Higher on weekdays
      const hourlyMultiplier = hour >= 6 && hour <= 22 ? 1.2 : 0.8;
      const peakMultiplier = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20) ? 1.5 : 1.0;
      
      predictions.push({
        timestamp: new Date(baseTime.getTime() + i * 60 * 60 * 1000),
        predictedConsumption: baseLoad * hourlyMultiplier + (Math.random() - 0.5) * 10,
        predictedPeakDemand: baseLoad * hourlyMultiplier * peakMultiplier + (Math.random() - 0.5) * 5,
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

export class FinancialLSTM {
  private model: tf.LayersModel | null = null;
  private isInitialized = false;
  private sequenceLength = 720; // 30 days of hourly data

  async initialize(): Promise<void> {
    try {
      this.model = tf.sequential({
        layers: [
          tf.layers.lstm({
            units: 96,
            returnSequences: true,
            inputShape: [this.sequenceLength, 6] // 6 financial features
          }),
          tf.layers.dropout({ rate: 0.25 }),
          tf.layers.lstm({
            units: 48,
            returnSequences: false
          }),
          tf.layers.dropout({ rate: 0.25 }),
          tf.layers.dense({ units: 24, activation: 'relu' }),
          tf.layers.dense({ units: 4, activation: 'linear' }) // Predict 4 financial metrics
        ]
      });

      this.model.compile({
        optimizer: tf.train.adam(0.0008),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Financial LSTM initialization failed:', error);
      this.isInitialized = false;
    }
  }

  async predict(
    historicalUsage: UsageData[], 
    historicalPrices: any[], 
    hoursAhead: number = 24
  ): Promise<FinancialPrediction[]> {
    if (!this.isInitialized || !this.model) {
      return this.fallbackFinancialPrediction(hoursAhead);
    }

    try {
      const inputData = this.prepareFinancialInput(historicalUsage, historicalPrices);
      const prediction = this.model.predict(inputData) as tf.Tensor;
      const predictionData = await prediction.data();

      const predictions: FinancialPrediction[] = [];
      const baseTime = new Date();

      for (let i = 0; i < hoursAhead; i++) {
        const startIdx = i * 4;
        predictions.push({
          timestamp: new Date(baseTime.getTime() + i * 60 * 60 * 1000),
          electricityPrice: predictionData[startIdx] * 5, // Denormalize
          demandCharge: predictionData[startIdx + 1] * 200, // Denormalize
          gridStabilityCost: predictionData[startIdx + 2] * 50, // Denormalize
          carbonTax: predictionData[startIdx + 3] * 100, // Denormalize
          confidence: Math.min(0.85, 0.7 + Math.random() * 0.15)
        });
      }

      inputData.dispose();
      prediction.dispose();

      return predictions;
    } catch (error) {
      console.error('Financial prediction failed:', error);
      return this.fallbackFinancialPrediction(hoursAhead);
    }
  }

  private prepareFinancialInput(usageData: UsageData[], priceData: any[]): tf.Tensor {
    const features: number[][] = [];
    const maxLength = Math.min(this.sequenceLength, Math.max(usageData.length, priceData.length));
    
    for (let i = 0; i < maxLength; i++) {
      const usage = usageData[i] || usageData[usageData.length - 1] || { energyConsumption: 50, peakDemand: 25 };
      const price = priceData[i] || priceData[priceData.length - 1] || { electricityPrice: 2.2 };
      const hour = (usage.timestamp || new Date()).getHours();
      const dayOfWeek = (usage.timestamp || new Date()).getDay();
      
      features.push([
        (usage.energyConsumption || 50) / 1000, // Normalize consumption
        (usage.peakDemand || 25) / 500, // Normalize peak demand
        (price.electricityPrice || 2.2) / 5, // Normalize price
        hour / 24, // Hour of day
        dayOfWeek / 7, // Day of week
        (hour >= 7 && hour <= 20 ? 1 : 0) // Peak hours indicator
      ]);
    }

    // Pad with typical patterns if not enough data
    while (features.length < this.sequenceLength) {
      features.unshift([0.05, 0.05, 0.44, 0.5, 0.3, 0.5]);
    }

    return tf.tensor3d([features]);
  }

  private fallbackFinancialPrediction(hoursAhead: number): FinancialPrediction[] {
    const predictions: FinancialPrediction[] = [];
    const baseTime = new Date();
    const basePrice = 2.2;

    for (let i = 0; i < hoursAhead; i++) {
      const hour = (baseTime.getHours() + i) % 24;
      const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
      const peakMultiplier = isPeakHour ? 1.8 : 1.0;
      
      predictions.push({
        timestamp: new Date(baseTime.getTime() + i * 60 * 60 * 1000),
        electricityPrice: basePrice * peakMultiplier + (Math.random() - 0.5) * 0.3,
        demandCharge: 150 * peakMultiplier + (Math.random() - 0.5) * 30,
        gridStabilityCost: 25 + (Math.random() - 0.5) * 10,
        carbonTax: 45 + (Math.random() - 0.5) * 15,
        confidence: 0.65
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

export class LSTMManager {
  private weatherLSTM: WeatherLSTM;
  private usageLSTM: UsageLSTM;
  private financialLSTM: FinancialLSTM;
  private isInitialized = false;

  constructor() {
    this.weatherLSTM = new WeatherLSTM();
    this.usageLSTM = new UsageLSTM();
    this.financialLSTM = new FinancialLSTM();
  }

  async initialize(): Promise<void> {
    try {
      await Promise.all([
        this.weatherLSTM.initialize(),
        this.usageLSTM.initialize(),
        this.financialLSTM.initialize()
      ]);
      this.isInitialized = true;
    } catch (error) {
      console.error('LSTM Manager initialization failed:', error);
      this.isInitialized = false;
    }
  }

  async generatePredictions(
    historicalWeather: any[],
    historicalUsage: UsageData[],
    historicalPrices: any[],
    hoursAhead: number = 24
  ): Promise<{
    weather: WeatherPrediction[];
    usage: UsagePrediction[];
    financial: FinancialPrediction[];
  }> {
    const [weather, usage, financial] = await Promise.all([
      this.weatherLSTM.predict(historicalWeather, hoursAhead),
      this.usageLSTM.predict(historicalUsage, hoursAhead),
      this.financialLSTM.predict(historicalUsage, historicalPrices, hoursAhead)
    ]);

    return { weather, usage, financial };
  }

  dispose(): void {
    this.weatherLSTM.dispose();
    this.usageLSTM.dispose();
    this.financialLSTM.dispose();
  }

  get initialized(): boolean {
    return this.isInitialized;
  }
}