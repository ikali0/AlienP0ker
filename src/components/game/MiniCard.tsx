/**
 * Mini Card Component
 * Small card representation for table view
 */

import { motion } from 'framer-motion';
import { Card as CardType } from '@/utils/deck';
import { cn } from '@/lib/utils';

interface MiniCardProps {
  card: CardType;
  revealed?: boolean;
  isHeld?: boolean;
  delay?: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const suitSymbols: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const suitColors: Record<string, string> = {
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-slate-800',
  spades: 'text-slate-800',
};

const sizeClasses = {
  sm: 'w-7 h-10 text-[10px]',
  md: 'w-9 h-13 text-xs',
  lg: 'w-11 h-16 text-sm',
};

export function MiniCard({
  card,
  revealed = true,
  isHeld = false,
  delay = 0,
  size = 'md',
  onClick,
}: MiniCardProps) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotateY: 180 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        rotateY: revealed ? 0 : 180,
        y: isHeld ? -4 : 0,
      }}
      transition={{ delay, duration: 0.3 }}
      onClick={onClick}
      className={cn(
        'relative rounded-sm cursor-pointer transition-all perspective-1000',
        sizeClasses[size],
        onClick && 'hover:scale-110'
      )}
    >
      {/* Card Front */}
      <div
        className={cn(
          'absolute inset-0 rounded-sm flex flex-col items-center justify-center',
          'bg-white shadow-md border border-slate-200',
          isHeld && 'ring-2 ring-primary'
        )}
        style={{ backfaceVisibility: revealed ? 'visible' : 'hidden' }}
      >
        <span className={cn('font-bold leading-none', isRed ? 'text-red-500' : 'text-slate-800')}>
          {card.rank}
        </span>
        <span className={cn('leading-none', isRed ? 'text-red-500' : 'text-slate-800')}>
          {suitSymbols[card.suit]}
        </span>
      </div>

      {/* Card Back */}
      <div
        className={cn(
          'absolute inset-0 rounded-sm',
          'bg-gradient-to-br from-blue-800 to-blue-900',
          'border border-blue-700'
        )}
        style={{ 
          backfaceVisibility: revealed ? 'hidden' : 'visible',
          transform: 'rotateY(180deg)',
        }}
      >
        <div className="absolute inset-1 rounded-sm border border-blue-600/50 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(255,255,255,0.05)_2px,rgba(255,255,255,0.05)_4px)]" />
      </div>

      {/* Hold Indicator */}
      {isHeld && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-primary uppercase"
        >
          Hold
        </motion.div>
      )}
    </motion.div>
  );
}
