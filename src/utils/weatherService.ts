export interface WeatherApiResponse {
  current: {
    temp_c: number;
    humidity: number;
    wind_kph: number;
    wind_degree: number;
    uv: number;
    cloud: number;
    precip_mm: number;
    pressure_mb: number;
  };
  forecast: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        avgtemp_c: number;
        maxwind_kph: number;
        avghumidity: number;
        uv: number;
        condition: {
          text: string;
          code: number;
        };
      };
      hour: Array<{
        time: string;
        temp_c: number;
        wind_kph: number;
        wind_degree: number;
        humidity: number;
        cloud: number;
        uv: number;
        precip_mm: number;
      }>;
    }>;
  };
}

export class WeatherService {
  private static instance: WeatherService;
  private apiKey: string = 'demo_key'; // In production, use environment variable
  private baseUrl: string = 'https://api.weatherapi.com/v1';
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout: number = 10 * 60 * 1000; // 10 minutes

  private constructor() {}

  public static getInstance(): WeatherService {
    if (!WeatherService.instance) {
      WeatherService.instance = new WeatherService();
    }
    return WeatherService.instance;
  }

  /**
   * Get current weather data for a location
   */
  async getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData | null> {
    const cacheKey = `current_${latitude}_${longitude}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // For demo purposes, generate realistic weather data
      // In production, replace with actual API call
      const weatherData = this.generateRealisticWeatherData(latitude, longitude);
      
      this.setCachedData(cacheKey, weatherData);
      return weatherData;
    } catch (error) {
      console.warn('Weather API call failed, using fallback data:', error);
      return this.generateFallbackWeatherData(latitude, longitude);
    }
  }

  /**
   * Get weather forecast for multiple days
   */
  async getWeatherForecast(
    latitude: number, 
    longitude: number, 
    days: number = 7
  ): Promise<WeatherData[]> {
    const cacheKey = `forecast_${latitude}_${longitude}_${days}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const forecast = this.generateWeatherForecast(latitude, longitude, days);
      this.setCachedData(cacheKey, forecast);
      return forecast;
    } catch (error) {
      console.warn('Weather forecast failed, using fallback data:', error);
      return this.generateFallbackForecast(latitude, longitude, days);
    }
  }

  /**
   * Generate realistic weather data based on location
   */
  private generateRealisticWeatherData(latitude: number, longitude: number): WeatherData {
    const now = new Date();
    
    // Adjust weather patterns based on location (South Africa focus)
    const isWinterMonth = now.getMonth() >= 5 && now.getMonth() <= 8;
    const isSouthAfrica = latitude < -20 && longitude > 15 && longitude < 35;
    
    let baseTemp = 20;
    let baseWindSpeed = 8;
    let baseSolarIrradiance = 600;
    
    if (isSouthAfrica) {
      baseTemp = isWinterMonth ? 15 : 25;
      baseWindSpeed = 12; // South Africa has good wind resources
      baseSolarIrradiance = isWinterMonth ? 400 : 800;
    }
    
    // Add some randomness for realism
    const tempVariation = (Math.random() - 0.5) * 10;
    const windVariation = (Math.random() - 0.5) * 8;
    const solarVariation = (Math.random() - 0.5) * 200;
    
    return {
      timestamp: now,
      temperature: Math.max(0, baseTemp + tempVariation),
      humidity: Math.max(20, Math.min(90, 60 + (Math.random() - 0.5) * 40)),
      windSpeed: Math.max(0, baseWindSpeed + windVariation),
      windDirection: Math.random() * 360,
      solarIrradiance: Math.max(0, baseSolarIrradiance + solarVariation),
      cloudCover: Math.max(0, Math.min(100, Math.random() * 80)),
      precipitation: Math.random() < 0.2 ? Math.random() * 10 : 0,
      waveHeight: Math.max(0.5, Math.random() * 3), // For coastal areas
      waterFlow: Math.max(10, Math.random() * 100), // For hydro locations
      pressure: 1013 + (Math.random() - 0.5) * 40
    };
  }

  /**
   * Generate weather forecast
   */
  private generateWeatherForecast(
    latitude: number, 
    longitude: number, 
    days: number
  ): WeatherData[] {
    const forecast: WeatherData[] = [];
    const baseWeather = this.generateRealisticWeatherData(latitude, longitude);
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      // Create variations for each day
      const tempTrend = Math.sin(i * 0.5) * 3; // Seasonal variation
      const windTrend = Math.cos(i * 0.3) * 2;
      const solarTrend = Math.sin(i * 0.4) * 100;
      
      forecast.push({
        timestamp: date,
        temperature: Math.max(0, baseWeather.temperature + tempTrend + (Math.random() - 0.5) * 5),
        humidity: Math.max(20, Math.min(90, baseWeather.humidity + (Math.random() - 0.5) * 20)),
        windSpeed: Math.max(0, baseWeather.windSpeed + windTrend + (Math.random() - 0.5) * 3),
        windDirection: (baseWeather.windDirection + (Math.random() - 0.5) * 60) % 360,
        solarIrradiance: Math.max(0, baseWeather.solarIrradiance + solarTrend + (Math.random() - 0.5) * 150),
        cloudCover: Math.max(0, Math.min(100, baseWeather.cloudCover + (Math.random() - 0.5) * 30)),
        precipitation: Math.random() < 0.15 ? Math.random() * 8 : 0,
        waveHeight: Math.max(0.3, baseWeather.waveHeight! + (Math.random() - 0.5) * 1),
        waterFlow: Math.max(5, baseWeather.waterFlow! + (Math.random() - 0.5) * 20),
        pressure: baseWeather.pressure + (Math.random() - 0.5) * 20
      });
    }
    
    return forecast;
  }

  /**
   * Generate fallback weather data when API fails
   */
  private generateFallbackWeatherData(latitude: number, longitude: number): WeatherData {
    return {
      timestamp: new Date(),
      temperature: 22,
      humidity: 65,
      windSpeed: 10,
      windDirection: 180,
      solarIrradiance: 650,
      cloudCover: 30,
      precipitation: 0,
      waveHeight: 1.5,
      waterFlow: 50,
      pressure: 1013
    };
  }

  /**
   * Generate fallback forecast
   */
  private generateFallbackForecast(
    latitude: number, 
    longitude: number, 
    days: number
  ): WeatherData[] {
    const forecast: WeatherData[] = [];
    const baseWeather = this.generateFallbackWeatherData(latitude, longitude);
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      forecast.push({
        ...baseWeather,
        timestamp: date,
        temperature: baseWeather.temperature + (Math.random() - 0.5) * 6,
        windSpeed: baseWeather.windSpeed + (Math.random() - 0.5) * 4,
        solarIrradiance: baseWeather.solarIrradiance + (Math.random() - 0.5) * 200
      });
    }
    
    return forecast;
  }

  /**
   * Cache management
   */
  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Calculate energy production factors based on weather
   */
  calculateEnergyFactors(weatherData: WeatherData): {
    solarFactor: number;
    windFactor: number;
    hydroFactor: number;
    waveFactor: number;
  } {
    // Solar factor based on irradiance and cloud cover
    const maxSolarIrradiance = 1000; // W/m²
    const cloudReduction = (100 - weatherData.cloudCover) / 100;
    const solarFactor = (weatherData.solarIrradiance / maxSolarIrradiance) * cloudReduction;

    // Wind factor based on wind speed (using power curve approximation)
    const cutInSpeed = 3; // m/s
    const ratedSpeed = 12; // m/s
    const cutOutSpeed = 25; // m/s
    
    let windFactor = 0;
    if (weatherData.windSpeed >= cutInSpeed && weatherData.windSpeed <= cutOutSpeed) {
      if (weatherData.windSpeed <= ratedSpeed) {
        windFactor = Math.pow(weatherData.windSpeed / ratedSpeed, 3);
      } else {
        windFactor = 1;
      }
    }

    // Hydro factor based on water flow (simplified)
    const minFlow = 10; // m³/s
    const maxFlow = 100; // m³/s
    const hydroFactor = weatherData.waterFlow ? 
      Math.min(1, Math.max(0, (weatherData.waterFlow - minFlow) / (maxFlow - minFlow))) : 0.7;

    // Wave factor based on wave height
    const minWaveHeight = 0.5; // m
    const maxWaveHeight = 4; // m
    const waveFactor = weatherData.waveHeight ? 
      Math.min(1, Math.max(0, (weatherData.waveHeight - minWaveHeight) / (maxWaveHeight - minWaveHeight))) : 0.6;

    return {
      solarFactor: Math.max(0, Math.min(1, solarFactor)),
      windFactor: Math.max(0, Math.min(1, windFactor)),
      hydroFactor: Math.max(0, Math.min(1, hydroFactor)),
      waveFactor: Math.max(0, Math.min(1, waveFactor))
    };
  }
}

export const weatherService = WeatherService.getInstance();