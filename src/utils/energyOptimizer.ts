import { EnergySourceConfig, SystemParameters, FinancialParameters } from '../types';

export interface EnergyOutputPrediction {
  day: number;
  expectedOutput: number;
  confidence: number;
}

export interface BatteryRecommendation {
  requiredCapacity: number;
  recommendedCapacity: number;
  costPerKwh: number;
  installationCost: number;
  generatorDeficit: number;
}

export interface OptimizationResult {
  totalDailyEnergy: number;
  batteryStorageSize: number;
  hydrogenFuelCellSize: number;
  hydrogenStorageSize: number;
  costBreakdown: {
    battery: number;
    hydrogen: number;
    generator: number;
    total: number;
  };
  powerMix: {
    [key: string]: number;
  };
}

export class EnergyOptimizer {
  private energySources: EnergySourceConfig[];
  private systemParams: Partial<SystemParameters>;
  private financialParams: Partial<FinancialParameters>;

  constructor(
    energySources: EnergySourceConfig[],
    systemParams: Partial<SystemParameters>,
    financialParams: Partial<FinancialParameters>
  ) {
    this.energySources = energySources;
    this.systemParams = systemParams;
    this.financialParams = financialParams;
  }

  predictEnergyOutput(days: number = 7): EnergyOutputPrediction[] {
    const predictions: EnergyOutputPrediction[] = [];

    for (let day = 1; day <= days; day++) {
      let totalOutput = 0;

      this.energySources.forEach(source => {
        if (!source.enabled) return;

        const capacity = source.capacity * source.efficiency / 100;
        let dailyOutput = 0;

        switch (source.type) {
          case 'solar':
            const solarVariation = 0.7 + Math.sin((day + 45) / 365 * Math.PI) * 0.3;
            dailyOutput = capacity * (source.dailyProductionHours || 5) * solarVariation;
            break;
          case 'wind':
            const windVariation = 0.6 + (Math.random() * 0.4);
            dailyOutput = capacity * 20 * windVariation;
            break;
          case 'hydro':
            dailyOutput = capacity * 22;
            break;
          case 'wave':
            const waveVariation = 0.5 + Math.cos((day + 45) / 365 * Math.PI) * 0.5;
            dailyOutput = capacity * 18 * waveVariation;
            break;
        }

        totalOutput += dailyOutput;
      });

      const confidence = 0.75 + (Math.random() * 0.2);
      predictions.push({
        day,
        expectedOutput: Math.max(0, totalOutput),
        confidence
      });
    }

    return predictions;
  }

  calculateBatteryRequirements(
    dailyLoad: number,
    daysOfAutonomy: number = 1,
    batteryEfficiency: number = 0.95,
    costPerKwh: number = 200
  ): BatteryRecommendation {
    const predictions = this.predictEnergyOutput(365);
    const avgDailyGeneration = predictions.reduce((sum, p) => sum + p.expectedOutput, 0) / predictions.length;
    const minGeneration = Math.min(...predictions.map(p => p.expectedOutput));

    const dailyDeficit = Math.max(0, dailyLoad - minGeneration);
    const requiredCapacity = (dailyDeficit * daysOfAutonomy) / batteryEfficiency;
    const recommendedCapacity = requiredCapacity * 1.2;

    const generatorDeficit = Math.max(0, dailyLoad - avgDailyGeneration);

    return {
      requiredCapacity,
      recommendedCapacity,
      costPerKwh,
      installationCost: recommendedCapacity * costPerKwh,
      generatorDeficit: generatorDeficit > 0 ? generatorDeficit : 0
    };
  }

  optimizeSystemWithAlternativeSources(
    dailyLoad: number,
    batteryUsageAllowed: boolean = true,
    generatorCostPerKwh: number = 5,
    hydrogenCostPerKwh: number = 8,
    fuelCellSize: number = 0,
    fuelCellEfficiency: number = 0.6
  ): OptimizationResult {
    const predictions = this.predictEnergyOutput(365);
    const avgDailyGeneration = predictions.reduce((sum, p) => sum + p.expectedOutput, 0) / predictions.length;

    let batteryStorageSize = 0;
    let hydrogenStorageSize = 0;
    let generatorDeficitKwh = 0;

    const totalAnnualSurplus = avgDailyGeneration > dailyLoad ?
      (avgDailyGeneration - dailyLoad) * 365 : 0;

    if (batteryUsageAllowed && totalAnnualSurplus > 0) {
      const batteryBudget = totalAnnualSurplus * 0.3;
      batteryStorageSize = batteryBudget / 200;
    }

    const minGeneration = Math.min(...predictions.map(p => p.expectedOutput));
    let deficit = Math.max(0, dailyLoad - minGeneration);

    if (fuelCellSize > 0) {
      const hydrogenDailyCapacity = fuelCellSize * fuelCellEfficiency;
      if (hydrogenDailyCapacity >= deficit) {
        hydrogenStorageSize = (deficit * 7) / fuelCellSize;
        deficit = 0;
      } else {
        hydrogenStorageSize = (hydrogenDailyCapacity * 7) / fuelCellSize;
        deficit = deficit - hydrogenDailyCapacity;
      }
    }

    generatorDeficitKwh = deficit * 365;

    const totalDailyEnergy = dailyLoad;
    const powerMix: { [key: string]: number } = {
      battery: batteryStorageSize > 0 ? (batteryStorageSize / totalDailyEnergy * 365) : 0,
      hydrogen: fuelCellSize > 0 ? (fuelCellSize * fuelCellEfficiency / totalDailyEnergy * 100) : 0,
      generator: generatorDeficitKwh / totalDailyEnergy / 365 * 100 || 0
    };

    const renewableTotal = avgDailyGeneration;
    this.energySources.forEach(source => {
      if (!source.enabled) return;
      const capacity = source.capacity * source.efficiency / 100;
      let sourceDaily = 0;

      switch (source.type) {
        case 'solar':
          sourceDaily = capacity * (source.dailyProductionHours || 5) * 0.85;
          break;
        case 'wind':
          sourceDaily = capacity * 20;
          break;
        case 'hydro':
          sourceDaily = capacity * 22;
          break;
        case 'wave':
          sourceDaily = capacity * 18;
          break;
      }

      powerMix[source.type] = (sourceDaily / totalDailyEnergy) * 100;
    });

    const costBreakdown = {
      battery: batteryStorageSize * 200,
      hydrogen: hydrogenStorageSize * hydrogenCostPerKwh,
      generator: generatorDeficitKwh * generatorCostPerKwh,
      total: 0
    };

    costBreakdown.total = costBreakdown.battery + costBreakdown.hydrogen + costBreakdown.generator;

    return {
      totalDailyEnergy,
      batteryStorageSize,
      hydrogenFuelCellSize: fuelCellSize,
      hydrogenStorageSize,
      costBreakdown,
      powerMix
    };
  }
}
