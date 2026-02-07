/**
 * Statistics Engine
 * Tracks and reports simulation statistics
 */

import { HandRank } from '@/utils/handEvaluator';
import {
  SimulationStats,
  TubeType,
  TubeStats,
  TubeBalances,
  RoundResult,
  SimulationConfig,
  HTPerformance,
} from './types';

// ============================================================================
// Stats Initialization
// ============================================================================

export function createSimulationStats(config: SimulationConfig): SimulationStats {
  return {
    roundsCompleted: 0,
    totalRounds: config.roundsPerRun,
    
    totalPlayerInputs: 0,
    totalPlayerWins: 0,
    totalPlayerLosses: 0,
    totalPlayerBusts: 0,
    playerNetCredits: 0,
    
    totalHouseInputs: 0,
    houseNetProfit: 0,
    houseTakePercent: 0,
    playerReturnPercent: 0,
    
    tubeStats: {
      ST: { totalFunded: 0, totalTaken: 0, hitCount: 0, avgDepletionRate: 0 },
      FL: { totalFunded: 0, totalTaken: 0, hitCount: 0, avgDepletionRate: 0 },
      FH: { totalFunded: 0, totalTaken: 0, hitCount: 0, avgDepletionRate: 0 },
      SF: { totalFunded: 0, totalTaken: 0, hitCount: 0, avgDepletionRate: 0 },
      RF: { totalFunded: 0, totalTaken: 0, hitCount: 0, avgDepletionRate: 0 },
    },
    totalTubePayouts: 0,
    
    htPerformance: {},
    
    handDistribution: {
      'royal-flush': 0,
      'straight-flush': 0,
      'four-of-a-kind': 0,
      'full-house': 0,
      'flush': 0,
      'straight': 0,
      'three-of-a-kind': 0,
      'two-pair': 0,
      'pair': 0,
      'high-card': 0,
    },
    
    totalBusts: 0,
    bustsByReason: {},
    
    stackTriggerCount: 0,
    forcedRefills: 0,
  };
}

// ============================================================================
// Stats Updates
// ============================================================================

export function updateStatsFromRound(
  stats: SimulationStats,
  roundResult: RoundResult,
  config: SimulationConfig
): void {
  stats.roundsCompleted++;
  
  // Process player results
  for (const result of roundResult.participantResults) {
    stats.totalPlayerInputs += config.ante;
    
    switch (result.outcome) {
      case 'win':
        stats.totalPlayerWins++;
        stats.playerNetCredits += result.payout;
        break;
      case 'lose':
        stats.totalPlayerLosses++;
        stats.playerNetCredits += result.payout;
        break;
      case 'bust':
        stats.totalPlayerBusts++;
        stats.totalBusts++;
        stats.playerNetCredits -= result.bustPenalty;
        break;
    }
    
    // Track hand distribution
    if (result.handResult) {
      stats.handDistribution[result.handResult.rank]++;
    }
    
    // Track tube payouts
    if (result.tubePayout > 0) {
      stats.totalTubePayouts += result.tubePayout;
    }
    
    // Track HT performance
    if (result.htDecision) {
      const htId = result.htDecision.htId;
      if (!stats.htPerformance[htId]) {
        stats.htPerformance[htId] = {
          htId,
          timesUsed: 0,
          wins: 0,
          losses: 0,
          busts: 0,
          totalWagered: 0,
          totalWon: 0,
          tubeHits: { ST: 0, FL: 0, FH: 0, SF: 0, RF: 0 },
        };
      }
      
      const htStats = stats.htPerformance[htId];
      htStats.timesUsed++;
      htStats.totalWagered += config.ante;
      
      if (result.outcome === 'win') {
        htStats.wins++;
        htStats.totalWon += result.payout;
      } else if (result.outcome === 'lose') {
        htStats.losses++;
      } else if (result.outcome === 'bust') {
        htStats.busts++;
      }
    }
  }
  
  // Track tube payouts by type
  for (const [tubeType, amount] of Object.entries(roundResult.tubePayouts)) {
    if (amount > 0) {
      stats.tubeStats[tubeType as TubeType].totalTaken += amount;
      stats.tubeStats[tubeType as TubeType].hitCount++;
    }
  }
  
  // Track stack triggers
  stats.stackTriggerCount += roundResult.stackTriggers.length;
  
  // House stats
  stats.totalHouseInputs += roundResult.playPotCollected;
  stats.houseNetProfit = stats.totalPlayerInputs - stats.playerNetCredits - stats.totalTubePayouts;
  
  // Calculate percentages
  if (stats.totalPlayerInputs > 0) {
    stats.houseTakePercent = (stats.houseNetProfit / stats.totalPlayerInputs) * 100;
    stats.playerReturnPercent = 100 - stats.houseTakePercent;
  }
}

// ============================================================================
// Stats Reporting
// ============================================================================

export interface SimulationReport {
  summary: {
    roundsCompleted: number;
    totalRounds: number;
    completionPercent: number;
  };
  playerStats: {
    totalInputs: number;
    totalWins: number;
    totalLosses: number;
    totalBusts: number;
    winRate: number;
    netCredits: number;
    returnPercent: number;
  };
  houseStats: {
    totalInputs: number;
    netProfit: number;
    takePercent: number;
  };
  tubeStats: Array<{
    tubeType: TubeType;
    totalFunded: number;
    totalTaken: number;
    hitCount: number;
    returnRate: number;
  }>;
  topHT: Array<{
    htId: string;
    timesUsed: number;
    winRate: number;
    ev: number;
  }>;
  handDistribution: Array<{
    rank: HandRank;
    count: number;
    percentage: number;
  }>;
}

export function generateReport(stats: SimulationStats): SimulationReport {
  const totalHands = stats.totalPlayerWins + stats.totalPlayerLosses + stats.totalPlayerBusts;
  
  return {
    summary: {
      roundsCompleted: stats.roundsCompleted,
      totalRounds: stats.totalRounds,
      completionPercent: (stats.roundsCompleted / stats.totalRounds) * 100,
    },
    playerStats: {
      totalInputs: stats.totalPlayerInputs,
      totalWins: stats.totalPlayerWins,
      totalLosses: stats.totalPlayerLosses,
      totalBusts: stats.totalPlayerBusts,
      winRate: totalHands > 0 ? (stats.totalPlayerWins / totalHands) * 100 : 0,
      netCredits: stats.playerNetCredits,
      returnPercent: stats.playerReturnPercent,
    },
    houseStats: {
      totalInputs: stats.totalHouseInputs,
      netProfit: stats.houseNetProfit,
      takePercent: stats.houseTakePercent,
    },
    tubeStats: (['ST', 'FL', 'FH', 'SF', 'RF'] as TubeType[]).map(tubeType => ({
      tubeType,
      totalFunded: stats.tubeStats[tubeType].totalFunded,
      totalTaken: stats.tubeStats[tubeType].totalTaken,
      hitCount: stats.tubeStats[tubeType].hitCount,
      returnRate: stats.tubeStats[tubeType].totalFunded > 0
        ? (stats.tubeStats[tubeType].totalTaken / stats.tubeStats[tubeType].totalFunded) * 100
        : 0,
    })),
    topHT: Object.values(stats.htPerformance)
      .filter(ht => ht.timesUsed > 0)
      .map(ht => ({
        htId: ht.htId,
        timesUsed: ht.timesUsed,
        winRate: (ht.wins / ht.timesUsed) * 100,
        ev: ht.totalWagered > 0 ? ((ht.totalWon - ht.totalWagered) / ht.totalWagered) * 100 : 0,
      }))
      .sort((a, b) => b.timesUsed - a.timesUsed)
      .slice(0, 10),
    handDistribution: (Object.entries(stats.handDistribution) as [HandRank, number][])
      .map(([rank, count]) => ({
        rank,
        count,
        percentage: totalHands > 0 ? (count / totalHands) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count),
  };
}

// ============================================================================
// Logging
// ============================================================================

export function logRoundSummary(roundResult: RoundResult, verbose: boolean = false): void {
  if (!verbose) return;
  
  console.log(`\n=== Round ${roundResult.roundNumber} ===`);
  console.log(`Play Pot: ${roundResult.playPotCollected}`);
  console.log(`House Net: ${roundResult.houseNet}`);
  console.log(`Stack Triggers: ${roundResult.stackTriggers.join(', ') || 'None'}`);
  
  for (const result of roundResult.participantResults) {
    console.log(`  ${result.participantId}: ${result.handResult.name} - ${result.outcome} (${result.payout > 0 ? '+' : ''}${result.payout})`);
  }
}

export function logFinalReport(report: SimulationReport): void {
  console.log('\n========================================');
  console.log('       SIMULATION COMPLETE');
  console.log('========================================\n');
  
  console.log(`Rounds: ${report.summary.roundsCompleted}/${report.summary.totalRounds} (${report.summary.completionPercent.toFixed(1)}%)\n`);
  
  console.log('--- PLAYER STATS ---');
  console.log(`Total Inputs: ${report.playerStats.totalInputs}`);
  console.log(`Wins: ${report.playerStats.totalWins} (${report.playerStats.winRate.toFixed(2)}%)`);
  console.log(`Losses: ${report.playerStats.totalLosses}`);
  console.log(`Busts: ${report.playerStats.totalBusts}`);
  console.log(`Net Credits: ${report.playerStats.netCredits}`);
  console.log(`Return %: ${report.playerStats.returnPercent.toFixed(2)}%\n`);
  
  console.log('--- HOUSE STATS ---');
  console.log(`Net Profit: ${report.houseStats.netProfit}`);
  console.log(`Take %: ${report.houseStats.takePercent.toFixed(2)}%\n`);
  
  console.log('--- TUBE STATS ---');
  for (const tube of report.tubeStats) {
    console.log(`${tube.tubeType}: Funded=${tube.totalFunded}, Taken=${tube.totalTaken}, Hits=${tube.hitCount}`);
  }
  
  console.log('\n--- TOP HOLD TYPES ---');
  for (const ht of report.topHT.slice(0, 5)) {
    console.log(`${ht.htId}: Used=${ht.timesUsed}, Win%=${ht.winRate.toFixed(1)}, EV=${ht.ev.toFixed(2)}%`);
  }
  
  console.log('\n--- HAND DISTRIBUTION ---');
  for (const hand of report.handDistribution.slice(0, 5)) {
    console.log(`${hand.rank}: ${hand.count} (${hand.percentage.toFixed(2)}%)`);
  }
}
