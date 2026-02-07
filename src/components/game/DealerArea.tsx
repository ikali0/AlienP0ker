/**
 * Dealer Area Component
 * Dealer position with cards and house status
 */

import { motion } from 'framer-motion';
import { Participant } from '@/engine/types';
import { MiniCard } from './MiniCard';
import { cn } from '@/lib/utils';
import { Crown, Shield } from 'lucide-react';

interface DealerAreaProps {
  dealer: Participant;
  showCards: boolean;
  isActive: boolean;
}

export function DealerArea({ dealer, showCards, isActive }: DealerAreaProps) {
  const cards = showCards ? dealer.finalHand : dealer.currentHand;
  const hasCards = cards && cards.length > 0;

  return (
    <motion.div
      animate={isActive ? { y: -5 } : { y: 0 }}
      className={cn(
        'flex flex-col items-center gap-3 p-4 rounded-2xl',
        'bg-gradient-to-b from-[hsl(220,20%,12%)] to-[hsl(220,20%,8%)]',
        'border-2 transition-all duration-300',
        isActive ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-border/30'
      )}
    >
      {/* Dealer Badge */}
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/50">
          <Crown className="w-5 h-5 text-primary" />
        </div>
        <div className="text-left">
          <div className="text-sm font-bold text-foreground">DEALER</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3" />
            House Bank
          </div>
        </div>
      </div>

      {/* Dealer Cards */}
      {hasCards && (
        <div className="flex gap-1">
          {cards.map((card, i) => (
            <MiniCard
              key={i}
              card={card}
              revealed={showCards}
              delay={i * 0.15}
              size="lg"
            />
          ))}
        </div>
      )}

      {/* Hand Result */}
      {showCards && dealer.handResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30"
        >
          <span className="text-sm font-bold text-primary">
            {dealer.handResult.name}
          </span>
        </motion.div>
      )}

      {/* HT Decision */}
      {dealer.htDecision && !showCards && (
        <div className="text-[10px] text-muted-foreground">
          HT: {dealer.htDecision.htId}
        </div>
      )}
    </motion.div>
  );
}
