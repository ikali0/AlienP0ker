/**
 * Core Engine Types
 * Production-ready type definitions for the Tube Poker engine
 */

import { Card } from '@/utils/deck';
import { HandResult } from '@/utils/handEvaluator';

// ============================================================================
// Configuration Types
// ============================================================================

export interface EngineConfig {
  // Game rules
  playerCount: number;
  ante: number;
  
  // Dealer settings
  dealerDrawAllowed: boolean;
  dealerBustAllowed: boolean;
  dealerWinsOnTie: boolean;
  dealerAggression: number; // 0-1, affects draw decisions
  
  // Bust mechanics
  bustPenaltyMultiplier: number;
  
  // Tube economy
  tubes: TubeConfig;
  payoutStrategy: PayoutStrategyType;
  
  // Refill rules
  playerRefillsOnWin: boolean;
  houseRefillsOnEmpty: boolean;
  refillAmount: number;
  
  // Stack triggers
  autoRefillThreshold: number;
  bonusPayoutThreshold: number;
}

export interface TubeConfig {
  ST: { initial: number; max: number };
  FL: { initial: number; max: number };
  FH: { initial: number; max: number };
  SF: { initial: number; max: number };
  RF: { initial: number; max: number };
}

export type PayoutStrategyType = 
  | 'fixed'           // Full tube balance
  | 'percentage'      // % of current balance
  | 'logarithmic'     // Base + log(balance)
  | 'progressive';    // Increases with tube size

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  playerCount: 4,
  ante: 5,
  
  dealerDrawAllowed: true,
  dealerBustAllowed: true,
  dealerWinsOnTie: false,
  dealerAggression: 0.5,
  
  bustPenaltyMultiplier: 1.0,
  
  tubes: {
    ST: { initial: 5, max: 10 },
    FL: { initial: 10, max: 20 },
    FH: { initial: 15, max: 30 },
    SF: { initial: 20, max: 40 },
    RF: { initial: 25, max: 50 },
  },
  
  payoutStrategy: 'fixed',
  
  playerRefillsOnWin: true,
  houseRefillsOnEmpty: true,
  refillAmount: 1,
  
  autoRefillThreshold: 2,
  bonusPayoutThreshold: 40,
};

// ============================================================================
// Participant Types
// ============================================================================

export interface Participant {
  id: string;
  name: string;
  isDealer: boolean;
  credits: number;
  seatPosition: number;
  
  // Current round state
  currentHand: Card[];
  heldCardIndices: number[];
  finalHand: Card[];
  handResult: HandResult | null;
  htDecision: HTDecision | null;
  isBusted: boolean;
  isActive: boolean;
}

export interface HTDecision {
  htId: string;
  category: string;
  description: string;
  cardsToHold: number[];
  expectedValue: number;
  bustPotential: boolean;
}

// ============================================================================
// Round Types
// ============================================================================

export type RoundPhase = 
  | 'waiting'
  | 'ante'
  | 'deal'
  | 'hold'
  | 'draw'
  | 'evaluate'
  | 'showdown'
  | 'payout'
  | 'complete';

export interface RoundState {
  roundNumber: number;
  phase: RoundPhase;
  
  // Deck state
  deck: Card[];
  cardsDealt: number;
  
  // Participants
  participants: Participant[];
  dealer: Participant;
  
  // Pot tracking
  playPot: number;
  anteCollected: number;
  
  // Tube state
  tubeBalances: TubeBalances;
  
  // Results
  outcomes: ParticipantOutcome[];
  tubePayouts: TubePayoutRecord[];
  bustPenalties: BustPenaltyRecord[];
  stackTriggers: string[];
}

export interface TubeBalances {
  ST: number;
  FL: number;
  FH: number;
  SF: number;
  RF: number;
}

export interface ParticipantOutcome {
  participantId: string;
  outcome: 'win' | 'lose' | 'bust' | 'tie';
  handRank: string;
  payout: number;
  tubePayout: number;
  bustPenalty: number;
}

export interface TubePayoutRecord {
  tubeType: keyof TubeBalances;
  amount: number;
  participantId: string;
  timestamp: number;
}

export interface BustPenaltyRecord {
  participantId: string;
  amount: number;
  reason: string;
  timestamp: number;
}

// ============================================================================
// House Ledger Types
// ============================================================================

export interface HouseLedger {
  totalAnteCollected: number;
  totalPayoutsGiven: number;
  totalBustPenaltiesCollected: number;
  totalTubePayouts: number;
  netProfit: number;
  roundsPlayed: number;
  
  // Detailed tracking
  anteHistory: number[];
  payoutHistory: number[];
  bustHistory: number[];
}

// ============================================================================
// Payout Strategy Interface
// ============================================================================

export interface PayoutStrategy {
  type: PayoutStrategyType;
  calculate: (tube: { current: number; initial: number; max: number }) => number;
}

// ============================================================================
// Event Types for UI Synchronization
// ============================================================================

export type EngineEventType = 
  | 'round_start'
  | 'ante_collected'
  | 'cards_dealt'
  | 'ht_decided'
  | 'cards_drawn'
  | 'hands_evaluated'
  | 'showdown'
  | 'payout_processed'
  | 'tube_drained'
  | 'tube_refilled'
  | 'bust_triggered'
  | 'round_complete'
  | 'stack_trigger';

export interface EngineEvent {
  type: EngineEventType;
  roundNumber: number;
  timestamp: number;
  data: Record<string, unknown>;
}

export type EngineEventCallback = (event: EngineEvent) => void;
