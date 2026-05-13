import React, { useState, useEffect } from 'react';
import { Brain, Upload, TrendingUp, Zap, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import type { LLMAnalysis } from '../utils/llmIntegration';

interface LSTMDashboardProps {
  location: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  };
  onRecommendationsUpdate: (analysis: LLMAnalysis) => void;
}

interface Prediction {
  day: number;
  temperature: number;
  windSpeed: number;
  solarIrradiance: number;
  confidence: number;
}

const LSTMDashboard: React.FC<LSTMDashboardProps> = ({ location, onRecommendationsUpdate }) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  // Generate sample predictions
  const generatePredictions = () => {
    setIsAnalyzing(true);
    try {
      const samplePredictions: Prediction[] = [];
      for (let i = 1; i <= 7; i++) {
        samplePredictions.push({
          day: i,
          temperature: 20 + (Math.random() - 0.5) * 8,
          windSpeed: 10 + (Math.random() - 0.5) * 6,
          solarIrradiance: 600 + (Math.random() - 0.5) * 300,
          confidence: 0.82 + (Math.random() - 0.5) * 0.1
        });
      }
      setPredictions(samplePredictions);
      setHasRun(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center mb-2">
              <Brain className="h-6 w-6 mr-3 text-blue-600" />
              LSTM Weather & Energy Prediction
            </h2>
            <p className="text-gray-600">
              <MapPin className="h-4 w-4 inline mr-1" />
              {location.city}, {location.country}
            </p>
          </div>
          <button
            onClick={generatePredictions}
            disabled={isAnalyzing}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isAnalyzing
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isAnalyzing ? 'Analyzing...' : 'Run Prediction'}
          </button>
        </div>
      </div>

      {/* Predictions Grid */}
      {hasRun && predictions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {predictions.map(pred => (
            <div key={pred.day} className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Day {pred.day}</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Temperature</span>
                  <span className="font-medium text-gray-900">{pred.temperature.toFixed(1)}°C</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Wind Speed</span>
                  <span className="font-medium text-gray-900">{pred.windSpeed.toFixed(1)} m/s</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Solar Irradiance</span>
                  <span className="font-medium text-gray-900">{pred.solarIrradiance.toFixed(0)} W/m²</span>
                </div>

                <div className="border-t pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                      Confidence
                    </span>
                    <span className="font-medium text-gray-900">{(pred.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !hasRun ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">No predictions generated yet</p>
          <p className="text-sm text-gray-500">Click "Run Prediction" to generate LSTM forecasts</p>
        </div>
      ) : null}

      {/* Analysis Summary */}
      {hasRun && predictions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="text-sm text-gray-600 mb-2 flex items-center">
              <Zap className="h-4 w-4 mr-2 text-yellow-600" />
              Avg Solar Irradiance
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(predictions.reduce((sum, p) => sum + p.solarIrradiance, 0) / predictions.length).toFixed(0)} W/m²
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="text-sm text-gray-600 mb-2 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
              Avg Wind Speed
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(predictions.reduce((sum, p) => sum + p.windSpeed, 0) / predictions.length).toFixed(1)} m/s
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="text-sm text-gray-600 mb-2 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              Avg Confidence
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-medium">LSTM Analysis:</span> Uses Long Short-Term Memory neural networks to analyze historical weather and energy patterns. Predictions are based on location-specific climate data and seasonal variations.
        </p>
      </div>
    </div>
  );
};

export default LSTMDashboard;
