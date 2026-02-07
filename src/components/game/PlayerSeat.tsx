/**
 * Player Seat Component
 * Individual player position at the table with cards and status
 */

import { motion } from 'framer-motion';
import { Participant } from '@/engine/types';
import { MiniCard } from './MiniCard';
import { cn } from '@/lib/utils';
import { User, Coins, AlertCircle } from 'lucide-react';

interface PlayerSeatProps {
  player: Participant;
  showCards: boolean;
  isActive: boolean;
  seatNumber: number;
}

export function PlayerSeat({ player, showCards, isActive, seatNumber }: PlayerSeatProps) {
  const cards = showCards ? player.finalHand : player.currentHand;
  const hasCards = cards && cards.length > 0;
  
  return (
    <motion.div
      animate={isActive ? { scale: 1.05 } : { scale: 1 }}
      className={cn(
        'relative flex flex-col items-center gap-2 p-3 rounded-xl',
        'bg-gradient-to-b from-card/90 to-card/70 backdrop-blur-sm',
        'border transition-all duration-300',
        isActive ? 'border-primary shadow-lg shadow-primary/20' : 'border-border/50',
        player.isBusted && 'opacity-50'
      )}
    >
      {/* Player Avatar */}
      <div className={cn(
        'w-12 h-12 rounded-full flex items-center justify-center',
        'bg-gradient-to-br from-muted to-muted/50 border-2',
        isActive ? 'border-primary' : 'border-border'
      )}>
        <User className="w-6 h-6 text-muted-foreground" />
      </div>

      {/* Player Info */}
      <div className="text-center">
        <div className="text-sm font-medium text-foreground">{player.name}</div>
        <div className="flex items-center gap-1 text-xs text-casino-gold">
          <Coins className="w-3 h-3" />
          <span>{player.credits}</span>
        </div>
      </div>

      {/* Cards */}
      {hasCards && (
        <div className="flex gap-0.5">
          {cards.map((card, i) => (
            <MiniCard
              key={i}
              card={card}
              isHeld={player.heldCardIndices.includes(i)}
              revealed={showCards}
              delay={i * 0.1}
            />
          ))}
        </div>
      )}

      {/* Hand Result */}
      {showCards && player.handResult && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-medium text-accent"
        >
          {player.handResult.name}
        </motion.div>
      )}

      {/* HT Decision Indicator */}
      {player.htDecision && (
        <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded text-[10px] bg-secondary text-secondary-foreground">
          {player.htDecision.htId}
        </div>
      )}

      {/* Bust Indicator */}
      {player.isBusted && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-destructive/20 backdrop-blur-sm rounded-xl"
        >
          <div className="flex items-center gap-1 text-destructive font-bold">
            <AlertCircle className="w-4 h-4" />
            <span>BUST</span>
          </div>
        </motion.div>
      )}

      {/* Seat Number */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-muted flex items-center justify-center">
        <span className="text-[10px] text-muted-foreground">{seatNumber}</span>
      </div>
    </motion.div>
  );
}
