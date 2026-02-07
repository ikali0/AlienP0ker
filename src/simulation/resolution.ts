/**
 * Resolution Engine
 * Handles hand comparison and winner determination
 */

import { Card } from '@/utils/deck';
import { evaluateHand, compareHands, HandResult } from '@/utils/handEvaluator';
import { SimulationConfig, Participant, ParticipantRoundResult, handRankToTubeType } from './types';
import { processWinPayout, TubePayoutResult } from './tubeEngine';
import { TubeBalances, TubeType } from './types';

// ============================================================================
// Hand Resolution
// ============================================================================

export interface ResolutionResult {
  playerResults: ParticipantRoundResult[];
  dealerResult: ParticipantRoundResult;
  tubePayouts: Record<TubeType, number>;
  totalBustPenalties: number;
  newTubeBalances: TubeBalances;
  stackTriggers: TubeType[];
}

export function resolveRound(
  players: Participant[],
  dealer: Participant,
  tubes: TubeBalances,
  config: SimulationConfig
): ResolutionResult {
  const playerResults: ParticipantRoundResult[] = [];
  const tubePayouts: Record<TubeType, number> = { ST: 0, FL: 0, FH: 0, SF: 0, RF: 0 };
  let currentTubes = { ...tubes };
  let totalBustPenalties = 0;
  const stackTriggers: TubeType[] = [];
  
  // Ensure dealer has a valid final hand
  const dealerFinalHand = dealer.finalHand.length === 5 ? dealer.finalHand : dealer.currentHand;
  if (dealerFinalHand.length !== 5) {
    throw new Error(`Dealer hand is invalid: expected 5 cards, got ${dealerFinalHand.length}`);
  }
  
  // Evaluate dealer's hand
  const dealerHandResult = evaluateHand(dealerFinalHand);
  
  const dealerRoundResult: ParticipantRoundResult = {
    participantId: dealer.id,
    initialHand: dealer.currentHand,
    htDecision: dealer.htDecision,
    discardedCards: dealer.currentHand.filter((_, i) => !dealer.heldCards.includes(i)),
    drawnCards: dealerFinalHand.filter(c => !dealer.currentHand.some(oc => oc.id === c.id)),
    finalHand: dealerFinalHand,
    handResult: dealerHandResult,
    outcome: 'tie', // Updated below based on player outcomes
    payout: 0,
    tubePayout: 0,
    bustPenalty: 0,
  };
  
  // Process each player against dealer
  for (const player of players) {
    // Ensure player has a valid final hand
    const playerFinalHand = player.finalHand.length === 5 ? player.finalHand : player.currentHand;
    if (playerFinalHand.length !== 5) {
      throw new Error(`Player ${player.id} hand is invalid: expected 5 cards, got ${playerFinalHand.length}`);
    }
    
    const playerHandResult = evaluateHand(playerFinalHand);
    const comparison = compareHands(playerHandResult, dealerHandResult);
    
    let outcome: 'win' | 'lose' | 'bust' | 'tie';
    let payout = 0;
    let tubePayout = 0;
    let bustPenalty = 0;
    
    if (comparison > 0) {
      // Player wins
      outcome = 'win';
      
      // Check for tube payout
      const tubeType = handRankToTubeType(playerHandResult.rank);
      if (tubeType) {
        const payoutResult = processWinPayout(currentTubes, playerHandResult.rank, player.id, config);
        
        if (payoutResult) {
          if (payoutResult.isBust) {
            // Bust - tube was empty
            outcome = 'bust';
            bustPenalty = config.ante * config.bustPenaltyMultiplier;
            totalBustPenalties += bustPenalty;
            stackTriggers.push(tubeType);
          } else {
            // Successful tube payout
            tubePayout = payoutResult.payout;
            tubePayouts[tubeType] += tubePayout;
            currentTubes = payoutResult.newBalances;
          }
        }
      }
      
      // Base win payout (ante)
      if (outcome === 'win') {
        payout = config.ante;
      }
    } else if (comparison < 0) {
      // Player loses
      outcome = 'lose';
      payout = -config.ante;
    } else {
      // Tie
      if (config.dealerWinsOnSameHT) {
        outcome = 'lose';
        payout = -config.ante;
      } else {
        outcome = 'tie';
        payout = 0;
      }
    }
    
    playerResults.push({
      participantId: player.id,
      initialHand: player.currentHand,
      htDecision: player.htDecision,
      discardedCards: player.currentHand.filter((_, i) => !player.heldCards.includes(i)),
      drawnCards: playerFinalHand.filter(c => !player.currentHand.some(oc => oc.id === c.id)),
      finalHand: playerFinalHand,
      handResult: playerHandResult,
      outcome,
      payout: payout + tubePayout - bustPenalty,
      tubePayout,
      bustPenalty,
    });
  }
  
  return {
    playerResults,
    dealerResult: dealerRoundResult,
    tubePayouts,
    totalBustPenalties,
    newTubeBalances: currentTubes,
    stackTriggers,
  };
}

// ============================================================================
// Bust Handling
// ============================================================================

export function calculateBustPenalty(
  ante: number,
  multiplier: number,
  playerCredits: number
): { penalty: number; playerBusted: boolean } {
  const penalty = ante * multiplier;
  const playerBusted = playerCredits < penalty;
  
  return {
    penalty: Math.min(penalty, playerCredits),
    playerBusted,
  };
}

export function isDealerBust(
  dealerResult: HandResult,
  config: SimulationConfig,
  tubes: TubeBalances
): boolean {
  if (!config.dealerBustAllowed) return false;
  
  const tubeType = handRankToTubeType(dealerResult.rank);
  if (!tubeType) return false;
  
  return tubes[tubeType] <= 0;
}
