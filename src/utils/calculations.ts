import { SystemParameters, FinancialParameters, FinancialMetrics, YearlyCashFlow, EnergyGeneration, CarbonReduction, EnergyByYear, CarbonByYear } from '../types';

// Reverse calculation functions
export function calculateSystemParameters(
  dailyEnergy: number,
  monthlyEnergy: number,
  yearlyEnergy: number,
  yearlyCarbon: number,
  gridEmissionFactor: number,
  dailyProductionHours: number
): {
  calculatedCapacity: number;
  calculatedSystemSize: number;
} {
  // Calculate system size from daily energy production
  // Daily Energy (kWh) = System Size (kW) * Daily Production Hours
  const systemSizeFromDaily = dailyEnergy / dailyProductionHours;
  
  // Calculate system size from monthly energy production
  // Monthly Energy (kWh) = System Size (kW) * Daily Production Hours * 30
  const systemSizeFromMonthly = monthlyEnergy / (dailyProductionHours * 30);
  
  // Calculate system size from yearly energy production
  // Yearly Energy (kWh) = System Size (kW) * Daily Production Hours * 365
  const systemSizeFromYearly = yearlyEnergy / (dailyProductionHours * 365);
  
  // Calculate system size from carbon reduction
  // Yearly Carbon Reduction (kg CO₂) = Yearly Energy (kWh) * Grid Emission Factor (kg CO₂/kWh)
  const yearlyEnergyFromCarbon = yearlyCarbon / gridEmissionFactor;
  const systemSizeFromCarbon = yearlyEnergyFromCarbon / (dailyProductionHours * 365);
  
  // Take the average of all calculations for more accurate results
  const calculatedSystemSize = (
    systemSizeFromDaily +
    systemSizeFromMonthly +
    systemSizeFromYearly +
    systemSizeFromCarbon
  ) / 4;
  
  // Capacity is typically equal to system size for solar and wind installations
  const calculatedCapacity = calculatedSystemSize;
  
  return {
    calculatedCapacity,
    calculatedSystemSize
  };
}

// Calculate NPV (Net Present Value)
function calculateNPV(cashFlows: number[], discountRate: number): number {
  return cashFlows.reduce((npv, cashFlow, year) => {
    return npv + cashFlow / Math.pow(1 + discountRate / 100, year);
  }, 0);
}

// Calculate IRR (Internal Rate of Return)
function calculateIRR(cashFlows: number[]): number {
  // Simple IRR approximation
  let irr = 0;
  let npv = calculateNPV(cashFlows, irr);
  
  // Increment IRR until NPV becomes negative
  while (npv > 0 && irr < 100) {
    irr += 0.1;
    npv = calculateNPV(cashFlows, irr);
  }
  
  return irr;
}

// Calculate Payback Period
function calculatePaybackPeriod(cumulativeCashFlows: number[]): number {
  const positiveIndex = cumulativeCashFlows.findIndex(value => value >= 0);
  
  if (positiveIndex <= 0) {
    return 0; // Immediate payback or error
  }
  
  // Linear interpolation for more accurate payback period
  const previousYear = positiveIndex - 1;
  const previousValue = cumulativeCashFlows[previousYear];
  const currentValue = cumulativeCashFlows[positiveIndex];
  
  return previousYear + Math.abs(previousValue) / (currentValue - previousValue);
}

// Calculate ROI (Return on Investment)
function calculateROI(totalInvestment: number, totalReturns: number): number {
  return ((totalReturns - totalInvestment) / totalInvestment) * 100;
}

// Calculate LCOE (Levelized Cost of Energy)
function calculateLCOE(totalCosts: number, totalEnergy: number): number {
  return totalCosts / totalEnergy;
}

// Calculate yearly cash flows
function calculateYearlyCashFlows(
  systemParams: SystemParameters,
  financialParams: FinancialParameters,
  yearlyEnergy: number[]
): YearlyCashFlow[] {
  const { installationCost, operationalCosts, operationalLifetime } = systemParams;
  const { electricityPrice, electricityPriceIncrease, financingYears, interestRate } = financialParams;
  
  // Calculate loan payment if financing is used
  const loanAmount = installationCost;
  const monthlyInterestRate = interestRate / 100 / 12;
  const numberOfPayments = financingYears * 12;
  
  let monthlyPayment = 0;
  if (interestRate > 0) {
    monthlyPayment = loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
                    (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
  } else {
    monthlyPayment = loanAmount / numberOfPayments;
  }
  
  const yearlyLoanPayment = monthlyPayment * 12;
  
  // Calculate yearly cash flows
  const cashFlows: number[] = [-installationCost]; // Initial investment (negative cash flow)
  let cumulativeCashFlow = -installationCost;
  
  const yearlyCashFlows: YearlyCashFlow[] = [
    { year: 0, cashFlow: -installationCost, cumulativeCashFlow }
  ];
  
  for (let year = 1; year <= operationalLifetime; year++) {
    // Calculate electricity price for this year with annual increase
    const currentElectricityPrice = electricityPrice * Math.pow(1 + electricityPriceIncrease / 100, year - 1);
    
    // Calculate revenue from energy production
    const energyProduction = yearlyEnergy[year - 1];
    const revenue = energyProduction * currentElectricityPrice;
    
    // Calculate expenses
    const loanPayment = year <= financingYears ? yearlyLoanPayment : 0;
    const yearlyOperationalCosts = operationalCosts;
    
    // Calculate net cash flow
    const cashFlow = revenue - yearlyOperationalCosts - loanPayment;
    cashFlows.push(cashFlow);
    
    cumulativeCashFlow += cashFlow;
    
    yearlyCashFlows.push({
      year,
      cashFlow,
      cumulativeCashFlow
    });
  }
  
  return yearlyCashFlows;
}

export function calculateFinancialMetrics(
  systemParams: SystemParameters,
  financialParams: FinancialParameters
): FinancialMetrics {
  const { systemSize, dailyProductionHours, degradationRate, operationalLifetime, installationCost } = systemParams;
  
  // Calculate yearly energy production with degradation
  const yearlyEnergy: number[] = [];
  let annualProduction = systemSize * dailyProductionHours * 365; // kWh
  
  for (let year = 0; year < operationalLifetime; year++) {
    yearlyEnergy.push(annualProduction);
    annualProduction *= (1 - degradationRate / 100); // Apply yearly degradation
  }
  
  // Calculate total energy production over lifetime
  const totalEnergyProduction = yearlyEnergy.reduce((sum, energy) => sum + energy, 0);
  
  // Calculate yearly cash flows
  const yearlyCashFlows = calculateYearlyCashFlows(systemParams, financialParams, yearlyEnergy);
  
  // Extract cash flow values for calculations
  const cashFlowValues = yearlyCashFlows.map(cf => cf.cashFlow);
  const cumulativeCashFlows = yearlyCashFlows.map(cf => cf.cumulativeCashFlow);
  
  // Calculate financial metrics
  const npv = calculateNPV(cashFlowValues, financialParams.discountRate);
  const irr = calculateIRR(cashFlowValues);
  const paybackPeriod = calculatePaybackPeriod(cumulativeCashFlows);
  
  // Calculate total costs over lifetime
  const totalCosts = installationCost + (systemParams.operationalCosts * operationalLifetime);
  
  // Calculate total returns (sum of all positive cash flows)
  const totalReturns = cashFlowValues.filter(cf => cf > 0).reduce((sum, cf) => sum + cf, 0);
  
  const roi = calculateROI(installationCost, totalReturns);
  const lcoe = calculateLCOE(totalCosts, totalEnergyProduction);
  
  return {
    npv,
    irr,
    paybackPeriod,
    roi,
    lcoe,
    yearlyCashFlows
  };
}

export function calculateEnergyGeneration(systemParams: SystemParameters): EnergyGeneration {
  const { systemSize, dailyProductionHours, degradationRate, operationalLifetime } = systemParams;
  
  // Calculate daily, monthly, and yearly production
  const dailyProduction = systemSize * dailyProductionHours; // kWh
  const monthlyProduction = dailyProduction * 30; // kWh
  const yearlyProduction = dailyProduction * 365; // kWh
  
  // Calculate yearly energy production with degradation
  const lifetimeEnergy: EnergyByYear[] = [];
  let annualProduction = yearlyProduction;
  
  for (let year = 1; year <= operationalLifetime; year++) {
    lifetimeEnergy.push({
      year,
      energy: annualProduction
    });
    
    annualProduction *= (1 - degradationRate / 100); // Apply yearly degradation
  }
  
  return {
    daily: dailyProduction,
    monthly: monthlyProduction,
    yearly: yearlyProduction,
    lifetime: lifetimeEnergy
  };
}

export function calculateCarbonReduction(
  systemParams: SystemParameters,
  energyGeneration: EnergyGeneration
): CarbonReduction {
  const { gridEmissionFactor } = systemParams;
  
  // Calculate carbon reduction
  const dailyReduction = energyGeneration.daily * gridEmissionFactor; // kg CO₂
  const yearlyReduction = energyGeneration.yearly * gridEmissionFactor; // kg CO₂
  
  // Calculate yearly carbon reduction with degradation
  const yearlyReductions: CarbonByYear[] = energyGeneration.lifetime.map(yearData => ({
    year: yearData.year,
    reduction: yearData.energy * gridEmissionFactor
  }));
  
  // Calculate lifetime carbon reduction
  const lifetimeReduction = yearlyReductions.reduce((sum, year) => sum + year.reduction, 0);
  
  // Calculate financial benefit (R190 per 1000kg CO₂)
  const financialBenefit = (lifetimeReduction / 1000) * 190;
  
  return {
    daily: dailyReduction,
    yearly: yearlyReduction,
    lifetime: lifetimeReduction,
    financialBenefit,
    yearlyReduction: yearlyReductions
  };
}