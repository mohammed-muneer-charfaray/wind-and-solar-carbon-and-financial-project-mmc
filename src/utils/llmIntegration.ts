import { WeatherPrediction, UsagePrediction, FinancialPrediction } from './lstmModels';

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  distanceToCoast: number;
  elevation: number;
  nearestWaterBody?: string;
}

export interface RenewableRecommendation {
  energyType: 'solar' | 'wind' | 'hydro' | 'wave';
  recommended: boolean;
  capacity: number; // kW
  confidence: number;
  reasoning: string;
  priority: number;
}

export interface BackupPowerRequirement {
  required: boolean;
  capacity: number; // kW
  type: 'battery' | 'generator' | 'grid';
  duration: number; // hours
  reasoning: string;
}

export interface LLMAnalysis {
  location: LocationData;
  renewableRecommendations: RenewableRecommendation[];
  backupRequirement: BackupPowerRequirement;
  totalRecommendedCapacity: number;
  estimatedCost: number;
  confidence: number;
  reasoning: string[];
}

export class LLMIntegration {
  private static instance: LLMIntegration;
  private coastalDatabase: Map<string, number> = new Map();

  private constructor() {
    this.initializeCoastalDatabase();
  }

  public static getInstance(): LLMIntegration {
    if (!LLMIntegration.instance) {
      LLMIntegration.instance = new LLMIntegration();
    }
    return LLMIntegration.instance;
  }

  private initializeCoastalDatabase(): void {
    // South African coastal distances (approximate)
    this.coastalDatabase.set('cape town', 0);
    this.coastalDatabase.set('durban', 0);
    this.coastalDatabase.set('port elizabeth', 0);
    this.coastalDatabase.set('east london', 0);
    this.coastalDatabase.set('johannesburg', 550);
    this.coastalDatabase.set('pretoria', 580);
    this.coastalDatabase.set('bloemfontein', 450);
    this.coastalDatabase.set('kimberley', 520);
    this.coastalDatabase.set('polokwane', 350);
    this.coastalDatabase.set('nelspruit', 280);
    this.coastalDatabase.set('upington', 650);
    this.coastalDatabase.set('rustenburg', 480);
    this.coastalDatabase.set('potchefstroom', 520);
    this.coastalDatabase.set('klerksdorp', 500);
    this.coastalDatabase.set('welkom', 480);
  }

  /**
   * Calculate distance to coast using coordinates and database
   */
  calculateDistanceToCoast(latitude: number, longitude: number, city?: string): number {
    // Check database first
    if (city) {
      const knownDistance = this.coastalDatabase.get(city.toLowerCase());
      if (knownDistance !== undefined) {
        return knownDistance;
      }
    }

    // Calculate approximate distance using coordinates
    // South African coastline approximation
    const coastalPoints = [
      { lat: -33.9249, lng: 18.4241 }, // Cape Town
      { lat: -29.8587, lng: 31.0218 }, // Durban
      { lat: -33.9608, lng: 25.6022 }, // Port Elizabeth
      { lat: -32.9783, lng: 27.8546 }  // East London
    ];

    let minDistance = Infinity;
    
    for (const point of coastalPoints) {
      const distance = this.haversineDistance(latitude, longitude, point.lat, point.lng);
      minDistance = Math.min(minDistance, distance);
    }

    return Math.round(minDistance);
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Main LLM analysis function
   */
  async analyzeRenewableOptions(
    location: { latitude: number; longitude: number; city: string; country: string },
    weatherPredictions: WeatherPrediction[],
    usagePredictions: UsagePrediction[],
    financialPredictions: FinancialPrediction[],
    existingSystems: string[] = []
  ): Promise<LLMAnalysis> {
    
    // Calculate location data
    const distanceToCoast = this.calculateDistanceToCoast(
      location.latitude, 
      location.longitude, 
      location.city
    );

    const locationData: LocationData = {
      ...location,
      distanceToCoast,
      elevation: this.estimateElevation(location.latitude, location.longitude)
    };

    // Analyze renewable energy potential
    const renewableRecommendations = this.analyzeRenewablePotential(
      locationData,
      weatherPredictions,
      usagePredictions,
      existingSystems
    );

    // Calculate backup power requirements
    const backupRequirement = this.calculateBackupRequirement(
      usagePredictions,
      renewableRecommendations,
      weatherPredictions
    );

    // Calculate totals and costs
    const totalRecommendedCapacity = renewableRecommendations
      .filter(r => r.recommended)
      .reduce((sum, r) => sum + r.capacity, 0);

    const estimatedCost = this.estimateTotalCost(renewableRecommendations, backupRequirement);

    // Generate reasoning
    const reasoning = this.generateReasoning(
      locationData,
      renewableRecommendations,
      backupRequirement,
      weatherPredictions,
      usagePredictions
    );

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(
      renewableRecommendations,
      weatherPredictions,
      usagePredictions
    );

    return {
      location: locationData,
      renewableRecommendations,
      backupRequirement,
      totalRecommendedCapacity,
      estimatedCost,
      confidence,
      reasoning
    };
  }

  private estimateElevation(latitude: number, longitude: number): number {
    // Simple elevation estimation for South Africa
    // Johannesburg area: ~1700m, Cape Town: ~0m, Durban: ~0m
    if (latitude < -32 && longitude < 20) return 50; // Cape Town area
    if (latitude < -28 && longitude > 30) return 100; // Durban area
    if (latitude < -25 && longitude > 27 && longitude < 29) return 1700; // Johannesburg area
    return 800; // Default inland elevation
  }

  private analyzeRenewablePotential(
    location: LocationData,
    weatherPredictions: WeatherPrediction[],
    usagePredictions: UsagePrediction[],
    existingSystems: string[]
  ): RenewableRecommendation[] {
    const recommendations: RenewableRecommendation[] = [];
    
    // Calculate average usage
    const avgUsage = usagePredictions.reduce((sum, u) => sum + u.predictedConsumption, 0) / usagePredictions.length;
    const peakUsage = Math.max(...usagePredictions.map(u => u.predictedPeakDemand));

    // Solar analysis
    const avgSolarIrradiance = weatherPredictions.reduce((sum, w) => sum + w.solarIrradiance, 0) / weatherPredictions.length;
    const solarPotential = avgSolarIrradiance / 1000; // Normalize to 0-1
    
    recommendations.push({
      energyType: 'solar',
      recommended: solarPotential > 0.4,
      capacity: Math.round(avgUsage * 0.6 * solarPotential),
      confidence: Math.min(0.95, 0.7 + solarPotential * 0.25),
      reasoning: `Solar irradiance average: ${avgSolarIrradiance.toFixed(0)} W/m². ${solarPotential > 0.6 ? 'Excellent' : solarPotential > 0.4 ? 'Good' : 'Poor'} solar potential.`,
      priority: solarPotential > 0.6 ? 1 : solarPotential > 0.4 ? 2 : 4
    });

    // Wind analysis
    const avgWindSpeed = weatherPredictions.reduce((sum, w) => sum + w.windSpeed, 0) / weatherPredictions.length;
    const windPotential = Math.min(1, avgWindSpeed / 15); // Good wind is 15+ m/s
    
    recommendations.push({
      energyType: 'wind',
      recommended: windPotential > 0.3 && avgWindSpeed > 6,
      capacity: Math.round(avgUsage * 0.4 * windPotential),
      confidence: Math.min(0.9, 0.6 + windPotential * 0.3),
      reasoning: `Average wind speed: ${avgWindSpeed.toFixed(1)} m/s. ${windPotential > 0.6 ? 'Excellent' : windPotential > 0.3 ? 'Good' : 'Poor'} wind resource.`,
      priority: windPotential > 0.6 ? 1 : windPotential > 0.3 ? 3 : 5
    });

    // Wave analysis (only if close to coast)
    if (location.distanceToCoast <= 100) {
      const wavePotential = location.distanceToCoast <= 10 ? 0.8 : 0.4;
      recommendations.push({
        energyType: 'wave',
        recommended: location.distanceToCoast <= 50,
        capacity: Math.round(avgUsage * 0.3 * wavePotential),
        confidence: location.distanceToCoast <= 10 ? 0.8 : 0.6,
        reasoning: `Distance to coast: ${location.distanceToCoast}km. ${location.distanceToCoast <= 10 ? 'Excellent' : location.distanceToCoast <= 50 ? 'Good' : 'Limited'} wave energy potential.`,
        priority: location.distanceToCoast <= 10 ? 2 : 4
      });
    } else {
      recommendations.push({
        energyType: 'wave',
        recommended: false,
        capacity: 0,
        confidence: 0.95,
        reasoning: `Distance to coast: ${location.distanceToCoast}km. Too far from coast for wave energy (>100km).`,
        priority: 6
      });
    }

    // Hydro analysis (manual addition required)
    recommendations.push({
      energyType: 'hydro',
      recommended: false,
      capacity: 0,
      confidence: 0.5,
      reasoning: 'Hydro potential requires manual assessment of local water resources. Not automatically recommended.',
      priority: 5
    });

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private calculateBackupRequirement(
    usagePredictions: UsagePrediction[],
    renewableRecommendations: RenewableRecommendation[],
    weatherPredictions: WeatherPrediction[]
  ): BackupPowerRequirement {
    const peakDemand = Math.max(...usagePredictions.map(u => u.predictedPeakDemand));
    const totalRenewableCapacity = renewableRecommendations
      .filter(r => r.recommended)
      .reduce((sum, r) => sum + r.capacity, 0);

    // Check if renewables can meet peak demand
    const renewableCoverage = totalRenewableCapacity / peakDemand;
    
    // Analyze weather variability for backup sizing
    const solarVariability = this.calculateVariability(weatherPredictions.map(w => w.solarIrradiance));
    const windVariability = this.calculateVariability(weatherPredictions.map(w => w.windSpeed));
    
    const variabilityFactor = Math.max(solarVariability, windVariability);
    
    if (renewableCoverage < 0.8 || variabilityFactor > 0.4) {
      const backupCapacity = Math.max(
        peakDemand * 0.5, // Minimum 50% of peak demand
        peakDemand - totalRenewableCapacity * 0.7 // Account for renewable intermittency
      );

      return {
        required: true,
        capacity: Math.round(backupCapacity),
        type: backupCapacity > 100 ? 'generator' : 'battery',
        duration: variabilityFactor > 0.5 ? 8 : 4,
        reasoning: `Peak demand: ${peakDemand.toFixed(1)}kW, Renewable capacity: ${totalRenewableCapacity.toFixed(1)}kW (${(renewableCoverage * 100).toFixed(1)}% coverage). High weather variability requires backup.`
      };
    }

    return {
      required: false,
      capacity: 0,
      type: 'battery',
      duration: 0,
      reasoning: `Renewable capacity (${totalRenewableCapacity.toFixed(1)}kW) adequately covers peak demand (${peakDemand.toFixed(1)}kW) with low weather variability.`
    };
  }

  private calculateVariability(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  private estimateTotalCost(
    renewableRecommendations: RenewableRecommendation[],
    backupRequirement: BackupPowerRequirement
  ): number {
    const costPerKw = {
      solar: 15000,
      wind: 18000,
      hydro: 25000,
      wave: 35000
    };

    let totalCost = 0;

    for (const rec of renewableRecommendations) {
      if (rec.recommended) {
        totalCost += rec.capacity * costPerKw[rec.energyType];
      }
    }

    // Add backup cost
    if (backupRequirement.required) {
      const backupCostPerKw = backupRequirement.type === 'battery' ? 8000 : 3000;
      totalCost += backupRequirement.capacity * backupCostPerKw;
    }

    return totalCost;
  }

  private generateReasoning(
    location: LocationData,
    renewableRecommendations: RenewableRecommendation[],
    backupRequirement: BackupPowerRequirement,
    weatherPredictions: WeatherPrediction[],
    usagePredictions: UsagePrediction[]
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`Location Analysis: ${location.city}, ${location.country} (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`);
    reasoning.push(`Distance to coast: ${location.distanceToCoast}km, Elevation: ${location.elevation}m`);

    const recommendedSources = renewableRecommendations.filter(r => r.recommended);
    if (recommendedSources.length > 0) {
      reasoning.push(`Recommended renewable sources: ${recommendedSources.map(r => r.energyType).join(', ')}`);
      reasoning.push(`Total recommended capacity: ${recommendedSources.reduce((sum, r) => sum + r.capacity, 0)}kW`);
    } else {
      reasoning.push('No renewable sources recommended based on current analysis');
    }

    if (location.distanceToCoast > 100) {
      reasoning.push('Wave energy excluded: Distance to coast exceeds 100km threshold');
    }

    reasoning.push('Hydro energy requires manual assessment of local water resources');

    if (backupRequirement.required) {
      reasoning.push(`Backup power required: ${backupRequirement.capacity}kW ${backupRequirement.type} for ${backupRequirement.duration} hours`);
    } else {
      reasoning.push('No backup power required based on renewable capacity and weather stability');
    }

    const avgUsage = usagePredictions.reduce((sum, u) => sum + u.predictedConsumption, 0) / usagePredictions.length;
    reasoning.push(`Average energy consumption: ${avgUsage.toFixed(1)}kWh/hour`);

    return reasoning;
  }

  private calculateOverallConfidence(
    renewableRecommendations: RenewableRecommendation[],
    weatherPredictions: WeatherPrediction[],
    usagePredictions: UsagePrediction[]
  ): number {
    const renewableConfidence = renewableRecommendations
      .reduce((sum, r) => sum + r.confidence, 0) / renewableRecommendations.length;
    
    const weatherConfidence = weatherPredictions
      .reduce((sum, w) => sum + w.confidence, 0) / weatherPredictions.length;
    
    const usageConfidence = usagePredictions
      .reduce((sum, u) => sum + u.confidence, 0) / usagePredictions.length;

    return (renewableConfidence + weatherConfidence + usageConfidence) / 3;
  }
}

export const llmIntegration = LLMIntegration.getInstance();