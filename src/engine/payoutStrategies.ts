/**
 * Payout Strategy Engine
 * Pluggable payout formulas for tube economy control
 */

import { PayoutStrategy, PayoutStrategyType } from './types';

// ============================================================================
// Strategy Implementations
// ============================================================================

/**
 * Fixed Strategy: Returns the full initial balance
 * Low volatility, predictable payouts
 */
export const fixedStrategy: PayoutStrategy = {
  type: 'fixed',
  calculate: (tube) => tube.initial,
};

/**
 * Percentage Strategy: Returns % of current balance
 * Drains tube proportionally, never fully empties
 */
export function createPercentageStrategy(percent: number = 0.25): PayoutStrategy {
  return {
    type: 'percentage',
    calculate: (tube) => Math.floor(tube.current * percent),
  };
}

/**
 * Logarithmic Strategy: Base + log(balance)
 * Smooth scaling, rewards larger tubes moderately
 */
export function createLogarithmicStrategy(base: number = 2): PayoutStrategy {
  return {
    type: 'logarithmic',
    calculate: (tube) => {
      if (tube.current <= 0) return 0;
      return Math.floor(base + Math.log(tube.current + 1) * 2);
    },
  };
}

/**
 * Progressive Strategy: Multiplier based on tube fullness
 * High volatility, big payouts when tubes are near max
 */
export function createProgressiveStrategy(threshold: number = 0.5): PayoutStrategy {
  return {
    type: 'progressive',
    calculate: (tube) => {
      const fillRatio = tube.current / tube.max;
      const multiplier = fillRatio > threshold ? 1 + (fillRatio - threshold) * 2 : 1;
      return Math.floor(tube.initial * multiplier);
    },
  };
}

// ============================================================================
// Strategy Factory
// ============================================================================

export function getPayoutStrategy(type: PayoutStrategyType): PayoutStrategy {
  switch (type) {
    case 'fixed':
      return fixedStrategy;
    case 'percentage':
      return createPercentageStrategy(0.25);
    case 'logarithmic':
      return createLogarithmicStrategy(2);
    case 'progressive':
      return createProgressiveStrategy(0.5);
    default:
      return fixedStrategy;
  }
}

// ============================================================================
// Payout Calculator
// ============================================================================

export interface TubePayoutResult {
  payout: number;
  newBalance: number;
  wasEmpty: boolean;
  triggersBust: boolean;
}

export function calculateTubePayout(
  tubeType: string,
  currentBalance: number,
  initialBalance: number,
  maxBalance: number,
  strategy: PayoutStrategy
): TubePayoutResult {
  if (currentBalance <= 0) {
    return {
      payout: 0,
      newBalance: 0,
      wasEmpty: true,
      triggersBust: true,
    };
  }
  
  const payout = strategy.calculate({
    current: currentBalance,
    initial: initialBalance,
    max: maxBalance,
  });
  
  const actualPayout = Math.min(payout, currentBalance);
  const newBalance = currentBalance - actualPayout;
  
  return {
    payout: actualPayout,
    newBalance,
    wasEmpty: false,
    triggersBust: false,
  };
}

// ============================================================================
// Volatility Analysis
// ============================================================================

export interface StrategyVolatilityProfile {
  type: PayoutStrategyType;
  avgPayout: number;
  variance: number;
  drainRate: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export function analyzeStrategyVolatility(
  strategy: PayoutStrategy,
  sampleSize: number = 1000
): StrategyVolatilityProfile {
  const payouts: number[] = [];
  
  // Simulate payouts at various tube levels
  for (let i = 0; i < sampleSize; i++) {
    const current = Math.floor(Math.random() * 50) + 1;
    const payout = strategy.calculate({
      current,
      initial: 10,
      max: 50,
    });
    payouts.push(payout);
  }
  
  const avg = payouts.reduce((a, b) => a + b, 0) / payouts.length;
  const variance = payouts.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / payouts.length;
  const drainRate = avg / 10; // Relative to initial
  
  let riskLevel: 'low' | 'medium' | 'high';
  if (variance < 5) riskLevel = 'low';
  else if (variance < 20) riskLevel = 'medium';
  else riskLevel = 'high';
  
  return {
    type: strategy.type,
    avgPayout: avg,
    variance,
    drainRate,
    riskLevel,
  };
}
