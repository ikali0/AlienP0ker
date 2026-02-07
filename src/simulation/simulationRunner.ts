/**
 * Simulation Runner
 * Main loop for running the deterministic poker simulation
 */

import { Card, createDeck, shuffleDeck, dealCards } from '@/utils/deck';
import { evaluateHand } from '@/utils/handEvaluator';
import { makeHTDecision } from './htEngine';
import { initializeTubes, checkStackTriggers, processStackTriggers, refillAllTubes } from './tubeEngine';
import { resolveRound } from './resolution';
import { createSimulationStats, updateStatsFromRound, generateReport, logFinalReport } from './statsEngine';
import {
  SimulationConfig,
  DEFAULT_CONFIG,
  SimulationResult,
  SimulationStats,
  RoundState,
  RoundResult,
  Participant,
  TubeBalances,
  TubeType,
} from './types';

// ============================================================================
// Participant Management
// ============================================================================

function createParticipant(id: string, isDealer: boolean, startingCredits: number): Participant {
  return {
    id,
    isDealer,
    credits: startingCredits,
    currentHand: [],
    heldCards: [],
    finalHand: [],
    handResult: null,
    htDecision: null,
    isBusted: false,
  };
}

function resetParticipantForRound(participant: Participant): Participant {
  return {
    ...participant,
    currentHand: [],
    heldCards: [],
    finalHand: [],
    handResult: null,
    htDecision: null,
    isBusted: false,
  };
}

// ============================================================================
// Round Execution
// ============================================================================

function initializeRound(
  roundNumber: number,
  players: Participant[],
  dealer: Participant,
  tubes: TubeBalances
): RoundState {
  return {
    roundNumber,
    deck: shuffleDeck(createDeck()),
    participants: players.map(resetParticipantForRound),
    dealer: resetParticipantForRound(dealer),
    playPot: 0,
    tubeBalances: { ...tubes },
    tubeTransactions: [],
    phase: 'ante',
  };
}

function collectAntes(
  state: RoundState,
  config: SimulationConfig
): RoundState {
  let playPot = 0;
  const updatedParticipants = state.participants.map(p => {
    const ante = Math.min(config.ante, p.credits);
    playPot += ante;
    return { ...p, credits: p.credits - ante };
  });
  
  // Dealer also antes
  const dealerAnte = Math.min(config.ante, state.dealer.credits);
  playPot += dealerAnte;
  const updatedDealer = { ...state.dealer, credits: state.dealer.credits - dealerAnte };
  
  return {
    ...state,
    participants: updatedParticipants,
    dealer: updatedDealer,
    playPot,
    phase: 'deal',
  };
}

function dealHands(state: RoundState): RoundState {
  let remainingDeck = state.deck;
  
  // Deal to players
  const dealtParticipants = state.participants.map(p => {
    const { dealt, remaining } = dealCards(remainingDeck, 5);
    remainingDeck = remaining;
    return { ...p, currentHand: dealt };
  });
  
  // Deal to dealer
  const { dealt: dealerCards, remaining: finalDeck } = dealCards(remainingDeck, 5);
  const dealtDealer = { ...state.dealer, currentHand: dealerCards };
  
  return {
    ...state,
    deck: finalDeck,
    participants: dealtParticipants,
    dealer: dealtDealer,
    phase: 'hold',
  };
}

function applyHTDecisions(state: RoundState, config: SimulationConfig): RoundState {
  // Apply HT decisions to players
  const decidedParticipants = state.participants.map(p => {
    const decision = makeHTDecision(p.currentHand);
    return { ...p, htDecision: decision, heldCards: decision.cardsToHold };
  });
  
  // Apply HT decision to dealer if allowed
  let decidedDealer = state.dealer;
  if (config.dealerDrawAllowed) {
    const dealerDecision = makeHTDecision(state.dealer.currentHand);
    decidedDealer = { 
      ...state.dealer, 
      htDecision: dealerDecision, 
      heldCards: dealerDecision.cardsToHold 
    };
  } else {
    // Dealer holds all cards
    decidedDealer = { 
      ...state.dealer, 
      htDecision: null, 
      heldCards: [0, 1, 2, 3, 4] 
    };
  }
  
  return {
    ...state,
    participants: decidedParticipants,
    dealer: decidedDealer,
    phase: 'draw',
  };
}

function executeDraws(state: RoundState): RoundState {
  let remainingDeck = state.deck;
  
  // Execute draws for players
  const drawnParticipants = state.participants.map(p => {
    const heldCards = p.heldCards.map(i => p.currentHand[i]);
    const cardsNeeded = 5 - heldCards.length;
    
    if (cardsNeeded > 0) {
      const { dealt, remaining } = dealCards(remainingDeck, cardsNeeded);
      remainingDeck = remaining;
      return { ...p, finalHand: [...heldCards, ...dealt] };
    }
    
    return { ...p, finalHand: p.currentHand };
  });
  
  // Execute draw for dealer
  const dealerHeldCards = state.dealer.heldCards.map(i => state.dealer.currentHand[i]);
  const dealerCardsNeeded = 5 - dealerHeldCards.length;
  
  let drawnDealer: Participant;
  if (dealerCardsNeeded > 0) {
    const { dealt, remaining } = dealCards(remainingDeck, dealerCardsNeeded);
    remainingDeck = remaining;
    drawnDealer = { ...state.dealer, finalHand: [...dealerHeldCards, ...dealt] };
  } else {
    drawnDealer = { ...state.dealer, finalHand: state.dealer.currentHand };
  }
  
  return {
    ...state,
    deck: remainingDeck,
    participants: drawnParticipants,
    dealer: drawnDealer,
    phase: 'showdown',
  };
}

function executeRound(
  roundNumber: number,
  players: Participant[],
  dealer: Participant,
  tubes: TubeBalances,
  config: SimulationConfig
): { result: RoundResult; updatedTubes: TubeBalances; updatedPlayers: Participant[]; updatedDealer: Participant } {
  // Initialize round
  let state = initializeRound(roundNumber, players, dealer, tubes);
  
  // Collect antes
  state = collectAntes(state, config);
  
  // Deal hands
  state = dealHands(state);
  
  // Apply HT decisions
  state = applyHTDecisions(state, config);
  
  // Execute draws
  state = executeDraws(state);
  
  // Resolve outcomes
  const resolution = resolveRound(
    state.participants,
    state.dealer,
    state.tubeBalances,
    config
  );
  
  // Process stack triggers and refills
  let finalTubes = resolution.newTubeBalances;
  const triggers = checkStackTriggers(finalTubes, config.stackTriggerThreshold);
  
  if (triggers.length > 0 && config.houseRefillsOnDecline) {
    const refillResult = processStackTriggers(finalTubes, triggers, config.tubeRefillAmount, 'house');
    finalTubes = refillResult.newBalances;
  }
  
  // Player refills after taking
  if (config.playerRefillsTubesOnTake) {
    for (const playerResult of resolution.playerResults) {
      if (playerResult.tubePayout > 0) {
        const refillResult = refillAllTubes(finalTubes, config.tubeRefillAmount, playerResult.participantId);
        finalTubes = refillResult.newBalances;
      }
    }
  }
  
  // Update player credits
  const updatedPlayers = state.participants.map((p, i) => ({
    ...p,
    credits: p.credits + resolution.playerResults[i].payout,
  }));
  
  // Calculate house net
  const playerPayouts = resolution.playerResults.reduce((sum, r) => sum + r.payout, 0);
  const houseNet = state.playPot - playerPayouts - resolution.totalBustPenalties;
  
  const result: RoundResult = {
    roundNumber,
    participantResults: resolution.playerResults,
    dealerResult: resolution.dealerResult,
    playPotCollected: state.playPot,
    tubePayouts: resolution.tubePayouts,
    bustPenalties: resolution.totalBustPenalties,
    houseNet,
    tubeBalancesAfter: finalTubes,
    stackTriggers: resolution.stackTriggers,
  };
  
  return {
    result,
    updatedTubes: finalTubes,
    updatedPlayers,
    updatedDealer: state.dealer,
  };
}

// ============================================================================
// Main Simulation Runner
// ============================================================================

export interface SimulationCallbacks {
  onRoundComplete?: (roundNumber: number, result: RoundResult) => void;
  onProgress?: (completed: number, total: number) => void;
  onLog?: (message: string) => void;
}

export function runSimulation(
  config: Partial<SimulationConfig> = {},
  callbacks: SimulationCallbacks = {}
): SimulationResult {
  const startTime = performance.now();
  const fullConfig: SimulationConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Initialize
  const stats = createSimulationStats(fullConfig);
  let tubes = initializeTubes(fullConfig);
  const roundResults: RoundResult[] = [];
  
  // Create participants
  let players: Participant[] = [];
  for (let i = 0; i < fullConfig.playerCount; i++) {
    players.push(createParticipant(`Player_${i + 1}`, false, 1000));
  }
  let dealer = createParticipant('Dealer', true, 10000);
  
  // Initialize tube stats with initial funding
  stats.tubeStats.ST.totalFunded = fullConfig.initSTTube;
  stats.tubeStats.FL.totalFunded = fullConfig.initFLTube;
  stats.tubeStats.FH.totalFunded = fullConfig.initFHTube;
  stats.tubeStats.SF.totalFunded = fullConfig.initSFTube;
  stats.tubeStats.RF.totalFunded = fullConfig.initRFTube;
  
  callbacks.onLog?.(`Starting simulation with ${fullConfig.roundsPerRun} rounds...`);
  callbacks.onLog?.(`Players: ${fullConfig.playerCount}, Ante: ${fullConfig.ante}`);
  
  // Main simulation loop
  for (let round = 1; round <= fullConfig.roundsPerRun; round++) {
    const { result, updatedTubes, updatedPlayers, updatedDealer } = executeRound(
      round,
      players,
      dealer,
      tubes,
      fullConfig
    );
    
    tubes = updatedTubes;
    players = updatedPlayers;
    dealer = updatedDealer;
    
    updateStatsFromRound(stats, result, fullConfig);
    
    // Store round result (optionally limit stored results for memory)
    if (fullConfig.roundsPerRun <= 1000) {
      roundResults.push(result);
    }
    
    callbacks.onRoundComplete?.(round, result);
    
    // Progress callback every 1000 rounds
    if (round % 1000 === 0) {
      callbacks.onProgress?.(round, fullConfig.roundsPerRun);
      callbacks.onLog?.(`Completed ${round}/${fullConfig.roundsPerRun} rounds...`);
    }
  }
  
  const executionTime = performance.now() - startTime;
  
  callbacks.onLog?.(`Simulation complete in ${(executionTime / 1000).toFixed(2)}s`);
  
  return {
    config: fullConfig,
    stats,
    roundResults,
    finalTubeBalances: tubes,
    executionTimeMs: executionTime,
  };
}

// ============================================================================
// Quick Simulation Helper
// ============================================================================

export function quickSimulation(
  rounds: number = 10000,
  verbose: boolean = false
): SimulationResult {
  const result = runSimulation(
    { roundsPerRun: rounds },
    {
      onLog: verbose ? console.log : undefined,
    }
  );
  
  if (verbose) {
    const report = generateReport(result.stats);
    logFinalReport(report);
  }
  
  return result;
}

// ============================================================================
// Export Utilities
// ============================================================================

export { generateReport, logFinalReport } from './statsEngine';
export { makeHTDecision, getHTStats } from './htEngine';
export { initializeTubes, getTubeReport } from './tubeEngine';
