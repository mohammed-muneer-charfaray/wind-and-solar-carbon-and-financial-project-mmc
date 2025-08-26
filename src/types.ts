export type EnergySourceType = 'solar' | 'wind' | 'hydro' | 'wave';

export interface EnergySourceConfig {
  type: EnergySourceType;
  enabled: boolean;
  capacity: number; // kW
  efficiency: number; // %
  costPerKw: number; // R
  dailyProductionHours: number; // hours
  degradationRate: number; // % per year
  specificOperationalCosts: number; // R per year per kW
}

export interface WeatherData {
  timestamp: Date;
  temperature: number; // °C
  humidity: number; // %
  windSpeed: number; // m/s
  windDirection: number; // degrees
  solarIrradiance: number; // W/m²
  cloudCover: number; // %
  precipitation: number; // mm
  waveHeight?: number; // m (for wave energy)
  waterFlow?: number; // m³/s (for hydro)
  pressure: number; // hPa
}

export interface SystemParameters {
  energySources: EnergySourceConfig[];
  totalCapacity: number; // kW (calculated)
  averageEfficiency: number; // % (calculated)
  gridEmissionFactor: number; // kg CO₂/kWh
  operationalLifetime: number; // years
  totalInstallationCost: number; // R (calculated)
  totalOperationalCosts: number; // R per year (calculated)
  location: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  };
  weatherData?: WeatherData[];
}

export interface FinancialParameters {
  electricityPrice: number; // R per kWh
  electricityPriceIncrease: number; // % per year
  financingYears: number; // years
  interestRate: number; // %
  inflationRate: number; // %
  discountRate: number; // %
}

export interface FinancialMetrics {
  npv: number;
  irr: number;
  paybackPeriod: number;
  roi: number;
  lcoe: number;
  yearlyCashFlows: YearlyCashFlow[];
}

export interface YearlyCashFlow {
  year: number;
  cashFlow: number;
  cumulativeCashFlow: number;
}

export interface EnergyGeneration {
  daily: number;
  monthly: number;
  yearly: number;
  lifetime: EnergyByYear[];
}

export interface EnergyByYear {
  year: number;
  energy: number; // kWh
}

export interface CarbonReduction {
  daily: number;
  yearly: number;
  lifetime: number;
  financialBenefit: number;
  yearlyReduction: CarbonByYear[];
}

export interface CarbonByYear {
  year: number;
  reduction: number; // kg CO₂
}

export interface ElectricityPrice {
  year: number;
  price: number; // R per kWh
}

export interface CalculatedResults {
  financialMetrics: FinancialMetrics;
  energyGeneration: EnergyGeneration;
  carbonReduction: CarbonReduction;
  electricityPrices: ElectricityPrice[];
}