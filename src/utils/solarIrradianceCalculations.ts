import { WeatherData } from '../types';

export interface TMYMonthData {
  month: number;
  avgIrradiance: number;
  avgTemperature: number;
  avgCloudCover: number;
}

export interface PVPanelSpec {
  areaM2: number;
  efficiencyPercent: number;
  stcRating: number; // W under 1000 W/m²
  temperatureCoefficientPercent: number; // typically -0.4 to -0.5% per °C
}

export interface PVOutputCalculation {
  instantaneousPowerW: number;
  dailyEnergyKwh: number;
  monthlyEnergyKwh: number;
  annualEnergyKwh: number;
  effectiveLossPercent: number;
}

export class SolarIrradianceCalculator {
  // Typical Meteorological Year (TMY) data - representative 10-year averages for different locations
  // These values are based on NREL/NASA solar radiation data
  private static readonly TMY_DATA: Record<string, TMYMonthData[]> = {
    johannesburg: [
      { month: 1, avgIrradiance: 5.2, avgTemperature: 20.5, avgCloudCover: 45 },
      { month: 2, avgIrradiance: 5.0, avgTemperature: 20.3, avgCloudCover: 50 },
      { month: 3, avgIrradiance: 4.8, avgTemperature: 19.2, avgCloudCover: 48 },
      { month: 4, avgIrradiance: 4.2, avgTemperature: 16.8, avgCloudCover: 40 },
      { month: 5, avgIrradiance: 3.8, avgTemperature: 13.5, avgCloudCover: 35 },
      { month: 6, avgIrradiance: 3.5, avgTemperature: 11.2, avgCloudCover: 32 },
      { month: 7, avgIrradiance: 3.9, avgTemperature: 12.1, avgCloudCover: 30 },
      { month: 8, avgIrradiance: 4.6, avgTemperature: 14.8, avgCloudCover: 28 },
      { month: 9, avgIrradiance: 5.3, avgTemperature: 17.5, avgCloudCover: 35 },
      { month: 10, avgIrradiance: 5.8, avgTemperature: 21.2, avgCloudCover: 42 },
      { month: 11, avgIrradiance: 5.9, avgTemperature: 22.3, avgCloudCover: 48 },
      { month: 12, avgIrradiance: 5.4, avgTemperature: 21.8, avgCloudCover: 46 }
    ]
  };

  /**
   * Calculate instantaneous PV power output
   * Formula: P = G × A × η
   * where G is irradiance (W/m²), A is panel area (m²), η is efficiency
   */
  static calculateInstantaneousPower(
    irradianceWm2: number,
    panelSpec: PVPanelSpec,
    ambientTemperatureC: number = 25
  ): number {
    // Apply temperature coefficient correction to efficiency
    const temperatureDifference = ambientTemperatureC - 25; // STC is 25°C
    const temperatureLossPercent = (panelSpec.temperatureCoefficientPercent * temperatureDifference);
    const adjustedEfficiency = panelSpec.efficiencyPercent + temperatureLossPercent;

    // Calculate power: P = G × A × η
    const powerW = (irradianceWm2 / 1000) * panelSpec.stcRating * (Math.max(0, adjustedEfficiency) / 100);

    return Math.max(0, powerW);
  }

  /**
   * Calculate daily energy output
   * Integrates hourly power output over 24 hours
   */
  static calculateDailyEnergy(
    hourlyIrradiance: number[], // 24 values, W/m²
    panelSpec: PVPanelSpec,
    hourlyTemperatures: number[] = Array(24).fill(25)
  ): number {
    let totalEnergyWh = 0;

    for (let hour = 0; hour < 24; hour++) {
      const powerW = this.calculateInstantaneousPower(
        hourlyIrradiance[hour],
        panelSpec,
        hourlyTemperatures[hour]
      );
      totalEnergyWh += powerW; // 1 hour interval
    }

    return totalEnergyWh / 1000; // Convert to kWh
  }

  /**
   * Calculate annual energy from TMY data
   */
  static calculateAnnualEnergy(
    panelSpec: PVPanelSpec,
    locationKey: string = 'johannesburg',
    numPanels: number = 1
  ): { annualEnergyKwh: number; monthlyBreakdown: number[] } {
    const tmyData = this.TMY_DATA[locationKey.toLowerCase()] || this.TMY_DATA.johannesburg;
    let totalAnnualEnergy = 0;
    const monthlyBreakdown: number[] = [];

    tmyData.forEach(monthData => {
      // Convert PSH (Peak Sun Hours) to daily average
      const daysInMonth = 30; // Average
      const dailyEnergyPerPanelKwh = monthData.avgIrradiance * panelSpec.areaM2 *
        (panelSpec.efficiencyPercent / 100) * 0.85; // 0.85 is typical system loss factor

      const monthlyEnergyKwh = dailyEnergyPerPanelKwh * daysInMonth * numPanels;
      monthlyBreakdown.push(monthlyEnergyKwh);
      totalAnnualEnergy += monthlyEnergyKwh;
    });

    return { annualEnergyKwh: totalAnnualEnergy, monthlyBreakdown };
  }

  /**
   * Apply loss factors to energy calculations
   * Per IEC 61724 standard
   */
  static applyLossFactors(
    energyKwh: number,
    temperatureLossPercent: number = 0.5,
    inverterLossPercent: number = 3,
    soilingLossPercent: number = 2
  ): { netEnergyKwh: number; totalLossPercent: number } {
    const totalLossPercent = temperatureLossPercent + inverterLossPercent + soilingLossPercent;
    const netEnergyKwh = energyKwh * (1 - totalLossPercent / 100);

    return { netEnergyKwh, totalLossPercent };
  }

  /**
   * Calculate complete PV output metrics
   */
  static calculatePVOutput(
    irradianceWm2: number,
    panelSpec: PVPanelSpec,
    numPanels: number,
    ambientTemperatureC: number = 25,
    daysPerMonth: number = 30,
    locationKey: string = 'johannesburg'
  ): PVOutputCalculation {
    // Instantaneous power per panel
    const powerPerPanelW = this.calculateInstantaneousPower(
      irradianceWm2,
      panelSpec,
      ambientTemperatureC
    );
    const totalInstantaneousW = powerPerPanelW * numPanels;

    // Estimate daily, monthly, and annual from hourly average approximation
    const avgPeakSunHours = 5; // Typical PSH per day for Johannesburg
    const dailyEnergyKwhPerPanel = (panelSpec.areaM2 * panelSpec.efficiencyPercent / 100) *
      avgPeakSunHours * (1 - 0.05); // 5% system efficiency margin
    const dailyEnergyKwh = dailyEnergyKwhPerPanel * numPanels;
    const monthlyEnergyKwh = dailyEnergyKwh * daysPerMonth;

    const { annualEnergyKwh } = this.calculateAnnualEnergy(panelSpec, locationKey, numPanels);

    // Apply loss factors
    const { totalLossPercent } = this.applyLossFactors(monthlyEnergyKwh);

    return {
      instantaneousPowerW: totalInstantaneousW,
      dailyEnergyKwh,
      monthlyEnergyKwh,
      annualEnergyKwh,
      effectiveLossPercent: totalLossPercent
    };
  }

  /**
   * Get TMY data for a location - can be extended with API calls to NREL/NASA
   */
  static getTMYData(locationKey: string): TMYMonthData[] {
    return this.TMY_DATA[locationKey.toLowerCase()] || this.TMY_DATA.johannesburg;
  }
}

// Convenience export
export const solarCalculator = new SolarIrradianceCalculator();
