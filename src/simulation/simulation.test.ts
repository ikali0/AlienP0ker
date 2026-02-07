/**
 * Simulation Engine Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  runSimulation, 
  quickSimulation,
  generateReport,
  makeHTDecision,
  initializeTubes,
  DEFAULT_CONFIG,
} from '@/simulation';
import { createDeck, shuffleDeck, dealCards } from '@/utils/deck';
import { evaluateHand } from '@/utils/handEvaluator';

describe('Simulation Engine', () => {
  describe('HT Decision Engine', () => {
    it('should make a decision for any 5-card hand', () => {
      const deck = shuffleDeck(createDeck());
      const { dealt } = dealCards(deck, 5);
      
      const decision = makeHTDecision(dealt);
      
      expect(decision).toBeDefined();
      expect(decision.htId).toBeTruthy();
      expect(decision.category).toMatch(/^H[0-5]$/);
      expect(decision.cardsToHold).toBeInstanceOf(Array);
      expect(decision.cardsToHold.length).toBeLessThanOrEqual(5);
    });

    it('should hold all 5 cards for made hands like flush', () => {
      // Create a flush hand manually
      const flushHand = [
        { suit: 'hearts' as const, rank: 'A' as const, id: 'A-hearts' },
        { suit: 'hearts' as const, rank: 'K' as const, id: 'K-hearts' },
        { suit: 'hearts' as const, rank: '7' as const, id: '7-hearts' },
        { suit: 'hearts' as const, rank: '4' as const, id: '4-hearts' },
        { suit: 'hearts' as const, rank: '2' as const, id: '2-hearts' },
      ];
      
      const decision = makeHTDecision(flushHand);
      
      expect(decision.htId).toBe('H5.FL');
      expect(decision.category).toBe('H5');
      expect(decision.cardsToHold).toEqual([0, 1, 2, 3, 4]);
    });

    it('should hold pair cards for pair hands', () => {
      const pairHand = [
        { suit: 'hearts' as const, rank: 'K' as const, id: 'K-hearts' },
        { suit: 'spades' as const, rank: 'K' as const, id: 'K-spades' },
        { suit: 'clubs' as const, rank: '7' as const, id: '7-clubs' },
        { suit: 'diamonds' as const, rank: '4' as const, id: '4-diamonds' },
        { suit: 'hearts' as const, rank: '2' as const, id: '2-hearts' },
      ];
      
      const decision = makeHTDecision(pairHand);
      
      expect(decision.htId).toBe('H2.1P');
      expect(decision.category).toBe('H2');
      expect(decision.cardsToHold.length).toBe(2);
    });
  });

  describe('Tube Engine', () => {
    it('should initialize tubes with config values', () => {
      const tubes = initializeTubes(DEFAULT_CONFIG);
      
      expect(tubes.ST).toBe(DEFAULT_CONFIG.initSTTube);
      expect(tubes.FL).toBe(DEFAULT_CONFIG.initFLTube);
      expect(tubes.FH).toBe(DEFAULT_CONFIG.initFHTube);
      expect(tubes.SF).toBe(DEFAULT_CONFIG.initSFTube);
      expect(tubes.RF).toBe(DEFAULT_CONFIG.initRFTube);
    });
  });

  describe('Simulation Runner', () => {
    it('should run a small simulation without errors', () => {
      const result = runSimulation({
        roundsPerRun: 100,
        playerCount: 2,
      });
      
      expect(result).toBeDefined();
      expect(result.stats.roundsCompleted).toBe(100);
      expect(result.config.playerCount).toBe(2);
    });

    it('should track wins and losses', () => {
      const result = runSimulation({
        roundsPerRun: 500,
        playerCount: 4,
      });
      
      const totalOutcomes = result.stats.totalPlayerWins + 
                           result.stats.totalPlayerLosses + 
                           result.stats.totalPlayerBusts;
      
      // Each round has 4 players
      expect(totalOutcomes).toBeGreaterThan(0);
      expect(totalOutcomes).toBeLessThanOrEqual(500 * 4);
    });

    it('should generate a valid report', () => {
      const result = runSimulation({ roundsPerRun: 100 });
      const report = generateReport(result.stats);
      
      expect(report.summary.roundsCompleted).toBe(100);
      expect(report.playerStats).toBeDefined();
      expect(report.houseStats).toBeDefined();
      expect(report.tubeStats.length).toBe(5);
      expect(report.handDistribution.length).toBe(10);
    });

    it('should respect configuration options', () => {
      const result = runSimulation({
        roundsPerRun: 50,
        playerCount: 6,
        ante: 10,
        dealerDrawAllowed: false,
      });
      
      expect(result.config.playerCount).toBe(6);
      expect(result.config.ante).toBe(10);
      expect(result.config.dealerDrawAllowed).toBe(false);
    });
  });

  describe('Hand Evaluation Integration', () => {
    it('should correctly categorize all hand ranks', () => {
      const hands = {
        'high-card': [
          { suit: 'hearts' as const, rank: 'A' as const, id: '1' },
          { suit: 'spades' as const, rank: 'K' as const, id: '2' },
          { suit: 'clubs' as const, rank: '7' as const, id: '3' },
          { suit: 'diamonds' as const, rank: '4' as const, id: '4' },
          { suit: 'hearts' as const, rank: '2' as const, id: '5' },
        ],
        'pair': [
          { suit: 'hearts' as const, rank: 'K' as const, id: '1' },
          { suit: 'spades' as const, rank: 'K' as const, id: '2' },
          { suit: 'clubs' as const, rank: '7' as const, id: '3' },
          { suit: 'diamonds' as const, rank: '4' as const, id: '4' },
          { suit: 'hearts' as const, rank: '2' as const, id: '5' },
        ],
        'flush': [
          { suit: 'hearts' as const, rank: 'A' as const, id: '1' },
          { suit: 'hearts' as const, rank: 'K' as const, id: '2' },
          { suit: 'hearts' as const, rank: '7' as const, id: '3' },
          { suit: 'hearts' as const, rank: '4' as const, id: '4' },
          { suit: 'hearts' as const, rank: '2' as const, id: '5' },
        ],
      };
      
      for (const [expectedRank, hand] of Object.entries(hands)) {
        const result = evaluateHand(hand);
        expect(result.rank).toBe(expectedRank);
      }
    });
  });
});

describe('Quick Simulation', () => {
  it('should run quickly with default settings', () => {
    const startTime = performance.now();
    const result = quickSimulation(1000, false);
    const duration = performance.now() - startTime;
    
    expect(result.stats.roundsCompleted).toBe(1000);
    expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
  });
});
