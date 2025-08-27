import { SystemParameters, FinancialParameters, FinancialMetrics, EnergyGeneration, CarbonReduction, YearlyCashFlow, EnergyByYear, CarbonByYear } from '../types';

export interface MLIntegratedData {
  systemParams: SystemParameters;
  financialParams: FinancialParameters;
  weatherAdjustedFactors: { [key: string]: number };
  missingDataFlags: string[];
  confidenceScore: number;
  recommendations: string[];
}

function safeCalculation<T>(calculation: () => T, fallback: T): T {
  try {
    return calculation();
  } catch (error) {
    console.error('Calculation error:', error);
    return fallback;
  }
}

/**
 * Enhanced calculations that work with multiple energy sources and weather data
 */
export function calculateEnhancedFinancialMetrics(
  integratedData: MLIntegratedData
): FinancialMetrics {
  const { systemParams, financialParams, weatherAdjustedFactors } = integratedData;

  return safeCalculation(() => {
    // Calculate weather-adjusted energy production for each source
    const weatherAdjustedProduction = systemParams.energySources
      .filter(source => source.enabled)
      .map(source => {
        const weatherFactor = weatherAdjustedFactors[source.type];
        const baseProduction = source.capacity * source.dailyProductionHours * 365;
        return baseProduction * weatherFactor;
      })
      .reduce((sum, production) => sum + production, 0);

    // Calculate yearly cash flows with weather adjustments
    const yearlyCashFlows = calculateWeatherAdjustedCashFlows(
      systemParams,
      financialParams,
      weatherAdjustedProduction,
      weatherAdjustedFactors
    );

    // Calculate financial metrics
    const cashFlowValues = yearlyCashFlows.map(cf => cf.cashFlow);
    const cumulativeCashFlows = yearlyCashFlows.map(cf => cf.cumulativeCashFlow);

    const npv = calculateNPV(cashFlowValues, financialParams.discountRate);
    const irr = calculateIRR(cashFlowValues);
    const paybackPeriod = calculatePaybackPeriod(cumulativeCashFlows);

    // Calculate total costs and returns
    const totalCosts = systemParams.totalInstallationCost + 
      (systemParams.totalOperationalCosts * systemParams.operationalLifetime);
    const totalReturns = cashFlowValues.filter(cf => cf > 0).reduce((sum, cf) => sum + cf, 0);

    const roi = calculateROI(systemParams.totalInstallationCost, totalReturns);
    const lcoe = calculateLCOE(totalCosts, weatherAdjustedProduction * systemParams.operationalLifetime);

    return {
      npv,
      irr,
      paybackPeriod,
      roi,
      lcoe,
      yearlyCashFlows
    };
  }, {
    npv: 0,
    irr: 0,
    paybackPeriod: 0,
    roi: 0,
    lcoe: 0,
    yearlyCashFlows: []
  });
}

export function calculateEnhancedEnergyGeneration(
  integratedData: MLIntegratedData
): EnergyGeneration {
  const { systemParams, weatherAdjustedFactors } = integratedData;

  return safeCalculation(() => {
    // Calculate daily production for each energy source
    const dailyProduction = systemParams.energySources
      .filter(source => source.enabled)
      .map(source => {
        const weatherFactor = weatherAdjustedFactors[source.type];
        return source.capacity * source.dailyProductionHours * weatherFactor;
      })
      .reduce((sum, production) => sum + production, 0);

    const monthlyProduction = dailyProduction * 30;
    const yearlyProduction = dailyProduction * 365;

    // Calculate lifetime energy with degradation for each source
    const lifetimeEnergy: EnergyByYear[] = [];
    
    for (let year = 1; year <= systemParams.operationalLifetime; year++) {
      let yearlyEnergyTotal = 0;
      
      systemParams.energySources
        .filter(source => source.enabled)
        .forEach(source => {
          const weatherFactor = weatherAdjustedFactors[source.type];
          const baseAnnualProduction = source.capacity * source.dailyProductionHours * 365 * weatherFactor;
          const degradedProduction = baseAnnualProduction * Math.pow(1 - source.degradationRate / 100, year - 1);
          yearlyEnergyTotal += degradedProduction;
        });

      lifetimeEnergy.push({
        year,
        energy: yearlyEnergyTotal
      });
    }

    return {
      daily: dailyProduction,
      monthly: monthlyProduction,
      yearly: yearlyProduction,
      lifetime: lifetimeEnergy
    };
  }, {
    daily: 0,
    monthly: 0,
    yearly: 0,
    lifetime: []
  });
}

export function calculateEnhancedCarbonReduction(
  integratedData: MLIntegratedData,
  energyGeneration: EnergyGeneration
): CarbonReduction {
  const { systemParams } = integratedData;

  return safeCalculation(() => {
    const dailyReduction = energyGeneration.daily * systemParams.gridEmissionFactor;
    const yearlyReduction = energyGeneration.yearly * systemParams.gridEmissionFactor;

    // Calculate yearly carbon reduction with energy degradation
    const yearlyReductions: CarbonByYear[] = energyGeneration.lifetime.map(yearData => ({
      year: yearData.year,
      reduction: yearData.energy * systemParams.gridEmissionFactor
    }));

    const lifetimeReduction = yearlyReductions.reduce((sum, year) => sum + year.reduction, 0);

    // Calculate financial benefit from carbon reduction (R190 per 1000kg CO₂)
    const financialBenefit = (lifetimeReduction / 1000) * 190;

    return {
      daily: dailyReduction,
      yearly: yearlyReduction,
      lifetime: lifetimeReduction,
      financialBenefit,
      yearlyReduction: yearlyReductions
    };
  }, {
    daily: 0,
    yearly: 0,
    lifetime: 0,
    financialBenefit: 0,
    yearlyReduction: []
  });
}

/**
 * Calculate weather-adjusted cash flows
 */
function calculateWeatherAdjustedCashFlows(
  systemParams: SystemParameters,
  financialParams: FinancialParameters,
  baseYearlyProduction: number,
  weatherFactors: { [key: string]: number }
): YearlyCashFlow[] {
  const { totalInstallationCost, operationalLifetime } = systemParams;
  const { electricityPrice, electricityPriceIncrease, financingYears, interestRate } = financialParams;

  // Calculate loan payment
  const monthlyInterestRate = interestRate / 100 / 12;
  const numberOfPayments = financingYears * 12;
  
  let monthlyPayment = 0;
  if (interestRate > 0) {
    monthlyPayment = totalInstallationCost * 
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
  } else {
    monthlyPayment = totalInstallationCost / numberOfPayments;
  }
  
  const yearlyLoanPayment = monthlyPayment * 12;

  // Calculate yearly cash flows
  const cashFlows: number[] = [-totalInstallationCost];
  let cumulativeCashFlow = -totalInstallationCost;
  
  const yearlyCashFlows: YearlyCashFlow[] = [
    { year: 0, cashFlow: -totalInstallationCost, cumulativeCashFlow }
  ];

  for (let year = 1; year <= operationalLifetime; year++) {
    // Calculate degraded production for this year
    let yearlyProduction = 0;
    systemParams.energySources
      .filter(source => source.enabled)
      .forEach(source => {
        const weatherFactor = weatherFactors[source.type];
        const baseProduction = source.capacity * source.dailyProductionHours * 365 * weatherFactor;
        const degradedProduction = baseProduction * Math.pow(1 - source.degradationRate / 100, year - 1);
        yearlyProduction += degradedProduction;
      });

    // Calculate electricity price for this year
    const currentElectricityPrice = electricityPrice * Math.pow(1 + electricityPriceIncrease / 100, year - 1);
    
    // Calculate revenue
    const revenue = yearlyProduction * currentElectricityPrice;
    
    // Calculate expenses
    const loanPayment = year <= financingYears ? yearlyLoanPayment : 0;
    const operationalCosts = systemParams.totalOperationalCosts;
    
    // Calculate net cash flow
    const cashFlow = revenue - operationalCosts - loanPayment;
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

// Helper functions (same as before but with enhanced error handling)
function calculateNPV(cashFlows: number[], discountRate: number): number {
  return safeCalculation(() => {
    validateNumericInput(discountRate, 'discountRate', 0, 100);
    return cashFlows.reduce((npv, cashFlow, year) => {
      return npv + cashFlow / Math.pow(1 + discountRate / 100, year);
    }, 0);
  }, 0);
}

function calculateIRR(cashFlows: number[]): number {
  return safeCalculation(() => {
    let irr = 0;
    let npv = calculateNPV(cashFlows, irr);
    
    // Newton-Raphson method for better IRR calculation
    for (let i = 0; i < 100; i++) {
      const npvDerivative = cashFlows.reduce((sum, cashFlow, year) => {
        if (year === 0) return sum;
        return sum - (year * cashFlow) / Math.pow(1 + irr / 100, year + 1);
      }, 0);
      
      if (Math.abs(npvDerivative) < 1e-10) break;
      
      const newIrr = irr - (npv * 100) / npvDerivative;
      if (Math.abs(newIrr - irr) < 1e-6) break;
      
      irr = newIrr;
      npv = calculateNPV(cashFlows, irr);
    }
    
    return Math.max(-100, Math.min(100, irr));
  }, 0);
}

function calculatePaybackPeriod(cumulativeCashFlows: number[]): number {
  return safeCalculation(() => {
    const positiveIndex = cumulativeCashFlows.findIndex(value => value >= 0);
    
    if (positiveIndex <= 0) {
      return cumulativeCashFlows.length; // Return max period if no payback
    }
    
    // Linear interpolation
    const previousYear = positiveIndex - 1;
    const previousValue = cumulativeCashFlows[previousYear];
    const currentValue = cumulativeCashFlows[positiveIndex];
    
    return previousYear + Math.abs(previousValue) / (currentValue - previousValue);
  }, 0);
}

function calculateROI(totalInvestment: number, totalReturns: number): number {
  return safeCalculation(() => {
    validateNumericInput(totalInvestment, 'totalInvestment', 0.01);
    return ((totalReturns - totalInvestment) / totalInvestment) * 100;
  }, 0);
}

function calculateLCOE(totalCosts: number, totalEnergy: number): number {
  return safeCalculation(() => {
    validateNumericInput(totalEnergy, 'totalEnergy', 0.01);
    return totalCosts / totalEnergy;
  }, 0);
}