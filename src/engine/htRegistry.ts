/**
 * Hold Type Registry
 * Extensible HT system - add new strategies without rewriting engine
 */

import { Card, getRankValue, Suit } from '@/utils/deck';
import { evaluateHand, HandResult, has4CardFlushDraw, has4CardStraightDraw } from '@/utils/handEvaluator';
import { HTDecision } from './types';

// ============================================================================
// HT Rule Definition
// ============================================================================

export interface HTRule {
  id: string;
  priority: number;
  category: 'H5' | 'H4' | 'H3' | 'H2' | 'H1' | 'H0';
  description: string;
  bustPotential: boolean;
  theoreticalEV: number;
  enabled: boolean;
  matcher: (cards: Card[], handResult: HandResult) => number[] | null;
}

export interface HTStats {
  usageCount: number;
  winCount: number;
  lossCount: number;
  bustCount: number;
  totalWon: number;
  totalWagered: number;
  tubeHits: Record<string, number>;
  calculatedEV: number;
}

// ============================================================================
// Registry Class
// ============================================================================

class HTRegistryClass {
  private rules: Map<string, HTRule> = new Map();
  private stats: Map<string, HTStats> = new Map();
  
  constructor() {
    this.registerDefaultRules();
  }
  
  /**
   * Register a new HT rule
   */
  register(rule: HTRule): void {
    this.rules.set(rule.id, rule);
    this.stats.set(rule.id, this.createEmptyStats());
  }
  
  /**
   * Remove an HT rule
   */
  unregister(htId: string): boolean {
    this.rules.delete(htId);
    this.stats.delete(htId);
    return true;
  }
  
  /**
   * Enable/disable an HT rule
   */
  setEnabled(htId: string, enabled: boolean): void {
    const rule = this.rules.get(htId);
    if (rule) {
      rule.enabled = enabled;
    }
  }
  
  /**
   * Get all rules sorted by priority
   */
  getAllRules(): HTRule[] {
    return Array.from(this.rules.values())
      .filter(r => r.enabled)
      .sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Get rule by ID
   */
  getRule(htId: string): HTRule | undefined {
    return this.rules.get(htId);
  }
  
  /**
   * Make HT decision for a hand
   */
  decide(cards: Card[]): HTDecision {
    if (cards.length !== 5) {
      throw new Error('HT decision requires exactly 5 cards');
    }
    
    const handResult = evaluateHand(cards);
    const rules = this.getAllRules();
    
    for (const rule of rules) {
      const cardsToHold = rule.matcher(cards, handResult);
      if (cardsToHold !== null) {
        return {
          htId: rule.id,
          category: rule.category,
          description: rule.description,
          cardsToHold,
          expectedValue: rule.theoreticalEV,
          bustPotential: rule.bustPotential,
        };
      }
    }
    
    // Fallback - should never reach if H0.DRAW5 is registered
    return {
      htId: 'H0.DRAW5',
      category: 'H0',
      description: 'Draw all 5',
      cardsToHold: [],
      expectedValue: 0.5,
      bustPotential: true,
    };
  }
  
  /**
   * Record outcome for stats
   */
  recordOutcome(
    htId: string,
    outcome: 'win' | 'lose' | 'bust',
    wagered: number,
    won: number,
    tubeType?: string
  ): void {
    const stats = this.stats.get(htId);
    if (!stats) return;
    
    stats.usageCount++;
    stats.totalWagered += wagered;
    stats.totalWon += won;
    
    if (outcome === 'win') stats.winCount++;
    else if (outcome === 'lose') stats.lossCount++;
    else if (outcome === 'bust') stats.bustCount++;
    
    if (tubeType && stats.tubeHits[tubeType] !== undefined) {
      stats.tubeHits[tubeType]++;
    }
    
    // Update calculated EV
    if (stats.totalWagered > 0) {
      stats.calculatedEV = (stats.totalWon - stats.totalWagered) / stats.totalWagered;
    }
  }
  
  /**
   * Get stats for all HTs
   */
  getAllStats(): Map<string, HTStats> {
    return new Map(this.stats);
  }
  
  /**
   * Get stats for specific HT
   */
  getStats(htId: string): HTStats | undefined {
    return this.stats.get(htId);
  }
  
  /**
   * Reset all stats
   */
  resetStats(): void {
    for (const htId of this.stats.keys()) {
      this.stats.set(htId, this.createEmptyStats());
    }
  }
  
  /**
   * Get exploitable HTs (EV > threshold)
   */
  getExploitableHTs(threshold: number = 0.02): Array<{ htId: string; ev: number }> {
    const exploits: Array<{ htId: string; ev: number }> = [];
    
    for (const [htId, stats] of this.stats) {
      if (stats.usageCount > 100 && stats.calculatedEV > threshold) {
        exploits.push({ htId, ev: stats.calculatedEV });
      }
    }
    
    return exploits.sort((a, b) => b.ev - a.ev);
  }
  
  private createEmptyStats(): HTStats {
    return {
      usageCount: 0,
      winCount: 0,
      lossCount: 0,
      bustCount: 0,
      totalWon: 0,
      totalWagered: 0,
      tubeHits: { ST: 0, FL: 0, FH: 0, SF: 0, RF: 0 },
      calculatedEV: 0,
    };
  }
  
  private registerDefaultRules(): void {
    // H5 - Made hands (hold all)
    this.register({
      id: 'H5.RF',
      priority: 100,
      category: 'H5',
      description: 'Royal Flush - Hold all',
      bustPotential: false,
      theoreticalEV: 25.0,
      enabled: true,
      matcher: (_, result) => result.rank === 'royal-flush' ? [0, 1, 2, 3, 4] : null,
    });
    
    this.register({
      id: 'H5.SF',
      priority: 99,
      category: 'H5',
      description: 'Straight Flush - Hold all',
      bustPotential: false,
      theoreticalEV: 20.0,
      enabled: true,
      matcher: (_, result) => result.rank === 'straight-flush' ? [0, 1, 2, 3, 4] : null,
    });
    
    this.register({
      id: 'H5.4K',
      priority: 98,
      category: 'H5',
      description: 'Four of a Kind - Hold all',
      bustPotential: false,
      theoreticalEV: 15.0,
      enabled: true,
      matcher: (_, result) => result.rank === 'four-of-a-kind' ? [0, 1, 2, 3, 4] : null,
    });
    
    this.register({
      id: 'H5.FH',
      priority: 97,
      category: 'H5',
      description: 'Full House - Hold all',
      bustPotential: false,
      theoreticalEV: 15.0,
      enabled: true,
      matcher: (_, result) => result.rank === 'full-house' ? [0, 1, 2, 3, 4] : null,
    });
    
    this.register({
      id: 'H5.FL',
      priority: 96,
      category: 'H5',
      description: 'Flush - Hold all',
      bustPotential: false,
      theoreticalEV: 10.0,
      enabled: true,
      matcher: (_, result) => result.rank === 'flush' ? [0, 1, 2, 3, 4] : null,
    });
    
    this.register({
      id: 'H5.ST',
      priority: 95,
      category: 'H5',
      description: 'Straight - Hold all',
      bustPotential: false,
      theoreticalEV: 5.0,
      enabled: true,
      matcher: (_, result) => result.rank === 'straight' ? [0, 1, 2, 3, 4] : null,
    });
    
    // H4 - Strong draws
    this.register({
      id: 'H4.4FL',
      priority: 85,
      category: 'H4',
      description: '4-card Flush draw',
      bustPotential: true,
      theoreticalEV: 5.5,
      enabled: true,
      matcher: (cards) => {
        const flushDraw = has4CardFlushDraw(cards);
        return flushDraw.hasFlushDraw ? flushDraw.cardsToHold! : null;
      },
    });
    
    this.register({
      id: 'H4.4ST',
      priority: 80,
      category: 'H4',
      description: '4-card Straight draw',
      bustPotential: true,
      theoreticalEV: 4.0,
      enabled: true,
      matcher: (cards) => {
        const straightDraw = has4CardStraightDraw(cards);
        return straightDraw.hasStraightDraw ? straightDraw.cardsToHold! : null;
      },
    });
    
    // H3 - Three of a kind and draws
    this.register({
      id: 'H3.3K',
      priority: 75,
      category: 'H3',
      description: 'Three of a Kind - Hold trips',
      bustPotential: false,
      theoreticalEV: 6.0,
      enabled: true,
      matcher: (cards, result) => {
        if (result.rank !== 'three-of-a-kind') return null;
        return this.findNOfAKind(cards, 3);
      },
    });
    
    // H2 - Pairs
    this.register({
      id: 'H2.2P',
      priority: 70,
      category: 'H2',
      description: 'Two Pair - Hold both pairs',
      bustPotential: false,
      theoreticalEV: 4.5,
      enabled: true,
      matcher: (cards, result) => {
        if (result.rank !== 'two-pair') return null;
        return this.findTwoPairs(cards);
      },
    });
    
    this.register({
      id: 'H2.1P',
      priority: 65,
      category: 'H2',
      description: 'One Pair - Hold pair',
      bustPotential: false,
      theoreticalEV: 2.5,
      enabled: true,
      matcher: (cards, result) => {
        if (result.rank !== 'pair') return null;
        return this.findNOfAKind(cards, 2);
      },
    });
    
    // H1 - High card
    this.register({
      id: 'H1.HC',
      priority: 50,
      category: 'H1',
      description: 'Hold highest card (A or K)',
      bustPotential: true,
      theoreticalEV: 1.0,
      enabled: true,
      matcher: (cards, result) => {
        if (result.rank !== 'high-card') return null;
        for (let i = 0; i < cards.length; i++) {
          if (cards[i].rank === 'A' || cards[i].rank === 'K') {
            return [i];
          }
        }
        return null;
      },
    });
    
    // H0 - Fallback
    this.register({
      id: 'H0.DRAW5',
      priority: 0,
      category: 'H0',
      description: 'Draw all 5 - no holdings',
      bustPotential: true,
      theoreticalEV: 0.5,
      enabled: true,
      matcher: () => [],
    });
  }
  
  private findNOfAKind(cards: Card[], n: number): number[] | null {
    const groups: Record<string, number[]> = {};
    cards.forEach((card, i) => {
      if (!groups[card.rank]) groups[card.rank] = [];
      groups[card.rank].push(i);
    });
    
    for (const indices of Object.values(groups)) {
      if (indices.length === n) return indices;
    }
    return null;
  }
  
  private findTwoPairs(cards: Card[]): number[] | null {
    const groups: Record<string, number[]> = {};
    cards.forEach((card, i) => {
      if (!groups[card.rank]) groups[card.rank] = [];
      groups[card.rank].push(i);
    });
    
    const pairs = Object.values(groups).filter(g => g.length === 2);
    if (pairs.length >= 2) {
      return [...pairs[0], ...pairs[1]];
    }
    return null;
  }
}

// Singleton instance
export const HTRegistry = new HTRegistryClass();
