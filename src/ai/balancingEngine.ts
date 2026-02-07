/**
 * AI Balancing Engine
 * Auto-tunes game parameters to achieve target house edge
 * Runs ONLY between simulation cycles, never during live play
 */

import { EngineConfig, DEFAULT_ENGINE_CONFIG, TubeBalances } from '@/engine/types';
import { HTRegistry } from '@/engine/htRegistry';

// ============================================================================
// Optimization Objective Types
// ============================================================================

export interface OptimizationObjective {
  targetEdge: number;        // Target house edge (default 0.05 = 5%)
  edgeTolerance: number;     // Acceptable deviation (default 0.02)
  maxVolatility: number;     // Max acceptable volatility
  maxExploitEV: number;      // Max EV before HT is flagged
  weights: ObjectiveWeights;
}

export interface ObjectiveWeights {
  edgeDeviation: number;     // Weight for edge distance from target
  volatility: number;        // Weight for volatility penalty
  tubeDrain: number;         // Weight for tube drain rate
  exploitRisk: number;       // Weight for exploit potential
}

export const DEFAULT_OBJECTIVE: OptimizationObjective = {
  targetEdge: 0.05,
  edgeTolerance: 0.02,
  maxVolatility: 25,
  maxExploitEV: 0.02,
  weights: {
    edgeDeviation: 1.0,
    volatility: 0.5,
    tubeDrain: 0.3,
    exploitRisk: 0.8,
  },
};

// ============================================================================
// Simulation Metrics
// ============================================================================

export interface SimulationMetrics {
  houseEdge: number;
  volatilityIndex: number;
  tubeDrainRates: Record<keyof TubeBalances, number>;
  exploitableHTs: Array<{ htId: string; ev: number }>;
  playerReturnRate: number;
  bustRate: number;
  avgRoundDelta: number;
}

// ============================================================================
// Optimization Result
// ============================================================================

export interface OptimizationResult {
  score: number;                    // Lower is better
  isOptimal: boolean;
  metrics: SimulationMetrics;
  recommendedConfig: Partial<EngineConfig>;
  issues: OptimizationIssue[];
  iterations: number;
}

export interface OptimizationIssue {
  type: 'low_edge' | 'high_edge' | 'high_volatility' | 'exploit_detected' | 'tube_unstable';
  severity: 'warning' | 'critical';
  message: string;
  recommendation: string;
}

// ============================================================================
// AI Optimizer Class
// ============================================================================

export class AIBalancingEngine {
  private objective: OptimizationObjective;
  private learningRate: number = 0.1;
  private maxIterations: number = 100;
  
  constructor(objective: Partial<OptimizationObjective> = {}) {
    this.objective = { ...DEFAULT_OBJECTIVE, ...objective };
  }
  
  /**
   * Calculate optimization score (lower is better)
   */
  calculateScore(metrics: SimulationMetrics): number {
    const { weights, targetEdge, maxVolatility, maxExploitEV } = this.objective;
    
    // Edge deviation penalty
    const edgeDev = Math.abs(metrics.houseEdge - targetEdge);
    const edgePenalty = edgeDev * weights.edgeDeviation;
    
    // Volatility penalty
    const volPenalty = metrics.volatilityIndex > maxVolatility 
      ? (metrics.volatilityIndex - maxVolatility) * weights.volatility 
      : 0;
    
    // Tube drain penalty (average drain rate)
    const avgDrain = Object.values(metrics.tubeDrainRates).reduce((a, b) => a + b, 0) / 5;
    const drainPenalty = avgDrain > 0.3 ? (avgDrain - 0.3) * weights.tubeDrain : 0;
    
    // Exploit risk penalty
    const exploitPenalty = metrics.exploitableHTs.reduce((sum, ht) => {
      return sum + (ht.ev > maxExploitEV ? ht.ev * weights.exploitRisk : 0);
    }, 0);
    
    return edgePenalty + volPenalty + drainPenalty + exploitPenalty;
  }
  
  /**
   * Identify issues in current configuration
   */
  identifyIssues(metrics: SimulationMetrics): OptimizationIssue[] {
    const issues: OptimizationIssue[] = [];
    const { targetEdge, edgeTolerance, maxVolatility, maxExploitEV } = this.objective;
    
    // Check house edge
    if (metrics.houseEdge < targetEdge - edgeTolerance) {
      issues.push({
        type: 'low_edge',
        severity: metrics.houseEdge < 0.02 ? 'critical' : 'warning',
        message: `House edge ${(metrics.houseEdge * 100).toFixed(2)}% is below target`,
        recommendation: 'Increase bust penalty or reduce tube payouts',
      });
    } else if (metrics.houseEdge > targetEdge + edgeTolerance) {
      issues.push({
        type: 'high_edge',
        severity: metrics.houseEdge > 0.10 ? 'critical' : 'warning',
        message: `House edge ${(metrics.houseEdge * 100).toFixed(2)}% is above target`,
        recommendation: 'Reduce bust penalty or increase tube payouts',
      });
    }
    
    // Check volatility
    if (metrics.volatilityIndex > maxVolatility) {
      issues.push({
        type: 'high_volatility',
        severity: metrics.volatilityIndex > maxVolatility * 1.5 ? 'critical' : 'warning',
        message: `Volatility index ${metrics.volatilityIndex.toFixed(2)} exceeds maximum`,
        recommendation: 'Switch to percentage or logarithmic payout strategy',
      });
    }
    
    // Check exploits
    for (const ht of metrics.exploitableHTs) {
      if (ht.ev > maxExploitEV) {
        issues.push({
          type: 'exploit_detected',
          severity: ht.ev > maxExploitEV * 2 ? 'critical' : 'warning',
          message: `${ht.htId} has exploitable EV of ${(ht.ev * 100).toFixed(2)}%`,
          recommendation: `Disable or adjust ${ht.htId} hold logic`,
        });
      }
    }
    
    // Check tube stability
    for (const [tube, drainRate] of Object.entries(metrics.tubeDrainRates)) {
      if (drainRate > 0.4) {
        issues.push({
          type: 'tube_unstable',
          severity: drainRate > 0.6 ? 'critical' : 'warning',
          message: `${tube} tube has ${(drainRate * 100).toFixed(0)}% drain rate`,
          recommendation: `Increase ${tube} initial balance or reduce payout`,
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Generate recommended configuration adjustments
   */
  generateRecommendations(
    currentConfig: EngineConfig,
    metrics: SimulationMetrics
  ): Partial<EngineConfig> {
    const { targetEdge } = this.objective;
    const recommendations: Partial<EngineConfig> = {};
    
    const edgeGap = targetEdge - metrics.houseEdge;
    
    // Adjust bust penalty
    if (Math.abs(edgeGap) > 0.01) {
      const adjustment = 1 + (edgeGap * this.learningRate * 10);
      recommendations.bustPenaltyMultiplier = Math.max(
        0.5,
        Math.min(2.0, currentConfig.bustPenaltyMultiplier * adjustment)
      );
    }
    
    // Adjust tube initial values if drain rate is high
    const avgDrain = Object.values(metrics.tubeDrainRates).reduce((a, b) => a + b, 0) / 5;
    if (avgDrain > 0.3) {
      recommendations.tubes = { ...currentConfig.tubes };
      (Object.keys(currentConfig.tubes) as Array<keyof typeof currentConfig.tubes>).forEach(tube => {
        const drainRate = metrics.tubeDrainRates[tube];
        if (drainRate > 0.3) {
          const current = currentConfig.tubes[tube];
          recommendations.tubes![tube] = {
            ...current,
            initial: Math.floor(current.initial * (1 + drainRate * 0.5)),
          };
        }
      });
    }
    
    // Adjust refill amount if tubes are unstable
    if (avgDrain > 0.4) {
      recommendations.refillAmount = Math.min(
        5,
        currentConfig.refillAmount + 1
      );
    }
    
    return recommendations;
  }
  
  /**
   * Disable exploitable HTs
   */
  mitigateExploits(exploits: Array<{ htId: string; ev: number }>): void {
    for (const exploit of exploits) {
      if (exploit.ev > this.objective.maxExploitEV * 2) {
        // Disable critical exploits
        HTRegistry.setEnabled(exploit.htId, false);
        console.warn(`[AI] Disabled exploitable HT: ${exploit.htId} (EV: ${exploit.ev})`);
      }
    }
  }
  
  /**
   * Run optimization loop
   */
  optimize(
    currentConfig: EngineConfig,
    simulationFn: (config: EngineConfig, rounds: number) => SimulationMetrics
  ): OptimizationResult {
    let bestScore = Infinity;
    let bestConfig = { ...currentConfig };
    let bestMetrics: SimulationMetrics | null = null;
    let iterations = 0;
    
    let config = { ...currentConfig };
    
    for (let i = 0; i < this.maxIterations; i++) {
      iterations++;
      
      // Run simulation
      const metrics = simulationFn(config, 20000);
      const score = this.calculateScore(metrics);
      
      // Track best
      if (score < bestScore) {
        bestScore = score;
        bestConfig = { ...config };
        bestMetrics = metrics;
      }
      
      // Check if optimal
      if (this.isOptimal(metrics)) {
        break;
      }
      
      // Generate adjustments
      const adjustments = this.generateRecommendations(config, metrics);
      config = { ...config, ...adjustments };
      
      // Mitigate exploits
      this.mitigateExploits(metrics.exploitableHTs);
    }
    
    const finalMetrics = bestMetrics || simulationFn(bestConfig, 20000);
    const issues = this.identifyIssues(finalMetrics);
    
    return {
      score: bestScore,
      isOptimal: this.isOptimal(finalMetrics),
      metrics: finalMetrics,
      recommendedConfig: bestConfig,
      issues,
      iterations,
    };
  }
  
  /**
   * Check if metrics are within optimal range
   */
  isOptimal(metrics: SimulationMetrics): boolean {
    const { targetEdge, edgeTolerance, maxVolatility, maxExploitEV } = this.objective;
    
    const edgeOk = Math.abs(metrics.houseEdge - targetEdge) <= edgeTolerance;
    const volOk = metrics.volatilityIndex <= maxVolatility;
    const exploitOk = metrics.exploitableHTs.every(ht => ht.ev <= maxExploitEV);
    
    return edgeOk && volOk && exploitOk;
  }
}

// ============================================================================
// Monte Carlo Engine
// ============================================================================

export interface MonteCarloResult {
  runs: number;
  meanEdge: number;
  edgeVariance: number;
  edgeStdDev: number;
  worstCase: number;
  bestCase: number;
  confidenceInterval: [number, number];
  isStable: boolean;
}

export function runMonteCarlo(
  simulationFn: (config: EngineConfig, rounds: number) => SimulationMetrics,
  config: EngineConfig,
  runs: number = 100,
  roundsPerRun: number = 20000
): MonteCarloResult {
  const edges: number[] = [];
  
  for (let i = 0; i < runs; i++) {
    const metrics = simulationFn(config, roundsPerRun);
    edges.push(metrics.houseEdge);
  }
  
  const meanEdge = edges.reduce((a, b) => a + b, 0) / edges.length;
  const variance = edges.reduce((sum, e) => sum + Math.pow(e - meanEdge, 2), 0) / edges.length;
  const stdDev = Math.sqrt(variance);
  
  const sorted = [...edges].sort((a, b) => a - b);
  const worstCase = sorted[0];
  const bestCase = sorted[sorted.length - 1];
  
  // 95% confidence interval
  const z = 1.96;
  const margin = z * (stdDev / Math.sqrt(runs));
  const confidenceInterval: [number, number] = [meanEdge - margin, meanEdge + margin];
  
  // Stable if std dev is < 1%
  const isStable = stdDev < 0.01;
  
  return {
    runs,
    meanEdge,
    edgeVariance: variance,
    edgeStdDev: stdDev,
    worstCase,
    bestCase,
    confidenceInterval,
    isStable,
  };
}

// ============================================================================
// Factory
// ============================================================================

export function createAIBalancer(objective?: Partial<OptimizationObjective>): AIBalancingEngine {
  return new AIBalancingEngine(objective);
}
