/**
 * Game Orchestrator
 * Central coordination layer for game flow
 * Connects UI to deterministic engine
 */

import { Card, createDeck, shuffleDeck, dealCards } from '@/utils/deck';
import { evaluateHand, compareHands, HandResult } from '@/utils/handEvaluator';
import { HTRegistry } from '@/engine/htRegistry';
import { getPayoutStrategy, calculateTubePayout } from '@/engine/payoutStrategies';
import { createHouseLedger, processRoundOutcomes, analyzeLedger, HouseLedger } from '@/engine/houseLedger';
import {
  EngineConfig,
  DEFAULT_ENGINE_CONFIG,
  Participant,
  RoundState,
  RoundPhase,
  TubeBalances,
  ParticipantOutcome,
  TubePayoutRecord,
  BustPenaltyRecord,
  EngineEvent,
  EngineEventCallback,
} from '@/engine/types';

// ============================================================================
// Game State
// ============================================================================

export interface GameOrchestratorState {
  config: EngineConfig;
  currentRound: RoundState | null;
  houseLedger: HouseLedger;
  isRunning: boolean;
  isPaused: boolean;
  roundHistory: RoundState[];
}

// ============================================================================
// Orchestrator Class
// ============================================================================

export class GameOrchestrator {
  private state: GameOrchestratorState;
  private eventListeners: EngineEventCallback[] = [];
  private roundNumber: number = 0;
  
  constructor(config: Partial<EngineConfig> = {}) {
    this.state = {
      config: { ...DEFAULT_ENGINE_CONFIG, ...config },
      currentRound: null,
      houseLedger: createHouseLedger(),
      isRunning: false,
      isPaused: false,
      roundHistory: [],
    };
  }
  
  // =========================================================================
  // Event System
  // =========================================================================
  
  addEventListener(callback: EngineEventCallback): () => void {
    this.eventListeners.push(callback);
    return () => {
      this.eventListeners = this.eventListeners.filter(cb => cb !== callback);
    };
  }
  
  private emit(type: EngineEvent['type'], data: Record<string, unknown> = {}): void {
    const event: EngineEvent = {
      type,
      roundNumber: this.roundNumber,
      timestamp: Date.now(),
      data,
    };
    this.eventListeners.forEach(cb => cb(event));
  }
  
  // =========================================================================
  // Configuration
  // =========================================================================
  
  updateConfig(config: Partial<EngineConfig>): void {
    this.state.config = { ...this.state.config, ...config };
  }
  
  getConfig(): EngineConfig {
    return { ...this.state.config };
  }
  
  // =========================================================================
  // Round Execution
  // =========================================================================
  
  /**
   * Start a new round
   */
  startRound(): RoundState {
    this.roundNumber++;
    this.state.isRunning = true;
    
    const { config } = this.state;
    
    // Initialize tube balances
    const tubeBalances: TubeBalances = {
      ST: config.tubes.ST.initial,
      FL: config.tubes.FL.initial,
      FH: config.tubes.FH.initial,
      SF: config.tubes.SF.initial,
      RF: config.tubes.RF.initial,
    };
    
    // Create participants
    const participants = this.createParticipants(config.playerCount);
    const dealer = this.createDealer();
    
    const round: RoundState = {
      roundNumber: this.roundNumber,
      phase: 'waiting',
      deck: [],
      cardsDealt: 0,
      participants,
      dealer,
      playPot: 0,
      anteCollected: 0,
      tubeBalances,
      outcomes: [],
      tubePayouts: [],
      bustPenalties: [],
      stackTriggers: [],
    };
    
    this.state.currentRound = round;
    this.emit('round_start', { roundNumber: this.roundNumber });
    
    return round;
  }
  
  /**
   * Execute ante phase
   */
  collectAntes(): RoundState {
    const round = this.requireRound();
    const { config } = this.state;
    
    round.phase = 'ante';
    
    // Collect from all participants including dealer
    const antePerPlayer = config.ante;
    const totalAnte = antePerPlayer * (round.participants.length + 1);
    
    round.participants.forEach(p => {
      p.credits -= antePerPlayer;
    });
    round.dealer.credits -= antePerPlayer;
    
    round.playPot = totalAnte;
    round.anteCollected = totalAnte;
    
    this.emit('ante_collected', { total: totalAnte });
    
    return round;
  }
  
  /**
   * Shuffle and deal cards
   */
  dealCards(): RoundState {
    const round = this.requireRound();
    
    round.phase = 'deal';
    
    // Shuffle deck
    let deck = shuffleDeck(createDeck());
    
    // Deal to each participant
    round.participants.forEach(p => {
      const { dealt, remaining } = dealCards(deck, 5);
      p.currentHand = dealt;
      deck = remaining;
    });
    
    // Deal to dealer
    const { dealt: dealerCards, remaining: finalDeck } = dealCards(deck, 5);
    round.dealer.currentHand = dealerCards;
    round.deck = finalDeck;
    round.cardsDealt = (round.participants.length + 1) * 5;
    
    this.emit('cards_dealt', { 
      participantCount: round.participants.length + 1,
      cardsDealt: round.cardsDealt,
    });
    
    return round;
  }
  
  /**
   * Apply HT decisions for all participants
   */
  applyHTDecisions(): RoundState {
    const round = this.requireRound();
    
    round.phase = 'hold';
    
    // Apply HT for each participant
    const allParticipants = [...round.participants, round.dealer];
    
    allParticipants.forEach(p => {
      if (!p.isActive) return;
      
      const decision = HTRegistry.decide(p.currentHand);
      p.htDecision = decision;
      p.heldCardIndices = decision.cardsToHold;
    });
    
    this.emit('ht_decided', {
      decisions: allParticipants.map(p => ({
        id: p.id,
        htId: p.htDecision?.htId,
      })),
    });
    
    return round;
  }
  
  /**
   * Execute draw phase
   */
  executeDraw(): RoundState {
    const round = this.requireRound();
    
    round.phase = 'draw';
    
    let deck = [...round.deck];
    
    const allParticipants = [...round.participants, round.dealer];
    
    allParticipants.forEach(p => {
      if (!p.isActive) return;
      
      const heldSet = new Set(p.heldCardIndices);
      const newHand: Card[] = [];
      
      for (let i = 0; i < 5; i++) {
        if (heldSet.has(i)) {
          newHand.push(p.currentHand[i]);
        } else {
          const [drawn, ...rest] = deck;
          newHand.push(drawn);
          deck = rest;
        }
      }
      
      p.finalHand = newHand;
    });
    
    round.deck = deck;
    
    this.emit('cards_drawn', {
      participants: allParticipants.map(p => ({
        id: p.id,
        cardsDrawn: 5 - p.heldCardIndices.length,
      })),
    });
    
    return round;
  }
  
  /**
   * Evaluate all hands
   */
  evaluateHands(): RoundState {
    const round = this.requireRound();
    
    round.phase = 'evaluate';
    
    const allParticipants = [...round.participants, round.dealer];
    
    allParticipants.forEach(p => {
      if (!p.isActive || p.finalHand.length !== 5) return;
      p.handResult = evaluateHand(p.finalHand);
    });
    
    this.emit('hands_evaluated', {
      hands: allParticipants.map(p => ({
        id: p.id,
        rank: p.handResult?.rank,
        name: p.handResult?.name,
      })),
    });
    
    return round;
  }
  
  /**
   * Resolve outcomes vs dealer
   */
  resolveOutcomes(): RoundState {
    const round = this.requireRound();
    const { config } = this.state;
    
    round.phase = 'showdown';
    
    const dealerResult = round.dealer.handResult;
    if (!dealerResult) {
      throw new Error('Dealer hand not evaluated');
    }
    
    round.participants.forEach(p => {
      if (!p.isActive || !p.handResult) return;
      
      const comparison = compareHands(p.handResult, dealerResult);
      
      let outcome: ParticipantOutcome['outcome'];
      let payout = 0;
      let tubePayout = 0;
      let bustPenalty = 0;
      
      if (comparison > 0) {
        // Player wins
        const tubeType = this.handRankToTube(p.handResult.rank);
        
        if (tubeType) {
          // Check tube payout
          const tubeConfig = config.tubes[tubeType];
          const currentBalance = round.tubeBalances[tubeType];
          const strategy = getPayoutStrategy(config.payoutStrategy);
          
          const result = calculateTubePayout(
            tubeType,
            currentBalance,
            tubeConfig.initial,
            tubeConfig.max,
            strategy
          );
          
          if (result.triggersBust) {
            outcome = 'bust';
            bustPenalty = config.ante * config.bustPenaltyMultiplier;
            p.isBusted = true;
            
            round.bustPenalties.push({
              participantId: p.id,
              amount: bustPenalty,
              reason: `${tubeType} tube empty`,
              timestamp: Date.now(),
            });
            
            this.emit('bust_triggered', { participantId: p.id, tubeType });
          } else {
            outcome = 'win';
            tubePayout = result.payout;
            round.tubeBalances[tubeType] = result.newBalance;
            
            round.tubePayouts.push({
              tubeType,
              amount: tubePayout,
              participantId: p.id,
              timestamp: Date.now(),
            });
            
            this.emit('tube_drained', { tubeType, amount: tubePayout });
          }
        } else {
          // Won with non-tube hand
          outcome = 'win';
          payout = config.ante;
        }
      } else if (comparison < 0) {
        outcome = 'lose';
      } else {
        outcome = config.dealerWinsOnTie ? 'lose' : 'tie';
        if (outcome === 'tie') {
          payout = config.ante; // Return ante on tie
        }
      }
      
      // Apply credits
      p.credits += payout + tubePayout;
      
      round.outcomes.push({
        participantId: p.id,
        outcome,
        handRank: p.handResult.rank,
        payout,
        tubePayout,
        bustPenalty,
      });
      
      // Record HT stats
      HTRegistry.recordOutcome(
        p.htDecision?.htId || 'H0.DRAW5',
        outcome === 'tie' ? 'win' : outcome,
        config.ante,
        payout + tubePayout,
        this.handRankToTube(p.handResult.rank) || undefined
      );
    });
    
    this.emit('showdown', { outcomes: round.outcomes });
    
    return round;
  }
  
  /**
   * Process payouts and complete round
   */
  completeRound(): RoundState {
    const round = this.requireRound();
    const { config } = this.state;
    
    round.phase = 'payout';
    
    // Refill tubes
    if (config.playerRefillsOnWin || config.houseRefillsOnEmpty) {
      (Object.keys(round.tubeBalances) as Array<keyof TubeBalances>).forEach(tube => {
        const tubeConfig = config.tubes[tube];
        const current = round.tubeBalances[tube];
        
        if (current < tubeConfig.max) {
          round.tubeBalances[tube] = Math.min(
            current + config.refillAmount,
            tubeConfig.max
          );
          
          this.emit('tube_refilled', { tube, amount: config.refillAmount });
        }
        
        // Check stack triggers
        if (current <= config.autoRefillThreshold) {
          round.stackTriggers.push(tube);
          this.emit('stack_trigger', { tube });
        }
      });
    }
    
    // Update house ledger
    this.state.houseLedger = processRoundOutcomes(
      this.state.houseLedger,
      round.outcomes,
      round.tubePayouts,
      round.bustPenalties,
      round.anteCollected
    );
    
    round.phase = 'complete';
    this.state.isRunning = false;
    
    // Store in history
    this.state.roundHistory.push({ ...round });
    
    this.emit('round_complete', {
      roundNumber: this.roundNumber,
      houseLedger: analyzeLedger(this.state.houseLedger),
    });
    
    return round;
  }
  
  /**
   * Execute full round (all phases)
   */
  executeFullRound(): RoundState {
    this.startRound();
    this.collectAntes();
    this.dealCards();
    this.applyHTDecisions();
    this.executeDraw();
    this.evaluateHands();
    this.resolveOutcomes();
    return this.completeRound();
  }
  
  // =========================================================================
  // State Access
  // =========================================================================
  
  getState(): GameOrchestratorState {
    return { ...this.state };
  }
  
  getCurrentRound(): RoundState | null {
    return this.state.currentRound;
  }
  
  getHouseLedger(): HouseLedger {
    return { ...this.state.houseLedger };
  }
  
  getRoundHistory(): RoundState[] {
    return [...this.state.roundHistory];
  }
  
  // =========================================================================
  // Helpers
  // =========================================================================
  
  private requireRound(): RoundState {
    if (!this.state.currentRound) {
      throw new Error('No active round');
    }
    return this.state.currentRound;
  }
  
  private createParticipants(count: number): Participant[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `player_${i + 1}`,
      name: `Player ${i + 1}`,
      isDealer: false,
      credits: 1000,
      seatPosition: i + 1,
      currentHand: [],
      heldCardIndices: [],
      finalHand: [],
      handResult: null,
      htDecision: null,
      isBusted: false,
      isActive: true,
    }));
  }
  
  private createDealer(): Participant {
    return {
      id: 'dealer',
      name: 'Dealer',
      isDealer: true,
      credits: 10000,
      seatPosition: 0,
      currentHand: [],
      heldCardIndices: [],
      finalHand: [],
      handResult: null,
      htDecision: null,
      isBusted: false,
      isActive: true,
    };
  }
  
  private handRankToTube(rank: string): keyof TubeBalances | null {
    const mapping: Record<string, keyof TubeBalances> = {
      'straight': 'ST',
      'flush': 'FL',
      'full-house': 'FH',
      'straight-flush': 'SF',
      'royal-flush': 'RF',
    };
    return mapping[rank] || null;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createGameOrchestrator(config?: Partial<EngineConfig>): GameOrchestrator {
  return new GameOrchestrator(config);
}
