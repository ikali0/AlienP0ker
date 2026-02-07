/**
 * Stack Draw Simulation Engine
 * 
 * A deterministic 5-card draw poker simulation with tube-based payouts.
 * 
 * Usage:
 * ```typescript
 * import { runSimulation, quickSimulation, generateReport } from '@/simulation';
 * 
 * // Quick simulation with default settings
 * const result = quickSimulation(20000, true);
 * 
 * // Custom simulation
 * const customResult = runSimulation({
 *   roundsPerRun: 50000,
 *   playerCount: 6,
 *   ante: 10,
 *   initSTTube: 10,
 *   initFLTube: 20,
 * });
 * 
 * // Generate report
 * const report = generateReport(customResult.stats);
 * console.log(report);
 * ```
 */

// Core Types
export type {
  SimulationConfig,
  SimulationResult,
  SimulationStats,
  RoundState,
  RoundResult,
  Participant,
  ParticipantRoundResult,
  TubeType,
  TubeBalances,
  TubeTransaction,
  TubeStats,
  HTDecision,
  HTCategory,
  HTPerformance,
} from './types';

export { DEFAULT_CONFIG, HAND_TO_TUBE, handRankToTubeType, tubeTypeToHandRank } from './types';

// Simulation Runner
export {
  runSimulation,
  quickSimulation,
  type SimulationCallbacks,
} from './simulationRunner';

// HT Engine
export {
  makeHTDecision,
  createHTPerformanceTracker,
  updateHTPerformance,
  getHTStats,
} from './htEngine';

// Tube Engine
export {
  initializeTubes,
  getTubeForHand,
  getTubeBalance,
  canPayFromTube,
  processWinPayout,
  refillTube,
  refillAllTubes,
  checkStackTriggers,
  processStackTriggers,
  createTubeStatsTracker,
  updateTubeStats,
  getTubeReport,
} from './tubeEngine';

// Resolution Engine
export {
  resolveRound,
  calculateBustPenalty,
  isDealerBust,
  type ResolutionResult,
} from './resolution';

// Stats Engine
export {
  createSimulationStats,
  updateStatsFromRound,
  generateReport,
  logFinalReport,
  type SimulationReport,
} from './statsEngine';
