/**
 * Stack Tube Engine
 * Manages tube balances, payouts, and refills for the simulation
 */

import { HandRank } from '@/utils/handEvaluator';
import {
  TubeType,
  TubeBalances,
  TubeTransaction,
  TubeStats,
  SimulationConfig,
  HAND_TO_TUBE,
} from './types';

// ============================================================================
// Tube Initialization
// ============================================================================

export function initializeTubes(config: SimulationConfig): TubeBalances {
  return {
    ST: config.initSTTube,
    FL: config.initFLTube,
    FH: config.initFHTube,
    SF: config.initSFTube,
    RF: config.initRFTube,
  };
}

// ============================================================================
// Tube Operations
// ============================================================================

export function getTubeForHand(handRank: HandRank): TubeType | null {
  return HAND_TO_TUBE[handRank] || null;
}

export function getTubeBalance(tubes: TubeBalances, tubeType: TubeType): number {
  return tubes[tubeType];
}

export function canPayFromTube(tubes: TubeBalances, tubeType: TubeType): boolean {
  return tubes[tubeType] > 0;
}

export interface TubePayoutResult {
  newBalances: TubeBalances;
  payout: number;
  transaction: TubeTransaction;
  isBust: boolean;
}

export function processWinPayout(
  tubes: TubeBalances,
  handRank: HandRank,
  participantId: string,
  config: SimulationConfig
): TubePayoutResult | null {
  const tubeType = getTubeForHand(handRank);
  
  // Non-tube paying hand - just a regular win
  if (!tubeType) {
    return null;
  }
  
  const currentBalance = tubes[tubeType];
  
  // Bust condition: tube is empty
  if (currentBalance <= 0) {
    return {
      newBalances: tubes,
      payout: 0,
      transaction: {
        tubeType,
        amount: 0,
        reason: 'payout',
        participantId,
      },
      isBust: true,
    };
  }
  
  // Pay from tube
  const payout = currentBalance;
  const newBalances: TubeBalances = {
    ...tubes,
    [tubeType]: 0,
  };
  
  return {
    newBalances,
    payout,
    transaction: {
      tubeType,
      amount: payout,
      reason: 'payout',
      participantId,
    },
    isBust: false,
  };
}

export function refillTube(
  tubes: TubeBalances,
  tubeType: TubeType,
  amount: number,
  participantId: string,
  reason: 'refill' | 'ante' | 'bust_penalty'
): { newBalances: TubeBalances; transaction: TubeTransaction } {
  const newBalances: TubeBalances = {
    ...tubes,
    [tubeType]: tubes[tubeType] + amount,
  };
  
  return {
    newBalances,
    transaction: {
      tubeType,
      amount,
      reason,
      participantId,
    },
  };
}

export function refillAllTubes(
  tubes: TubeBalances,
  amount: number,
  participantId: string
): { newBalances: TubeBalances; transactions: TubeTransaction[] } {
  const transactions: TubeTransaction[] = [];
  const newBalances: TubeBalances = { ...tubes };
  
  for (const tubeType of ['ST', 'FL', 'FH', 'SF', 'RF'] as TubeType[]) {
    newBalances[tubeType] += amount;
    transactions.push({
      tubeType,
      amount,
      reason: 'refill',
      participantId,
    });
  }
  
  return { newBalances, transactions };
}

// ============================================================================
// Stack Trigger System
// ============================================================================

export function checkStackTriggers(
  tubes: TubeBalances,
  threshold: number
): TubeType[] {
  const triggeredTubes: TubeType[] = [];
  
  for (const [tubeType, balance] of Object.entries(tubes) as [TubeType, number][]) {
    if (balance < threshold) {
      triggeredTubes.push(tubeType);
    }
  }
  
  return triggeredTubes;
}

export function processStackTriggers(
  tubes: TubeBalances,
  triggers: TubeType[],
  refillAmount: number,
  houseId: string
): { newBalances: TubeBalances; transactions: TubeTransaction[] } {
  let newBalances = { ...tubes };
  const transactions: TubeTransaction[] = [];
  
  for (const tubeType of triggers) {
    const result = refillTube(newBalances, tubeType, refillAmount, houseId, 'refill');
    newBalances = result.newBalances;
    transactions.push(result.transaction);
  }
  
  return { newBalances, transactions };
}

// ============================================================================
// Tube Statistics
// ============================================================================

export function createTubeStatsTracker(): Record<TubeType, TubeStats> {
  const tubeTypes: TubeType[] = ['ST', 'FL', 'FH', 'SF', 'RF'];
  const tracker: Record<string, TubeStats> = {};
  
  for (const tubeType of tubeTypes) {
    tracker[tubeType] = {
      totalFunded: 0,
      totalTaken: 0,
      hitCount: 0,
      avgDepletionRate: 0,
    };
  }
  
  return tracker as Record<TubeType, TubeStats>;
}

export function updateTubeStats(
  tracker: Record<TubeType, TubeStats>,
  transaction: TubeTransaction
): void {
  const stats = tracker[transaction.tubeType];
  
  if (transaction.reason === 'payout') {
    stats.totalTaken += transaction.amount;
    stats.hitCount++;
  } else {
    stats.totalFunded += transaction.amount;
  }
  
  // Update depletion rate
  if (stats.totalFunded > 0) {
    stats.avgDepletionRate = stats.totalTaken / stats.totalFunded;
  }
}

export function getTubeReport(
  tracker: Record<TubeType, TubeStats>,
  finalBalances: TubeBalances
): Array<{
  tubeType: TubeType;
  totalFunded: number;
  totalTaken: number;
  hitCount: number;
  finalBalance: number;
  returnRate: number;
}> {
  return (['ST', 'FL', 'FH', 'SF', 'RF'] as TubeType[]).map(tubeType => ({
    tubeType,
    totalFunded: tracker[tubeType].totalFunded,
    totalTaken: tracker[tubeType].totalTaken,
    hitCount: tracker[tubeType].hitCount,
    finalBalance: finalBalances[tubeType],
    returnRate: tracker[tubeType].totalFunded > 0 
      ? (tracker[tubeType].totalTaken / tracker[tubeType].totalFunded) * 100 
      : 0,
  }));
}
