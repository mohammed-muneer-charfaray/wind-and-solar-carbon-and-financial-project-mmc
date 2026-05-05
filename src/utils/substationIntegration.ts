export interface GridVoltageProfile {
  continuousThreshold: number; // kV
  momentaryThreshold: number; // kV
  temporaryThreshold: number; // kV
  ridethrough: boolean;
}

export interface ProtectionEvent {
  timestamp: Date;
  eventType: 'voltage_fault' | 'frequency_fault' | 'reverse_power' | 'anti_islanding' | 'grid_loss';
  severity: 'warning' | 'critical';
  gridVoltageKv?: number;
  gridFrequencyHz?: number;
  action: 'monitor' | 'throttle' | 'disconnect';
  plantStatus: 'normal' | 'ride_through' | 'disconnected';
}

export interface SubstationProtection {
  overVoltageKv: number;
  underVoltageKv: number;
  overFrequencyHz: number;
  underFrequencyHz: number;
  antiIslandingEnabled: boolean;
  antiIslandingDetectionTimeMs: number;
  lowVoltageRideThroughKv: number;
  highVoltageRideThroughKv: number;
}

export interface SCADASetpoint {
  activePowerTargetKw: number;
  reactivePowerTargetVar: number;
  voltageSetpointV: number;
  frequencyDampingPercent: number;
}

export class SubstationIntegration {
  private static readonly DEFAULT_PROTECTION: SubstationProtection = {
    overVoltageKv: 1.2,
    underVoltageKv: 0.45,
    overFrequencyHz: 52,
    underFrequencyHz: 47,
    antiIslandingEnabled: true,
    antiIslandingDetectionTimeMs: 160,
    lowVoltageRideThroughKv: 0.45,
    highVoltageRideThroughKv: 1.2
  };

  /**
   * IEEE 1547-2018 Anti-Islanding Check
   * Detects grid loss and requires immediate disconnection
   */
  static performAntiIslandingCheck(
    gridVoltageKv: number,
    gridFrequencyHz: number,
    voltageChangeRateKvPerSecond: number,
    frequencyChangeRateHzPerSecond: number,
    detectionTimeMs: number = 160
  ): { isAntiIslandingDetected: boolean; reason: string } {
    // Voltage collapse detection (loss of grid voltage)
    if (gridVoltageKv < 0.1) {
      return {
        isAntiIslandingDetected: true,
        reason: 'Voltage collapse detected - grid loss confirmed'
      };
    }

    // Frequency drift detection
    const frequencyDriftThreshold = 1.0; // Hz
    if (Math.abs(gridFrequencyHz - 50) > frequencyDriftThreshold) {
      return {
        isAntiIslandingDetected: true,
        reason: `Frequency drift detected: ${gridFrequencyHz} Hz (threshold: ±${frequencyDriftThreshold} Hz)`
      };
    }

    // Rate of change of frequency (RoCoF) detection
    const rocofThreshold = 2.0; // Hz/s
    if (Math.abs(frequencyChangeRateHzPerSecond) > rocofThreshold) {
      return {
        isAntiIslandingDetected: true,
        reason: `High RoCoF detected: ${frequencyChangeRateHzPerSecond} Hz/s`
      };
    }

    // Voltage phase angle jump (Phase Lock Loop check)
    const voltageRateThreshold = 6; // kV/s
    if (Math.abs(voltageChangeRateKvPerSecond) > voltageRateThreshold) {
      return {
        isAntiIslandingDetected: true,
        reason: 'Voltage rate of change threshold exceeded'
      };
    }

    return {
      isAntiIslandingDetected: false,
      reason: 'Normal grid connection - anti-islanding check passed'
    };
  }

  /**
   * IEEE 1547 Low Voltage Ride Through (LVRT)
   * Plant must remain connected during temporary voltage dips
   */
  static checkLowVoltageRideThrough(
    gridVoltagePerUnit: number, // 0 to 1.0 (per unit of nominal)
    durationMs: number,
    protection: SubstationProtection = this.DEFAULT_PROTECTION
  ): { mustRideThrough: boolean; mustDisconnect: boolean; reason: string } {
    const thresholdLvrt = protection.lowVoltageRideThroughKv / 1.0; // Assuming 1kV nominal

    if (gridVoltagePerUnit >= thresholdLvrt) {
      return {
        mustRideThrough: false,
        mustDisconnect: false,
        reason: 'Voltage within normal range'
      };
    }

    // Check LVRT timing curve (typical IEEE 1547)
    if (gridVoltagePerUnit >= 0.7 && durationMs <= 3000) {
      return { mustRideThrough: true, mustDisconnect: false, reason: 'LVRT Zone 1: must remain connected' };
    }

    if (gridVoltagePerUnit >= 0.45 && durationMs <= 1000) {
      return { mustRideThrough: true, mustDisconnect: false, reason: 'LVRT Zone 2: must remain connected' };
    }

    if (gridVoltagePerUnit < 0.45) {
      return {
        mustRideThrough: false,
        mustDisconnect: true,
        reason: 'Voltage below minimum threshold - must disconnect'
      };
    }

    return {
      mustRideThrough: false,
      mustDisconnect: true,
      reason: 'LVRT time exceeded - must disconnect'
    };
  }

  /**
   * High Voltage Ride Through (HVRT)
   * Plant must remain connected during temporary over-voltage
   */
  static checkHighVoltageRideThrough(
    gridVoltagePerUnit: number,
    durationMs: number,
    protection: SubstationProtection = this.DEFAULT_PROTECTION
  ): { mustRideThrough: boolean; mustDisconnect: boolean; reason: string } {
    const thresholdHvrt = protection.highVoltageRideThroughKv / 1.0;

    if (gridVoltagePerUnit <= thresholdHvrt) {
      return {
        mustRideThrough: false,
        mustDisconnect: false,
        reason: 'Voltage within normal range'
      };
    }

    // Typical HVRT curve
    if (gridVoltagePerUnit <= 1.2 && durationMs <= 3000) {
      return { mustRideThrough: true, mustDisconnect: false, reason: 'HVRT Zone 1: must remain connected' };
    }

    if (gridVoltagePerUnit <= 1.5 && durationMs <= 500) {
      return { mustRideThrough: true, mustDisconnect: false, reason: 'HVRT Zone 2: must remain connected' };
    }

    return {
      mustRideThrough: false,
      mustDisconnect: true,
      reason: 'Over-voltage threshold exceeded - must disconnect'
    };
  }

  /**
   * Frequency response check
   * Ensure inverter can respond to grid frequency changes
   */
  static checkFrequencyCompliance(
    gridFrequencyHz: number,
    protection: SubstationProtection = this.DEFAULT_PROTECTION
  ): { isCompliant: boolean; action: string } {
    if (gridFrequencyHz > protection.overFrequencyHz) {
      return {
        isCompliant: false,
        action: 'Trip and disconnect - frequency too high'
      };
    }

    if (gridFrequencyHz < protection.underFrequencyHz) {
      return {
        isCompliant: false,
        action: 'Trip and disconnect - frequency too low'
      };
    }

    // Nominal frequency support
    if (gridFrequencyHz < 49.5) {
      return {
        isCompliant: true,
        action: 'Reduce frequency droop or increase generation'
      };
    }

    if (gridFrequencyHz > 50.5) {
      return {
        isCompliant: true,
        action: 'Increase frequency droop or reduce generation'
      };
    }

    return {
      isCompliant: true,
      action: 'Normal operation'
    };
  }

  /**
   * Reverse Power Flow Detection
   * Protects substation transformer from backfeeding
   */
  static checkReversePowerFlow(
    realPowerKw: number,
    reactivePowerVar: number
  ): { isReverseFlow: boolean; magnitude: number; action: string } {
    if (realPowerKw < -0.1) {
      // Negative power = reverse flow (plant consuming power)
      const magnitude = Math.abs(realPowerKw);
      return {
        isReverseFlow: true,
        magnitude,
        action: magnitude > 10 ? 'Trip immediately' : 'Monitor reverse power flow'
      };
    }

    return {
      isReverseFlow: false,
      magnitude: Math.abs(realPowerKw),
      action: 'Normal forward power flow'
    };
  }

  /**
   * Generate Volt-VAR reactive power setpoint
   * Per IEEE 1547 reactive power support capability
   */
  static calculateVoltVARSetpoint(
    gridVoltagePerUnit: number,
    maxReactivePowerVar: number = 50000
  ): SCADASetpoint {
    let reactivePowerSetpoint = 0;

    // Typical Volt-VAR curve
    if (gridVoltagePerUnit < 0.92) {
      reactivePowerSetpoint = maxReactivePowerVar * 0.4; // Inject 40% reactive power
    } else if (gridVoltagePerUnit >= 0.92 && gridVoltagePerUnit <= 1.08) {
      reactivePowerSetpoint = 0; // Normal range, no reactive injection
    } else if (gridVoltagePerUnit > 1.08) {
      reactivePowerSetpoint = -maxReactivePowerVar * 0.4; // Absorb 40% reactive power
    }

    return {
      activePowerTargetKw: 0, // Set separately
      reactivePowerTargetVar: reactivePowerSetpoint,
      voltageSetpointV: gridVoltagePerUnit * 1000,
      frequencyDampingPercent: 2
    };
  }

  /**
   * Modbus TCP Register mapping for SCADA
   * Standard Modbus registers for DER control
   */
  static getModbusRegisterMap(): Record<string, { address: number; type: string }> {
    return {
      PLANT_STATUS: { address: 0, type: 'uint16' },
      ACTIVE_POWER_KW: { address: 1, type: 'float32' },
      REACTIVE_POWER_VAR: { address: 3, type: 'float32' },
      VOLTAGE_V: { address: 5, type: 'float32' },
      FREQUENCY_HZ: { address: 7, type: 'float32' },
      POWER_SETPOINT_KW: { address: 100, type: 'float32' },
      REACTIVE_SETPOINT_VAR: { address: 102, type: 'float32' },
      TRIP_COMMAND: { address: 200, type: 'uint16' },
      RESTORE_COMMAND: { address: 201, type: 'uint16' }
    };
  }

  /**
   * Generate protection event log
   */
  static createProtectionEvent(
    eventType: ProtectionEvent['eventType'],
    gridVoltageKv?: number,
    gridFrequencyHz?: number,
    reason?: string
  ): ProtectionEvent {
    const isCritical = eventType === 'anti_islanding' || eventType === 'grid_loss';
    const action = isCritical ? 'disconnect' : 'throttle';

    return {
      timestamp: new Date(),
      eventType,
      severity: isCritical ? 'critical' : 'warning',
      gridVoltageKv,
      gridFrequencyHz,
      action,
      plantStatus: isCritical ? 'disconnected' : 'normal'
    };
  }
}

export const substationIntegration = new SubstationIntegration();
