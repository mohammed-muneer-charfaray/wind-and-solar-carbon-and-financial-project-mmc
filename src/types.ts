export interface SystemParameters {
  capacity: number; // kW
  efficiency: number; // %
  gridEmissionFactor: number; // kg CO₂/kWh
  operationalLifetime: number; // years
  costPerKw: number; // R
  systemSize: number; // kW
  installationCost: number; // R
  dailyProductionHours: number; // hours
  degradationRate: number; // % per year
  operationalCosts: number; // R per year
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