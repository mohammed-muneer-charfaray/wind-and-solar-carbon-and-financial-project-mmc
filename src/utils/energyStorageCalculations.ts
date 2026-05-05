export interface BatteryStorageRequirement {
  requiredCapacityKwh: number;
  requiredModules: number;
  moduleCapacityKwh: number;
  cyclesPerDay: number;
  recommendedReplacementYears: number;
}

export interface HydrogenStorageRequirement {
  requiredKgH2: number;
  requiredTanks: number;
  electrolyzerPowerW: number;
  fuelCellOutputKw: number;
  energyDensity: number;
}

export interface EnergyBalanceResult {
  totalDemand: number;
  renewableGeneration: number;
  storageNeeded: number;
  batteryKwh: number;
  hydrogenKg: number;
  surplus: number;
}

export class EnergyStorageCalculator {
  /**
   * Battery Capacity Sizing Formula:
   * kWh_required = (Daily Load × Days of Autonomy) / (DoD × System Efficiency)
   */
  static calculateBatteryCapacity(
    dailyLoadKwh: number,
    daysOfAutonomy: number,
    depthOfDischargePercent: number = 80,
    roundTripEfficiencyPercent: number = 90,
    temperatureFactor: number = 1.0
  ): BatteryStorageRequirement {
    const doD = depthOfDischargePercent / 100;
    const efficiency = roundTripEfficiencyPercent / 100;

    // Core formula
    const requiredCapacityKwh = (dailyLoadKwh * daysOfAutonomy) / (doD * efficiency) * temperatureFactor;

    // Typical module size is 5 kWh
    const moduleCapacityKwh = 5;
    const requiredModules = Math.ceil(requiredCapacityKwh / moduleCapacityKwh);

    // Estimate battery lifecycle - typically 2-3 cycles per day reduces life
    const cyclesPerDay = dailyLoadKwh / (requiredCapacityKwh * doD);
    const estimatedLifeYears = 10 + (5 * (1 - cyclesPerDay / 3)); // Degradation model

    return {
      requiredCapacityKwh,
      requiredModules,
      moduleCapacityKwh,
      cyclesPerDay: Math.min(cyclesPerDay, 5),
      recommendedReplacementYears: Math.max(5, estimatedLifeYears)
    };
  }

  /**
   * Hydrogen Storage Calculation:
   * For electrolyzer: 1 kg H₂ requires ~50-55 kWh input (70% efficiency assumed)
   * For fuel cell: 1 kg H₂ yields ~20 kWh output (60% efficiency assumed)
   * Energy density: 1 kg H₂ = 33 kWh (LHV basis)
   */
  static calculateHydrogenStorage(
    energyDeficitKwh: number,
    electrolyzerEfficiencyPercent: number = 70,
    fuelCellEfficiencyPercent: number = 60,
    energyDensityKwhPerKg: number = 33
  ): HydrogenStorageRequirement {
    // Calculate required H₂ mass
    const requiredKgH2 = energyDeficitKwh / (energyDensityKwhPerKg * (fuelCellEfficiencyPercent / 100));

    // Typical hydrogen tank capacity is 100 kg
    const requiredTanks = Math.ceil(requiredKgH2 / 100);

    // Calculate electrolyzer power requirement (to produce daily deficit)
    const electrolyzerPowerW = (energyDeficitKwh * 1000) / (electrolyzerEfficiencyPercent / 100);

    // Calculate fuel cell output power
    const fuelCellOutputKw = (requiredKgH2 * energyDensityKwhPerKg * (fuelCellEfficiencyPercent / 100));

    return {
      requiredKgH2,
      requiredTanks,
      electrolyzerPowerW,
      fuelCellOutputKw,
      energyDensity: energyDensityKwhPerKg
    };
  }

  /**
   * Energy Balance Analysis
   * Determines demand - renewable = needed storage
   */
  static calculateEnergyBalance(
    totalDemandKwh: number,
    solarGenerationKwh: number,
    windGenerationKwh: number = 0,
    hydroGenerationKwh: number = 0,
    waveGenerationKwh: number = 0,
    batteryCapacityKwh: number = 0,
    hydrogenCapacityKg: number = 0,
    energyDensityKwhPerKg: number = 33,
    fuelCellEfficiencyPercent: number = 60
  ): EnergyBalanceResult {
    const renewableGeneration = solarGenerationKwh + windGenerationKwh + hydroGenerationKwh + waveGenerationKwh;
    let storageNeeded = Math.max(0, totalDemandKwh - renewableGeneration);

    // Distribute storage between battery and hydrogen
    let batteryDischargeKwh = Math.min(batteryCapacityKwh, storageNeeded);
    let remainingDeficit = Math.max(0, storageNeeded - batteryDischargeKwh);

    const hydrogenEnergyKwh = (hydrogenCapacityKg * energyDensityKwhPerKg * (fuelCellEfficiencyPercent / 100));
    let hydrogenDischargeKwh = Math.min(hydrogenEnergyKwh, remainingDeficit);
    let surplus = Math.max(0, renewableGeneration - totalDemandKwh);

    return {
      totalDemand: totalDemandKwh,
      renewableGeneration,
      storageNeeded,
      batteryKwh: batteryDischargeKwh,
      hydrogenKg: (remainingDeficit / (energyDensityKwhPerKg * (fuelCellEfficiencyPercent / 100))),
      surplus
    };
  }

  /**
   * Green Grid 100% Renewable Readiness Check
   * Calculates what storage is needed for 100% renewable coverage
   */
  static calculateGreenGridReadiness(
    averageDailyDemandKwh: number,
    peakSolarHoursPerDay: number = 5,
    peakWindHoursPerDay: number = 8,
    solarCapacityKw: number,
    windCapacityKw: number = 0,
    percentRenewableTarget: number = 100
  ): { requiredBatteryKwh: number; requiredHydrogenKg: number; yearsTo100Percent: number } {
    // Calculate non-solar hours per day
    const hoursWithoutSolar = 24 - peakSolarHoursPerDay;

    // Solar generation per day
    const solarGenerationKwh = solarCapacityKw * peakSolarHoursPerDay;

    // Wind generation per day (assume 40% capacity factor)
    const windGenerationKwh = windCapacityKw * peakWindHoursPerDay;

    // Total renewable during non-solar hours
    const renewableAtNightKwh = windGenerationKwh * (hoursWithoutSolar / 24);

    // Energy deficit during non-solar hours
    const nightDemandKwh = averageDailyDemandKwh * (hoursWithoutSolar / 24);
    const deficitDuringNight = Math.max(0, nightDemandKwh - renewableAtNightKwh);

    // Add margin for cloudy days (2 days of autonomy)
    const daysOfAutonomy = 2;
    const totalDeficit = deficitDuringNight * daysOfAutonomy;

    // Split 60/40 battery/hydrogen (typical for hybrid systems)
    const requiredBatteryKwh = totalDeficit * 0.6;
    const remainingForHydrogen = totalDeficit * 0.4;
    const requiredHydrogenKg = remainingForHydrogen / (33 * 0.6); // 33 kWh/kg, 60% efficiency

    // Estimate years to reach target if capacity increases by 10% annually
    let yearsTo100 = 0;
    let currentRenewablePercent = (solarGenerationKwh / averageDailyDemandKwh) * 100;

    while (currentRenewablePercent < percentRenewableTarget && yearsTo100 < 50) {
      yearsTo100++;
      currentRenewablePercent *= 1.1; // 10% annual increase
    }

    return {
      requiredBatteryKwh,
      requiredHydrogenKg,
      yearsTo100Percent: yearsTo100
    };
  }

  /**
   * Dispatch Strategy: Route energy optimally
   */
  static calculateDispatch(
    demandKw: number,
    availableSolarKw: number,
    availableWindKw: number,
    batteryStateOfChargePercent: number,
    batteryCapacityKw: number,
    hydrogenAvailableKg: number,
    hydrogenMaxDischargeKw: number = 50
  ): {
    solarDispatchKw: number;
    windDispatchKw: number;
    batteryDispatchKw: number;
    hydrogenDispatchKw: number;
    shortfallKw: number;
  } {
    let remainingDemand = demandKw;

    // Priority 1: Solar (cheapest, greenest)
    const solarDispatchKw = Math.min(availableSolarKw, remainingDemand);
    remainingDemand -= solarDispatchKw;

    // Priority 2: Wind
    const windDispatchKw = Math.min(availableWindKw, remainingDemand);
    remainingDemand -= windDispatchKw;

    // Priority 3: Battery (fast discharge, efficient)
    const batteryAvailableKw = (batteryStateOfChargePercent / 100) * batteryCapacityKw;
    const batteryDispatchKw = Math.min(batteryAvailableKw, remainingDemand);
    remainingDemand -= batteryDispatchKw;

    // Priority 4: Hydrogen fuel cell
    const hydrogenDispatchKw = Math.min(hydrogenMaxDischargeKw, hydrogenAvailableKg * 0.6, remainingDemand);
    remainingDemand -= hydrogenDispatchKw;

    // Remaining shortfall from grid/fossil
    const shortfallKw = Math.max(0, remainingDemand);

    return {
      solarDispatchKw,
      windDispatchKw,
      batteryDispatchKw,
      hydrogenDispatchKw,
      shortfallKw
    };
  }
}

export const energyStorageCalculator = new EnergyStorageCalculator();
