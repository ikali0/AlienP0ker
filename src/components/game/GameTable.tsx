/**
 * Game Table Component
 * Premium casino-style poker table with player seats and dealer
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/utils/deck';
import { HandResult } from '@/utils/handEvaluator';
import { Participant } from '@/engine/types';
import { PlayerSeat } from './PlayerSeat';
import { DealerArea } from './DealerArea';
import { TubeDashboard } from './TubeDashboard';
import { cn } from '@/lib/utils';

interface GameTableProps {
  dealer: Participant | null;
  players: Participant[];
  tubeBalances: Record<string, number>;
  phase: string;
  playPot: number;
  showCards: boolean;
  activePlayerId?: string;
  highlightedTube?: string | null;
}

export function GameTable({
  dealer,
  players,
  tubeBalances,
  phase,
  playPot,
  showCards,
  activePlayerId,
  highlightedTube,
}: GameTableProps) {
  const [showPotAnimation, setShowPotAnimation] = useState(false);

  useEffect(() => {
    if (playPot > 0) {
      setShowPotAnimation(true);
      const timer = setTimeout(() => setShowPotAnimation(false), 500);
      return () => clearTimeout(timer);
    }
  }, [playPot]);

  // Position players around the table
  const getPlayerPosition = (index: number, total: number) => {
    // Positions: bottom-left, bottom-right, top-right, top-left
    const positions = [
      { x: '10%', y: '70%' },
      { x: '80%', y: '70%' },
      { x: '80%', y: '20%' },
      { x: '10%', y: '20%' },
    ];
    return positions[index % positions.length];
  };

  return (
    <div className="relative w-full aspect-[16/10] max-w-5xl mx-auto">
      {/* Table Surface */}
      <div className="absolute inset-0 rounded-[50%] bg-gradient-to-b from-[hsl(152,35%,22%)] to-[hsl(152,35%,12%)] border-8 border-[hsl(30,50%,25%)] shadow-2xl overflow-hidden">
        {/* Table Inner Border */}
        <div className="absolute inset-4 rounded-[50%] border-2 border-[hsl(45,60%,30%)/30]" />
        
        {/* Felt Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, hsl(45 60% 50% / 0.1) 1px, transparent 0)`,
            backgroundSize: '20px 20px',
          }}
        />
        
        {/* Center Logo/Pot Area */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32">
          <motion.div
            animate={showPotAnimation ? { scale: [1, 1.1, 1] } : {}}
            className="w-full h-full rounded-full bg-[hsl(152,35%,15%)] border border-[hsl(45,60%,40%)/50] flex flex-col items-center justify-center"
          >
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Pot</span>
            <span className="text-2xl font-bold text-casino-gold">{playPot}</span>
          </motion.div>
        </div>
      </div>

      {/* Dealer Area - Top Center */}
      {dealer && (
        <div className="absolute left-1/2 -translate-x-1/2 top-[5%]">
          <DealerArea
            dealer={dealer}
            showCards={showCards || phase === 'showdown' || phase === 'payout'}
            isActive={phase === 'hold' || phase === 'draw'}
          />
        </div>
      )}

      {/* Player Seats */}
      {players.map((player, index) => {
        const pos = getPlayerPosition(index, players.length);
        return (
          <div
            key={player.id}
            className="absolute"
            style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
          >
            <PlayerSeat
              player={player}
              showCards={showCards}
              isActive={player.id === activePlayerId}
              seatNumber={index + 1}
            />
          </div>
        );
      })}

      {/* Tube Dashboard - Right Side */}
      <div className="absolute -right-4 top-1/2 -translate-y-1/2 translate-x-full">
        <TubeDashboard
          balances={tubeBalances}
          highlightedTube={highlightedTube}
          vertical
        />
      </div>

      {/* Phase Indicator */}
      <AnimatePresence>
        {phase !== 'waiting' && phase !== 'complete' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute left-1/2 -translate-x-1/2 top-[40%]"
          >
            <div className="bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full border border-[hsl(45,60%,40%)/30]">
              <span className="text-sm text-casino-gold uppercase tracking-widest">
                {phase.replace('_', ' ')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
