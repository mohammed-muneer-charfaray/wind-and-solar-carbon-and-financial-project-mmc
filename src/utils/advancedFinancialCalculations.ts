export interface CashFlowProjection {
  year: number;
  revenue: number;
  costs: number;
  cashFlow: number;
  cumulativeCashFlow: number;
}

export interface FinancialAnalysis {
  npv: number;
  irr: number;
  roi: number;
  lcoe: number;
  paybackPeriodYears: number;
  profitabilityIndex: number;
  cashFlows: CashFlowProjection[];
}

export class AdvancedFinancialCalculator {
  /**
   * Calculate Net Present Value (NPV)
   * NPV = Σ(Rt / (1+r)^t) where R0 is initial investment (negative)
   */
  static calculateNPV(cashFlows: number[], discountRatePercent: number): number {
    const rate = discountRatePercent / 100;
    return cashFlows.reduce((npv, cashFlow, year) => {
      return npv + (cashFlow / Math.pow(1 + rate, year));
    }, 0);
  }

  /**
   * Calculate Internal Rate of Return (IRR)
   * Solves: 0 = Σ(Ct / (1+IRR)^t) - C0
   * Using Newton-Raphson method for accuracy
   */
  static calculateIRR(cashFlows: number[], maxIterations: number = 100, tolerance: number = 0.0001): number {
    // Start with an initial guess of 10%
    let irr = 0.1;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Calculate NPV at current IRR guess
      let npv = 0;
      let derivative = 0;

      for (let year = 0; year < cashFlows.length; year++) {
        const discountFactor = Math.pow(1 + irr, year);
        npv += cashFlows[year] / discountFactor;
        derivative -= (year * cashFlows[year]) / (discountFactor * (1 + irr));
      }

      // Check for convergence
      if (Math.abs(npv) < tolerance) {
        return irr * 100; // Convert to percentage
      }

      // Newton-Raphson update
      const nextIrr = irr - (npv / derivative);

      // Prevent divergence
      if (nextIrr < -0.99 || nextIrr > 2) {
        break;
      }

      irr = nextIrr;
    }

    return irr * 100;
  }

  /**
   * Calculate Return on Investment (ROI)
   * ROI = ((Final Value - Initial Value) / Initial Value) × 100%
   */
  static calculateROI(initialInvestmentR: number, totalReturnsR: number): number {
    if (initialInvestmentR === 0) return 0;
    return ((totalReturnsR - initialInvestmentR) / initialInvestmentR) * 100;
  }

  /**
   * Calculate Levelized Cost of Energy (LCOE)
   * LCOE = Total Costs / Total Energy Generated
   */
  static calculateLCOE(
    initialCapitalCostR: number,
    operationalCostsPerYearR: number,
    operationalLifetimeYears: number,
    totalEnergyGeneratedKwh: number,
    discountRatePercent: number = 5
  ): number {
    const rate = discountRatePercent / 100;

    // Present value of operational costs
    let pvOperationalCosts = 0;
    for (let year = 1; year <= operationalLifetimeYears; year++) {
      pvOperationalCosts += operationalCostsPerYearR / Math.pow(1 + rate, year);
    }

    const totalPvCosts = initialCapitalCostR + pvOperationalCosts;
    return totalPvCosts / totalEnergyGeneratedKwh;
  }

  /**
   * Calculate Payback Period
   * Time to recover initial investment from cumulative cash flows
   */
  static calculatePaybackPeriod(cumulativeCashFlows: number[]): number {
    // Find first year with positive cumulative cash flow
    const breakEvenIndex = cumulativeCashFlows.findIndex(cf => cf >= 0);

    if (breakEvenIndex === -1) {
      return Infinity; // Never breaks even
    }

    if (breakEvenIndex === 0) {
      return 0; // Immediate payback
    }

    // Linear interpolation for fractional year
    const previousValue = cumulativeCashFlows[breakEvenIndex - 1];
    const currentValue = cumulativeCashFlows[breakEvenIndex];
    const interpolation = Math.abs(previousValue) / (currentValue - previousValue);

    return breakEvenIndex - 1 + interpolation;
  }

  /**
   * Calculate Profitability Index
   * PI = PV of Future Cash Flows / Initial Investment
   */
  static calculateProfitabilityIndex(cashFlows: number[], discountRatePercent: number): number {
    const rate = discountRatePercent / 100;
    const initialInvestment = Math.abs(cashFlows[0]); // First year is negative investment

    let pvFutureCashFlows = 0;
    for (let year = 1; year < cashFlows.length; year++) {
      pvFutureCashFlows += cashFlows[year] / Math.pow(1 + rate, year);
    }

    return initialInvestment > 0 ? pvFutureCashFlows / initialInvestment : 0;
  }

  /**
   * Generate complete financial projection
   */
  static projectFinancialMetrics(
    initialCapitalCostR: number,
    operationalCostsPerYearR: number,
    annualEnergyGenerationKwh: number,
    electricityPriceRPerKwh: number,
    electricityPriceIncreasePercent: number,
    operationalLifetimeYears: number,
    discountRatePercent: number,
    incentivesPerYear: number = 0,
    degradationRatePercent: number = 0.5
  ): FinancialAnalysis {
    const cashFlows: CashFlowProjection[] = [];
    const cashFlowArray: number[] = [];

    // Year 0: Initial investment
    cashFlows.push({
      year: 0,
      revenue: 0,
      costs: initialCapitalCostR,
      cashFlow: -initialCapitalCostR,
      cumulativeCashFlow: -initialCapitalCostR
    });
    cashFlowArray.push(-initialCapitalCostR);

    let cumulativeFlow = -initialCapitalCostR;

    // Years 1 to operational lifetime
    for (let year = 1; year <= operationalLifetimeYears; year++) {
      // Apply degradation to energy generation
      const energyGeneration = annualEnergyGenerationKwh * Math.pow(1 - (degradationRatePercent / 100), year - 1);

      // Apply electricity price increase
      const electricityPrice = electricityPriceRPerKwh * Math.pow(1 + (electricityPriceIncreasePercent / 100), year - 1);

      // Calculate financials
      const revenue = (energyGeneration * electricityPrice) + incentivesPerYear;
      const costs = operationalCostsPerYearR;
      const cashFlow = revenue - costs;

      cumulativeFlow += cashFlow;

      cashFlows.push({
        year,
        revenue,
        costs,
        cashFlow,
        cumulativeCashFlow: cumulativeFlow
      });

      cashFlowArray.push(cashFlow);
    }

    // Calculate metrics
    const npv = this.calculateNPV(cashFlowArray, discountRatePercent);
    const irr = this.calculateIRR(cashFlowArray);
    const totalReturns = cashFlowArray.slice(1).filter(cf => cf > 0).reduce((sum, cf) => sum + cf, 0);
    const roi = this.calculateROI(initialCapitalCostR, totalReturns);
    const totalEnergyKwh = cashFlows.slice(1).reduce((sum, cf) => sum + (cf.revenue / electricityPriceRPerKwh), 0);
    const lcoe = this.calculateLCOE(initialCapitalCostR, operationalCostsPerYearR, operationalLifetimeYears, totalEnergyKwh, discountRatePercent);
    const paybackPeriod = this.calculatePaybackPeriod(cashFlows.map(cf => cf.cumulativeCashFlow));
    const profitabilityIndex = this.calculateProfitabilityIndex(cashFlowArray, discountRatePercent);

    return {
      npv,
      irr,
      roi,
      lcoe,
      paybackPeriodYears: paybackPeriod,
      profitabilityIndex,
      cashFlows
    };
  }

  /**
   * Breakeven Analysis: Calculate required energy price for NPV = 0
   */
  static calculateBreakevenPrice(
    initialCapitalCostR: number,
    operationalCostsPerYearR: number,
    annualEnergyGenerationKwh: number,
    operationalLifetimeYears: number,
    discountRatePercent: number,
    targetNPV: number = 0
  ): number {
    let lowPrice = 0;
    let highPrice = 10; // R/kWh upper bound
    let optimalPrice = 0;

    // Binary search for breakeven price
    for (let iteration = 0; iteration < 50; iteration++) {
      const midPrice = (lowPrice + highPrice) / 2;

      const cashFlows: number[] = [-initialCapitalCostR];
      for (let year = 1; year <= operationalLifetimeYears; year++) {
        const revenue = annualEnergyGenerationKwh * midPrice;
        const costs = operationalCostsPerYearR;
        cashFlows.push(revenue - costs);
      }

      const npv = this.calculateNPV(cashFlows, discountRatePercent);

      if (Math.abs(npv - targetNPV) < 0.1) {
        optimalPrice = midPrice;
        break;
      }

      if (npv < targetNPV) {
        lowPrice = midPrice;
      } else {
        highPrice = midPrice;
      }

      optimalPrice = midPrice;
    }

    return optimalPrice;
  }
}

export const advancedFinancialCalculator = new AdvancedFinancialCalculator();
