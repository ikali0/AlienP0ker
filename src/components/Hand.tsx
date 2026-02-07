import { Card } from '@/utils/deck';
import { PlayingCard } from './PlayingCard';
import { cn } from '@/lib/utils';

interface HandProps {
  cards: Card[];
  heldCards: Set<number>;
  isRevealed: boolean;
  onCardClick?: (index: number) => void;
  disabled?: boolean;
  label: string;
  handName?: string;
  isWinner?: boolean;
  showTrail?: boolean;
}

export function Hand({ 
  cards, 
  heldCards, 
  isRevealed, 
  onCardClick, 
  disabled,
  label,
  handName,
  isWinner,
  showTrail = false
}: HandProps) {
  return (
    <div className={cn(
      'flex flex-col items-center gap-2 sm:gap-3',
      isWinner && 'animate-win-pulse'
    )}>
      <h3 className="text-sm sm:text-lg font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </h3>
      
      {/* Card container with tighter gap on mobile */}
      <div className="flex gap-1 xs:gap-1.5 sm:gap-2 md:gap-3">
        {cards.map((card, index) => (
          <PlayingCard
            key={card.id}
            card={card}
            isHeld={heldCards.has(index)}
            isRevealed={isRevealed}
            onClick={() => onCardClick?.(index)}
            disabled={disabled}
            dealDelay={index * 100}
            showTrail={showTrail}
          />
        ))}
      </div>

      {handName && (
        <div className={cn(
          'text-sm sm:text-lg font-bold mt-1 sm:mt-2 px-3 sm:px-4 py-0.5 sm:py-1 rounded-full',
          isWinner 
            ? 'bg-primary/20 text-casino-gold casino-glow' 
            : 'bg-muted text-muted-foreground'
        )}>
          {handName}
        </div>
      )}
    </div>
  );
}
