/**
 * Hold Type (HT) Decision Engine
 * Deterministic logic for evaluating hands and deciding which cards to hold
 */

import { Card, getRankValue, Rank, Suit } from '@/utils/deck';
import { 
  evaluateHand, 
  HandRank, 
  HandResult,
  has4CardFlushDraw,
  has4CardStraightDraw,
} from '@/utils/handEvaluator';
import { HTDecision, HTCategory, HTPerformance } from './types';

// ============================================================================
// HT Decision Table
// ============================================================================

interface HTRule {
  id: string;
  priority: number;
  category: HTCategory;
  description: string;
  bustPotential: boolean;
  expectedValue: number;
  matcher: (cards: Card[], handResult: HandResult) => number[] | null;
}

// Priority ordered rules - higher priority checked first
const HT_RULES: HTRule[] = [
  // H5 - Hold all 5 (Made hands)
  {
    id: 'H5.RF',
    priority: 100,
    category: 'H5',
    description: 'Royal Flush - Hold all',
    bustPotential: false,
    expectedValue: 25.0,
    matcher: (cards, result) => result.rank === 'royal-flush' ? [0, 1, 2, 3, 4] : null,
  },
  {
    id: 'H5.SF',
    priority: 99,
    category: 'H5',
    description: 'Straight Flush - Hold all',
    bustPotential: false,
    expectedValue: 20.0,
    matcher: (cards, result) => result.rank === 'straight-flush' ? [0, 1, 2, 3, 4] : null,
  },
  {
    id: 'H5.4K',
    priority: 98,
    category: 'H5',
    description: 'Four of a Kind - Hold all',
    bustPotential: false,
    expectedValue: 15.0,
    matcher: (cards, result) => result.rank === 'four-of-a-kind' ? [0, 1, 2, 3, 4] : null,
  },
  {
    id: 'H5.FH',
    priority: 97,
    category: 'H5',
    description: 'Full House - Hold all',
    bustPotential: false,
    expectedValue: 15.0,
    matcher: (cards, result) => result.rank === 'full-house' ? [0, 1, 2, 3, 4] : null,
  },
  {
    id: 'H5.FL',
    priority: 96,
    category: 'H5',
    description: 'Flush - Hold all',
    bustPotential: false,
    expectedValue: 10.0,
    matcher: (cards, result) => result.rank === 'flush' ? [0, 1, 2, 3, 4] : null,
  },
  {
    id: 'H5.ST',
    priority: 95,
    category: 'H5',
    description: 'Straight - Hold all',
    bustPotential: false,
    expectedValue: 5.0,
    matcher: (cards, result) => result.rank === 'straight' ? [0, 1, 2, 3, 4] : null,
  },
  
  // H4 - Hold 4 cards (draws and strong made hands)
  {
    id: 'H4.4SF',
    priority: 90,
    category: 'H4',
    description: '4-card Straight Flush draw',
    bustPotential: true,
    expectedValue: 8.5,
    matcher: (cards, result) => {
      const flushDraw = has4CardFlushDraw(cards);
      if (!flushDraw.hasFlushDraw) return null;
      
      // Check if the 4 flush cards are also in sequence
      const flushCards = flushDraw.cardsToHold!.map(i => cards[i]);
      const values = flushCards.map(c => getRankValue(c.rank)).sort((a, b) => a - b);
      
      // Check for 4-card sequence
      let isSequence = true;
      for (let i = 0; i < values.length - 1; i++) {
        if (values[i + 1] - values[i] !== 1) {
          // Allow one gap for open-ended
          if (values[i + 1] - values[i] !== 2) {
            isSequence = false;
            break;
          }
        }
      }
      
      return isSequence ? flushDraw.cardsToHold! : null;
    },
  },
  {
    id: 'H4.4FL',
    priority: 85,
    category: 'H4',
    description: '4-card Flush draw',
    bustPotential: true,
    expectedValue: 5.5,
    matcher: (cards, result) => {
      const flushDraw = has4CardFlushDraw(cards);
      return flushDraw.hasFlushDraw ? flushDraw.cardsToHold! : null;
    },
  },
  {
    id: 'H4.4ST',
    priority: 80,
    category: 'H4',
    description: '4-card Straight draw (open-ended)',
    bustPotential: true,
    expectedValue: 4.0,
    matcher: (cards, result) => {
      const straightDraw = has4CardStraightDraw(cards);
      if (!straightDraw.hasStraightDraw) return null;
      
      // Verify it's open-ended (not gutshot)
      const heldCards = straightDraw.cardsToHold!.map(i => cards[i]);
      const values = heldCards.map(c => getRankValue(c.rank)).sort((a, b) => a - b);
      
      // Open-ended: low card > 2 and high card < 14
      if (values[0] > 2 && values[3] < 14) {
        return straightDraw.cardsToHold!;
      }
      
      return null;
    },
  },
  
  // H3 - Hold 3 cards
  {
    id: 'H3.3K',
    priority: 75,
    category: 'H3',
    description: 'Three of a Kind - Hold trips',
    bustPotential: false,
    expectedValue: 6.0,
    matcher: (cards, result) => {
      if (result.rank !== 'three-of-a-kind') return null;
      return findNOfAKindIndices(cards, 3);
    },
  },
  {
    id: 'H3.3RF',
    priority: 74,
    category: 'H3',
    description: '3-card Royal Flush draw',
    bustPotential: true,
    expectedValue: 5.0,
    matcher: (cards, result) => {
      // Look for 3 cards of same suit with values >= 10
      const suitGroups = groupBySuit(cards);
      
      for (const [suit, indices] of Object.entries(suitGroups)) {
        if (indices.length >= 3) {
          const royalCards = indices.filter(i => getRankValue(cards[i].rank) >= 10);
          if (royalCards.length >= 3) {
            return royalCards.slice(0, 3);
          }
        }
      }
      return null;
    },
  },
  {
    id: 'H3.3SF',
    priority: 73,
    category: 'H3',
    description: '3-card Straight Flush draw',
    bustPotential: true,
    expectedValue: 4.0,
    matcher: (cards, result) => {
      const suitGroups = groupBySuit(cards);
      
      for (const [suit, indices] of Object.entries(suitGroups)) {
        if (indices.length >= 3) {
          const suitCards = indices.map(i => ({ index: i, value: getRankValue(cards[i].rank) }));
          suitCards.sort((a, b) => a.value - b.value);
          
          // Check for 3-card sequence
          for (let start = 0; start <= suitCards.length - 3; start++) {
            const subset = suitCards.slice(start, start + 3);
            if (subset[2].value - subset[0].value <= 4) {
              return subset.map(c => c.index);
            }
          }
        }
      }
      return null;
    },
  },
  
  // H2 - Hold 2 cards
  {
    id: 'H2.2P',
    priority: 70,
    category: 'H2',
    description: 'Two Pair - Hold both pairs',
    bustPotential: false,
    expectedValue: 4.5,
    matcher: (cards, result) => {
      if (result.rank !== 'two-pair') return null;
      return findTwoPairIndices(cards);
    },
  },
  {
    id: 'H2.1P',
    priority: 65,
    category: 'H2',
    description: 'One Pair - Hold pair',
    bustPotential: false,
    expectedValue: 2.5,
    matcher: (cards, result) => {
      if (result.rank !== 'pair') return null;
      return findNOfAKindIndices(cards, 2);
    },
  },
  {
    id: 'H2.2RY',
    priority: 60,
    category: 'H2',
    description: '2 high cards (J+ suited)',
    bustPotential: true,
    expectedValue: 2.0,
    matcher: (cards, result) => {
      if (result.rank !== 'high-card') return null;
      
      const suitGroups = groupBySuit(cards);
      for (const [suit, indices] of Object.entries(suitGroups)) {
        const highCards = indices.filter(i => getRankValue(cards[i].rank) >= 11);
        if (highCards.length >= 2) {
          return highCards.slice(0, 2);
        }
      }
      return null;
    },
  },
  
  // H1 - Hold 1 card
  {
    id: 'H1.HC',
    priority: 50,
    category: 'H1',
    description: 'Hold highest card (A or K)',
    bustPotential: true,
    expectedValue: 1.0,
    matcher: (cards, result) => {
      if (result.rank !== 'high-card') return null;
      
      // Find Ace or King
      for (let i = 0; i < cards.length; i++) {
        if (cards[i].rank === 'A' || cards[i].rank === 'K') {
          return [i];
        }
      }
      return null;
    },
  },
  
  // H0 - Hold nothing
  {
    id: 'H0.DRAW5',
    priority: 0,
    category: 'H0',
    description: 'Draw all 5 - no holdings',
    bustPotential: true,
    expectedValue: 0.5,
    matcher: () => [],  // Always matches as fallback
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function groupBySuit(cards: Card[]): Record<Suit, number[]> {
  const groups: Record<string, number[]> = {};
  cards.forEach((card, index) => {
    if (!groups[card.suit]) groups[card.suit] = [];
    groups[card.suit].push(index);
  });
  return groups as Record<Suit, number[]>;
}

function findNOfAKindIndices(cards: Card[], n: number): number[] | null {
  const rankGroups: Record<string, number[]> = {};
  cards.forEach((card, index) => {
    if (!rankGroups[card.rank]) rankGroups[card.rank] = [];
    rankGroups[card.rank].push(index);
  });
  
  for (const indices of Object.values(rankGroups)) {
    if (indices.length === n) {
      return indices;
    }
  }
  return null;
}

function findTwoPairIndices(cards: Card[]): number[] | null {
  const rankGroups: Record<string, number[]> = {};
  cards.forEach((card, index) => {
    if (!rankGroups[card.rank]) rankGroups[card.rank] = [];
    rankGroups[card.rank].push(index);
  });
  
  const pairs: number[][] = [];
  for (const indices of Object.values(rankGroups)) {
    if (indices.length === 2) {
      pairs.push(indices);
    }
  }
  
  if (pairs.length >= 2) {
    return [...pairs[0], ...pairs[1]];
  }
  return null;
}

// ============================================================================
// Main HT Decision Function
// ============================================================================

export function makeHTDecision(cards: Card[]): HTDecision {
  if (cards.length !== 5) {
    throw new Error('HT decision requires exactly 5 cards');
  }
  
  const handResult = evaluateHand(cards);
  
  // Try each rule in priority order
  for (const rule of HT_RULES) {
    const cardsToHold = rule.matcher(cards, handResult);
    if (cardsToHold !== null) {
      return {
        htId: rule.id,
        category: rule.category,
        description: rule.description,
        cardsToHold,
        expectedValue: rule.expectedValue,
        bustPotential: rule.bustPotential,
      };
    }
  }
  
  // Should never reach here due to H0.DRAW5 fallback
  return {
    htId: 'H0.DRAW5',
    category: 'H0',
    description: 'Draw all 5 - no holdings',
    cardsToHold: [],
    expectedValue: 0.5,
    bustPotential: true,
  };
}

// ============================================================================
// HT Performance Tracking
// ============================================================================

export function createHTPerformanceTracker(): Record<string, HTPerformance> {
  const tracker: Record<string, HTPerformance> = {};
  
  for (const rule of HT_RULES) {
    tracker[rule.id] = {
      htId: rule.id,
      timesUsed: 0,
      wins: 0,
      losses: 0,
      busts: 0,
      totalWagered: 0,
      totalWon: 0,
      tubeHits: {
        ST: 0,
        FL: 0,
        FH: 0,
        SF: 0,
        RF: 0,
      },
    };
  }
  
  return tracker;
}

export function updateHTPerformance(
  tracker: Record<string, HTPerformance>,
  htId: string,
  outcome: 'win' | 'lose' | 'bust' | 'tie',
  wagered: number,
  won: number,
  tubeType?: string
): void {
  if (!tracker[htId]) {
    tracker[htId] = {
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
  
  const perf = tracker[htId];
  perf.timesUsed++;
  perf.totalWagered += wagered;
  perf.totalWon += won;
  
  switch (outcome) {
    case 'win':
      perf.wins++;
      break;
    case 'lose':
      perf.losses++;
      break;
    case 'bust':
      perf.busts++;
      break;
  }
  
  if (tubeType && tubeType in perf.tubeHits) {
    perf.tubeHits[tubeType as keyof typeof perf.tubeHits]++;
  }
}

export function getHTStats(tracker: Record<string, HTPerformance>): Array<{
  htId: string;
  timesUsed: number;
  winRate: number;
  lossRate: number;
  bustRate: number;
  ev: number;
}> {
  return Object.values(tracker)
    .filter(p => p.timesUsed > 0)
    .map(p => ({
      htId: p.htId,
      timesUsed: p.timesUsed,
      winRate: (p.wins / p.timesUsed) * 100,
      lossRate: (p.losses / p.timesUsed) * 100,
      bustRate: (p.busts / p.timesUsed) * 100,
      ev: p.totalWagered > 0 ? ((p.totalWon - p.totalWagered) / p.totalWagered) * 100 : 0,
    }))
    .sort((a, b) => b.timesUsed - a.timesUsed);
}
