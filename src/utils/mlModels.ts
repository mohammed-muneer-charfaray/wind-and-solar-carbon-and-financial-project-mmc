import * as tf from '@tensorflow/tfjs';
import regression from 'regression';

// Electricity Price Prediction Model
export async function createPricePredictionModel(historicalPrices: number[]): Promise<tf.LayersModel> {
  const model = tf.sequential();
  
  model.add(tf.layers.dense({
    units: 32,
    inputShape: [5],
    activation: 'relu'
  }));
  
  model.add(tf.layers.dense({
    units: 16,
    activation: 'relu'
  }));
  
  model.add(tf.layers.dense({
    units: 1,
    activation: 'linear'
  }));
  
  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: 'meanSquaredError'
  });
  
  // Prepare training data
  const X = [];
  const y = [];
  
  for (let i = 5; i < historicalPrices.length; i++) {
    X.push(historicalPrices.slice(i - 5, i));
    y.push(historicalPrices[i]);
  }
  
  const xs = tf.tensor2d(X);
  const ys = tf.tensor2d(y, [y.length, 1]);
  
  // Train the model
  await model.fit(xs, ys, {
    epochs: 100,
    batchSize: 32
  });
  
  return model;
}

// Energy Generation Prediction
export function predictEnergyGeneration(
  systemSize: number,
  dailyHours: number,
  degradationRate: number
): number[] {
  const points = Array.from({ length: 25 }, (_, i) => [i + 1, systemSize * dailyHours * 365 * Math.pow(1 - degradationRate / 100, i)]);
  const result = regression.exponential(points);
  return points.map(p => p[1]);
}

// Cost Prediction Model
export function predictOperationalCosts(
  baselineCost: number,
  systemSize: number,
  years: number
): number[] {
  const inflationRate = 0.05; // 5% annual inflation
  const scaleFactor = Math.log(systemSize) / Math.log(10); // Logarithmic scaling based on system size
  
  return Array.from({ length: years }, (_, i) => {
    const inflatedCost = baselineCost * Math.pow(1 + inflationRate, i);
    return inflatedCost * (1 + scaleFactor * 0.1); // Adjust cost based on system size
  });
}

// Carbon Reduction Model
export function predictCarbonReduction(
  energyGeneration: number[],
  gridEmissionFactor: number
): number[] {
  const baselineEmissions = energyGeneration.map(energy => energy * gridEmissionFactor);
  const improvementRate = 0.02; // 2% annual improvement in grid emissions
  
  return baselineEmissions.map((emission, year) => {
    const adjustedFactor = gridEmissionFactor * Math.pow(1 - improvementRate, year);
    return energy * adjustedFactor;
  });
}