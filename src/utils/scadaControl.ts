export interface WeatherForecast {
  timestamp: Date;
  irradianceWm2: number;
  cloudCoverPercent: number;
  temperature: number;
  windSpeed: number;
  severity: 'clear' | 'partial_cloud' | 'overcast' | 'severe_weather';
}

export interface SCAdAControlCommand {
  timestamp: Date;
  plantId: string;
  powerTargetKw: number;
  reactivePowerTargetVar: number;
  rampRateKwPerMinute: number;
  reason: string;
}

export interface ControlResponse {
  command: SCAdAControlCommand;
  expectedResponse: string;
  estimatedImpactKw: number;
  safetyFlags: string[];
}

export class SCADAControl {
  /**
   * Weather-Responsive Power Control
   * Preemptively adjust output based on forecast
   */
  static calculateWeatherResponsiveSetpoint(
    currentPowerKw: number,
    forecast: WeatherForecast,
    plantCapacityKw: number,
    rampRateLimitKwPerMinute: number = 100
  ): { targetPowerKw: number; rampRateKwPerMinute: number; reason: string } {
    let targetPowerKw = currentPowerKw;
    let rampRate = rampRateLimitKwPerMinute;
    let reason = '';

    // Severe weather: immediately reduce to 20% for safety
    if (forecast.severity === 'severe_weather') {
      targetPowerKw = plantCapacityKw * 0.2;
      rampRate = Math.min(rampRateLimitKwPerMinute, plantCapacityKw * 0.1); // Faster ramp
      reason = 'Severe weather detected - emergency power reduction';
      return { targetPowerKw, rampRateKwPerMinute: rampRate, reason };
    }

    // Calculate max available power from forecast irradiance
    const maxAvailablePowerKw = (forecast.irradianceWm2 / 1000) * plantCapacityKw;

    // Overcast conditions: gradual reduction
    if (forecast.severity === 'overcast') {
      const overcastReduction = 0.7; // Keep 70% of max available
      targetPowerKw = maxAvailablePowerKw * overcastReduction;
      rampRate = Math.min(rampRateLimitKwPerMinute, (Math.abs(targetPowerKw - currentPowerKw) / 5)); // 5-minute ramp
      reason = 'Overcast forecast - gradual power reduction to maintain grid stability';
      return { targetPowerKw, rampRateKwPerMinute: rampRate, reason };
    }

    // Partial cloud: moderate adjustment
    if (forecast.severity === 'partial_cloud') {
      targetPowerKw = maxAvailablePowerKw * 0.85;
      rampRate = Math.min(rampRateLimitKwPerMinute, (Math.abs(targetPowerKw - currentPowerKw) / 3));
      reason = 'Partial cloud cover - adjusting for forecast conditions';
      return { targetPowerKw, rampRateKwPerMinute: rampRate, reason };
    }

    // Clear sky: ramp up to maximum available
    if (forecast.severity === 'clear') {
      targetPowerKw = maxAvailablePowerKw * 0.95; // Slight margin
      rampRate = Math.min(rampRateLimitKwPerMinute, (Math.abs(targetPowerKw - currentPowerKw) / 2));
      reason = 'Clear sky forecast - ramping to maximum available power';
      return { targetPowerKw, rampRateKwPerMinute: rampRate, reason };
    }

    return { targetPowerKw, rampRateKwPerMinute: rampRate, reason };
  }

  /**
   * Generate SCADA control command with ramp profile
   */
  static generateControlCommand(
    plantId: string,
    currentPowerKw: number,
    targetPowerKw: number,
    maxRampKwPerMinute: number,
    rampTimeMinutes: number = 1
  ): SCAdAControlCommand {
    // Calculate appropriate ramp rate
    const powerChange = Math.abs(targetPowerKw - currentPowerKw);
    const requiredRampRate = powerChange / (rampTimeMinutes > 0 ? rampTimeMinutes : 1);
    const actualRampRate = Math.min(requiredRampRate, maxRampKwPerMinute);

    return {
      timestamp: new Date(),
      plantId,
      powerTargetKw: targetPowerKw,
      reactivePowerTargetVar: 0,
      rampRateKwPerMinute: actualRampRate,
      reason: `Ramping power from ${currentPowerKw} kW to ${targetPowerKw} kW`
    };
  }

  /**
   * Frequency support: Droop control for grid stabilization
   * When grid frequency drops, plant increases output
   */
  static calculateFrequencySupportResponse(
    gridFrequencyHz: number,
    nominalFrequencyHz: number = 50,
    currentPowerKw: number,
    maxOutputKw: number,
    droopPercent: number = 5
  ): { adjustedPowerKw: number; frequencyError: number; reason: string } {
    const frequencyError = gridFrequencyHz - nominalFrequencyHz;
    const frequencyErrorPercent = (frequencyError / nominalFrequencyHz) * 100;

    // Droop curve: ΔP = -P_rated × (Δf / f_rated) / droop%
    const powerAdjustmentPercent = -(frequencyErrorPercent / droopPercent);
    let adjustedPowerKw = currentPowerKw * (1 + powerAdjustmentPercent);

    adjustedPowerKw = Math.min(adjustedPowerKw, maxOutputKw);
    adjustedPowerKw = Math.max(0, adjustedPowerKw);

    let reason = 'Normal operation';
    if (frequencyError < -0.5) {
      reason = `Grid frequency low (${gridFrequencyHz} Hz) - increasing output for support`;
    } else if (frequencyError > 0.5) {
      reason = `Grid frequency high (${gridFrequencyHz} Hz) - reducing output to reduce load`;
    }

    return {
      adjustedPowerKw,
      frequencyError,
      reason
    };
  }

  /**
   * Voltage support: Reactive power injection/absorption
   */
  static calculateVoltageSupportResponse(
    gridVoltagePerUnit: number,
    nominalVoltagePerUnit: number = 1.0,
    maxReactivePowerVar: number = 50000
  ): { reactivePowerVar: number; voltageError: number; reason: string } {
    const voltageError = gridVoltagePerUnit - nominalVoltagePerUnit;
    const voltageErrorPercent = (voltageError / nominalVoltagePerUnit) * 100;

    // Volt-VAR curve: inject reactive power when voltage is low
    let reactivePowerVar = 0;

    if (voltageErrorPercent < -2) {
      // Low voltage: inject reactive power
      reactivePowerVar = maxReactivePowerVar * Math.min(1, Math.abs(voltageErrorPercent) / 5);
      return {
        reactivePowerVar,
        voltageError,
        reason: `Low voltage (${gridVoltagePerUnit} pu) - injecting reactive power`
      };
    }

    if (voltageErrorPercent > 2) {
      // High voltage: absorb reactive power
      reactivePowerVar = -maxReactivePowerVar * Math.min(1, voltageErrorPercent / 5);
      return {
        reactivePowerVar,
        voltageError,
        reason: `High voltage (${gridVoltagePerUnit} pu) - absorbing reactive power`
      };
    }

    return {
      reactivePowerVar,
      voltageError,
      reason: 'Voltage within normal range - no reactive power support needed'
    };
  }

  /**
   * Emergency Shutdown Logic
   * Triggered by severe weather or grid faults
   */
  static generateEmergencyShutdown(
    plantId: string,
    reason: string,
    gracefulShutdownMinutes: number = 0
  ): SCAdAControlCommand {
    return {
      timestamp: new Date(),
      plantId,
      powerTargetKw: 0,
      reactivePowerTargetVar: 0,
      rampRateKwPerMinute: gracefulShutdownMinutes > 0 ? 50 : 1000, // Fast vs graceful
      reason: `Emergency shutdown: ${reason}`
    };
  }

  /**
   * Validate control command safety
   */
  static validateControlCommand(
    command: SCAdAControlCommand,
    currentPowerKw: number,
    maxRampKwPerMinute: number,
    plantCapacityKw: number
  ): ControlResponse {
    const safetyFlags: string[] = [];
    const powerChange = Math.abs(command.powerTargetKw - currentPowerKw);

    // Check ramp rate
    if (command.rampRateKwPerMinute > maxRampKwPerMinute) {
      safetyFlags.push(`Ramp rate ${command.rampRateKwPerMinute} exceeds maximum ${maxRampKwPerMinute}`);
    }

    // Check power limits
    if (command.powerTargetKw > plantCapacityKw) {
      safetyFlags.push(`Target power exceeds plant capacity`);
    }

    // Check for sudden changes (>20% per minute)
    const suddenChangePercent = (powerChange / plantCapacityKw) * 100;
    if (suddenChangePercent > 20) {
      safetyFlags.push(`Sudden power change detected: ${suddenChangePercent.toFixed(1)}%`);
    }

    const estimatedRampTimeMinutes = command.rampRateKwPerMinute > 0 ?
      powerChange / command.rampRateKwPerMinute : 0;

    return {
      command,
      expectedResponse: safetyFlags.length === 0 ? 'Command accepted' : 'Command modified for safety',
      estimatedImpactKw: powerChange,
      safetyFlags
    };
  }

  /**
   * Calculate grid loading impact
   */
  static calculateGridLoadingImpact(
    previousOutputKw: number,
    newOutputKw: number,
    gridCapacityMw: number,
    currentGridLoadingMw: number
  ): { loadingPercent: number; riskLevel: string; recommendation: string } {
    const newGridLoadingMw = currentGridLoadingMw + ((newOutputKw - previousOutputKw) / 1000);
    const loadingPercent = (newGridLoadingMw / gridCapacityMw) * 100;

    let riskLevel = 'Low';
    let recommendation = 'No action needed';

    if (loadingPercent > 85) {
      riskLevel = 'High';
      recommendation = 'Consider curtailing or dispatching storage';
    } else if (loadingPercent > 70) {
      riskLevel = 'Medium';
      recommendation = 'Monitor grid conditions closely';
    }

    return { loadingPercent, riskLevel, recommendation };
  }
}

export const scadaControl = new SCADAControl();
