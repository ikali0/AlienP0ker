/**
 * House Ledger
 * Tracks all economic flows for the house/casino
 */

import type { HouseLedger, ParticipantOutcome, TubePayoutRecord, BustPenaltyRecord } from './types';

// Re-export for consumers
export type { HouseLedger } from './types';

// ============================================================================
// Ledger Management
// ============================================================================

export function createHouseLedger(): HouseLedger {
  return {
    totalAnteCollected: 0,
    totalPayoutsGiven: 0,
    totalBustPenaltiesCollected: 0,
    totalTubePayouts: 0,
    netProfit: 0,
    roundsPlayed: 0,
    anteHistory: [],
    payoutHistory: [],
    bustHistory: [],
  };
}

export function recordAnteCollection(
  ledger: HouseLedger,
  amount: number
): HouseLedger {
  const newLedger = {
    ...ledger,
    totalAnteCollected: ledger.totalAnteCollected + amount,
    anteHistory: [...ledger.anteHistory, amount],
  };
  return updateNetProfit(newLedger);
}

export function recordPayout(
  ledger: HouseLedger,
  amount: number
): HouseLedger {
  const newLedger = {
    ...ledger,
    totalPayoutsGiven: ledger.totalPayoutsGiven + amount,
    payoutHistory: [...ledger.payoutHistory, amount],
  };
  return updateNetProfit(newLedger);
}

export function recordTubePayout(
  ledger: HouseLedger,
  amount: number
): HouseLedger {
  const newLedger = {
    ...ledger,
    totalTubePayouts: ledger.totalTubePayouts + amount,
    totalPayoutsGiven: ledger.totalPayoutsGiven + amount,
    payoutHistory: [...ledger.payoutHistory, amount],
  };
  return updateNetProfit(newLedger);
}

export function recordBustPenalty(
  ledger: HouseLedger,
  amount: number
): HouseLedger {
  const newLedger = {
    ...ledger,
    totalBustPenaltiesCollected: ledger.totalBustPenaltiesCollected + amount,
    bustHistory: [...ledger.bustHistory, amount],
  };
  return updateNetProfit(newLedger);
}

export function recordRoundComplete(ledger: HouseLedger): HouseLedger {
  return {
    ...ledger,
    roundsPlayed: ledger.roundsPlayed + 1,
  };
}

function updateNetProfit(ledger: HouseLedger): HouseLedger {
  return {
    ...ledger,
    netProfit: ledger.totalAnteCollected + ledger.totalBustPenaltiesCollected - ledger.totalPayoutsGiven,
  };
}

// ============================================================================
// Round Processing
// ============================================================================

export function processRoundOutcomes(
  ledger: HouseLedger,
  outcomes: ParticipantOutcome[],
  tubePayouts: TubePayoutRecord[],
  bustPenalties: BustPenaltyRecord[],
  anteCollected: number
): HouseLedger {
  let updatedLedger = recordAnteCollection(ledger, anteCollected);
  
  // Process tube payouts
  for (const tubePayout of tubePayouts) {
    updatedLedger = recordTubePayout(updatedLedger, tubePayout.amount);
  }
  
  // Process bust penalties
  for (const bust of bustPenalties) {
    updatedLedger = recordBustPenalty(updatedLedger, bust.amount);
  }
  
  // Process regular payouts (non-tube wins)
  for (const outcome of outcomes) {
    if (outcome.outcome === 'win' && outcome.payout > 0) {
      updatedLedger = recordPayout(updatedLedger, outcome.payout);
    }
  }
  
  return recordRoundComplete(updatedLedger);
}

// ============================================================================
// Analytics
// ============================================================================

export interface LedgerAnalytics {
  houseEdge: number;
  houseEdgePercent: number;
  avgAntePerRound: number;
  avgPayoutPerRound: number;
  bustRate: number;
  profitPerRound: number;
  isHealthy: boolean;
  healthStatus: 'low_edge' | 'optimal' | 'high_edge';
}

export function analyzeLedger(ledger: HouseLedger): LedgerAnalytics {
  const rounds = ledger.roundsPlayed || 1;
  
  const totalInput = ledger.totalAnteCollected + ledger.totalBustPenaltiesCollected;
  const houseEdge = totalInput > 0 
    ? (totalInput - ledger.totalPayoutsGiven) / totalInput 
    : 0;
  
  const avgAnte = ledger.totalAnteCollected / rounds;
  const avgPayout = ledger.totalPayoutsGiven / rounds;
  const bustRate = ledger.bustHistory.length / rounds;
  const profitPerRound = ledger.netProfit / rounds;
  
  let healthStatus: 'low_edge' | 'optimal' | 'high_edge';
  if (houseEdge < 0.03) healthStatus = 'low_edge';
  else if (houseEdge > 0.07) healthStatus = 'high_edge';
  else healthStatus = 'optimal';
  
  return {
    houseEdge,
    houseEdgePercent: houseEdge * 100,
    avgAntePerRound: avgAnte,
    avgPayoutPerRound: avgPayout,
    bustRate,
    profitPerRound,
    isHealthy: healthStatus === 'optimal',
    healthStatus,
  };
}

export function getLedgerSummary(ledger: HouseLedger): string {
  const analytics = analyzeLedger(ledger);
  
  return `
╔═══════════════════════════════════════════════════════════╗
║                    HOUSE LEDGER SUMMARY                    ║
╠═══════════════════════════════════════════════════════════╣
║  Rounds Played:        ${ledger.roundsPlayed.toString().padStart(8)}                     ║
║  Total Ante:           ${ledger.totalAnteCollected.toString().padStart(8)} credits              ║
║  Total Payouts:        ${ledger.totalPayoutsGiven.toString().padStart(8)} credits              ║
║  Bust Penalties:       ${ledger.totalBustPenaltiesCollected.toString().padStart(8)} credits              ║
║  Net Profit:           ${ledger.netProfit.toString().padStart(8)} credits              ║
╠═══════════════════════════════════════════════════════════╣
║  House Edge:           ${analytics.houseEdgePercent.toFixed(2).padStart(7)}%                      ║
║  Status:               ${analytics.healthStatus.padStart(10)}                  ║
╚═══════════════════════════════════════════════════════════╝
  `.trim();
}
