import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Zap, Gauge, Wind, Radio } from 'lucide-react';
import { WeatherData } from '../types';

interface SCADADashboardProps {
  substationId: string;
  userId: string;
  weather?: WeatherData | null;
}

interface ControlCommand {
  timestamp: Date;
  plantId: string;
  powerTargetKw: number;
  reason: string;
}

export default function SCADADashboard({ substationId, userId, weather }: SCADADashboardProps) {
  const [currentPower, setCurrentPower] = useState(450);
  const [gridVoltage, setGridVoltage] = useState(1.02);
  const [gridFrequency, setGridFrequency] = useState(50.1);
  const [plantStatus, setPlantStatus] = useState<'normal' | 'warning' | 'critical'>('normal');
  const [controlCommands, setControlCommands] = useState<ControlCommand[]>([]);
  const [protectionEvents, setProtectionEvents] = useState<any[]>([]);
  const [targetPower, setTargetPower] = useState(450);
  const [weatherCondition, setWeatherCondition] = useState<'clear' | 'partial_cloud' | 'overcast' | 'severe_weather'>('partial_cloud');

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate power fluctuations
      setCurrentPower(prev => {
        const change = (Math.random() - 0.5) * 50;
        return Math.max(0, Math.min(500, prev + change));
      });

      // Simulate voltage variation
      setGridVoltage(prev => {
        const change = (Math.random() - 0.5) * 0.02;
        return Math.max(0.9, Math.min(1.1, prev + change));
      });

      // Simulate frequency variation
      setGridFrequency(prev => {
        const change = (Math.random() - 0.5) * 0.05;
        return Math.max(49.5, Math.min(50.5, prev + change));
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Weather-responsive power control
  useEffect(() => {
    let targetPowerKw = 450;
    let reason = '';

    if (weatherCondition === 'severe_weather') {
      targetPowerKw = 100;
      reason = 'Severe weather detected - emergency power reduction to 20%';
    } else if (weatherCondition === 'overcast') {
      targetPowerKw = 300;
      reason = 'Overcast forecast - gradual power reduction';
    } else if (weatherCondition === 'partial_cloud') {
      targetPowerKw = 380;
      reason = 'Partial cloud cover - adjusting for forecast conditions';
    } else {
      targetPowerKw = 450;
      reason = 'Clear sky forecast - ramping to maximum available power';
    }

    setTargetPower(targetPowerKw);

    if (controlCommands.length === 0 || controlCommands[0].reason !== reason) {
      const command: ControlCommand = {
        timestamp: new Date(),
        plantId: substationId,
        powerTargetKw,
        reason
      };
      setControlCommands([command]);
    }
  }, [weatherCondition, substationId]);

  // Check grid conditions and set status
  useEffect(() => {
    let status: 'normal' | 'warning' | 'critical' = 'normal';
    let event = null;

    // Check anti-islanding conditions
    if (gridVoltage < 0.1) {
      status = 'critical';
      event = {
        timestamp: new Date(),
        type: 'anti_islanding',
        reason: 'Voltage collapse detected - grid loss confirmed',
        severity: 'critical'
      };
    }
    // Check frequency
    else if (Math.abs(gridFrequency - 50) > 1.0) {
      status = 'critical';
      event = {
        timestamp: new Date(),
        type: 'frequency_fault',
        reason: `Frequency drift: ${gridFrequency.toFixed(2)} Hz`,
        severity: 'critical'
      };
    }
    // Check voltage limits
    else if (gridVoltage < 0.45 || gridVoltage > 1.2) {
      status = 'warning';
      event = {
        timestamp: new Date(),
        type: 'voltage_fault',
        reason: `Abnormal voltage: ${gridVoltage.toFixed(3)} kV`,
        severity: 'warning'
      };
    }

    setPlantStatus(status);

    if (event && protectionEvents.length < 10) {
      setProtectionEvents(prev => [event, ...prev.slice(0, 9)]);
    }
  }, [gridVoltage, gridFrequency]);

  // Calculate frequency support response
  const frequencyError = gridFrequency - 50;
  const frequencySupport = {
    frequencyError,
    adjustedPower: currentPower * (1 - (frequencyError / 50) * 0.05),
    reason: frequencyError < -0.5 ? 'Grid frequency low - increasing output' :
            frequencyError > 0.5 ? 'Grid frequency high - reducing output' :
            'Normal operation'
  };

  // Calculate voltage support
  const voltageError = gridVoltage - 1.0;
  let voltageReactiveSupport = 0;
  let voltageReason = 'Voltage within normal range';

  if (voltageError < -0.08) {
    voltageReactiveSupport = 20000;
    voltageReason = 'Low voltage - injecting reactive power';
  } else if (voltageError > 0.08) {
    voltageReactiveSupport = -20000;
    voltageReason = 'High voltage - absorbing reactive power';
  }

  const handleEmergencyShutdown = () => {
    setCurrentPower(0);
    setTargetPower(0);
    setPlantStatus('critical');
    const command: ControlCommand = {
      timestamp: new Date(),
      plantId: substationId,
      powerTargetKw: 0,
      reason: 'Emergency shutdown initiated'
    };
    setControlCommands([command]);
  };

  const handleWeatherUpdate = (severity: 'clear' | 'partial_cloud' | 'overcast' | 'severe_weather') => {
    setWeatherCondition(severity);
  };

  const irradiance = weatherCondition === 'clear' ? 950 :
                     weatherCondition === 'partial_cloud' ? 750 :
                     weatherCondition === 'overcast' ? 400 : 100;

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">Current Power</span>
            <Zap className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{currentPower.toFixed(1)} kW</p>
          <p className="text-xs text-gray-500 mt-1">Real-time output</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-amber-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">Grid Voltage</span>
            <Gauge className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{gridVoltage.toFixed(3)} kV</p>
          <p className="text-xs text-gray-500 mt-1">{gridVoltage < 0.45 ? 'Low' : gridVoltage > 1.2 ? 'High' : 'Normal'}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">Frequency</span>
            <Radio className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{gridFrequency.toFixed(2)} Hz</p>
          <p className="text-xs text-gray-500 mt-1">{Math.abs(gridFrequency - 50) > 1 ? 'Abnormal' : 'Normal'}</p>
        </div>

        <div className={`p-4 rounded-lg shadow border-l-4 ${
          plantStatus === 'normal' ? 'bg-green-50 border-green-500' :
          plantStatus === 'warning' ? 'bg-yellow-50 border-yellow-500' :
          'bg-red-50 border-red-500'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">Plant Status</span>
            {plantStatus === 'normal' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
             plantStatus === 'warning' ? <AlertTriangle className="h-5 w-5 text-yellow-600" /> :
             <AlertTriangle className="h-5 w-5 text-red-600" />}
          </div>
          <p className="text-2xl font-bold capitalize">{plantStatus}</p>
          <p className="text-xs text-gray-500 mt-1">IEEE 1547 compliant</p>
        </div>
      </div>

      {/* Control Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weather & Power Control */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weather-Responsive Control</h3>

          <div className="space-y-3 mb-4">
            <label className="block text-sm font-medium text-gray-700">Weather Forecast</label>
            <div className="flex flex-wrap gap-2">
              {(['clear', 'partial_cloud', 'overcast', 'severe_weather'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => handleWeatherUpdate(level)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    weatherCondition === level
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {level.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded mb-4">
            <div className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Irradiance:</span> {irradiance} W/m²
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Cloud Cover:</span> {weatherCondition === 'clear' ? '0%' : weatherCondition === 'partial_cloud' ? '20%' : weatherCondition === 'overcast' ? '80%' : '95%'}
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <label className="block text-sm font-medium text-gray-700">Target Power: {targetPower.toFixed(0)} kW</label>
            <input
              type="range"
              min="0"
              max="500"
              value={targetPower}
              onChange={(e) => setTargetPower(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <button
            onClick={handleEmergencyShutdown}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors"
          >
            Emergency Shutdown
          </button>
        </div>

        {/* Support Controls */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Grid Support Functions</h3>

          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Frequency Support (Droop Control)</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Frequency Error:</span> {frequencySupport.frequencyError.toFixed(3)} Hz</p>
                <p><span className="font-medium">Adjusted Power:</span> {frequencySupport.adjustedPower.toFixed(1)} kW</p>
                <p className="text-xs mt-2 text-gray-500">{frequencySupport.reason}</p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Voltage Support (Volt-VAR)</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Voltage Error:</span> {voltageError.toFixed(3)} pu</p>
                <p><span className="font-medium">Reactive Power:</span> {voltageReactiveSupport.toFixed(0)} VAR</p>
                <p className="text-xs mt-2 text-gray-500">{voltageReason}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Control Commands */}
      {controlCommands.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Control Commands</h3>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {controlCommands.map((cmd, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-sm">
                <p className="font-medium text-gray-900">{cmd.reason}</p>
                <div className="text-xs text-gray-600 mt-1 space-y-1">
                  <p>Target: {cmd.powerTargetKw.toFixed(1)} kW</p>
                  <p>{cmd.timestamp.toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Protection Events Log */}
      {protectionEvents.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Protection Events</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {protectionEvents.map((event, idx) => (
              <div
                key={idx}
                className={`border-l-4 p-3 rounded ${
                  event.severity === 'critical'
                    ? 'bg-red-50 border-red-500'
                    : 'bg-yellow-50 border-yellow-500'
                }`}
              >
                <p className="text-sm font-medium text-gray-900">{event.type.replace('_', ' ')}</p>
                <p className="text-xs text-gray-700 mt-1">{event.reason}</p>
                <p className="text-xs text-gray-600 mt-1">{event.timestamp.toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-medium">SCADA Control System:</span> Real-time monitoring and control of solar plant interconnected to utility substation. Compliant with IEEE 1547-2018 DER standards including anti-islanding, voltage ride-through, and frequency support capabilities.
        </p>
      </div>
    </div>
  );
}
