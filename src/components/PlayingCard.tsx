import { useState, useEffect } from 'react';
import { Card as CardType, getSuitSymbol, getSuitColor } from '@/utils/deck';
import { cn } from '@/lib/utils';

interface PlayingCardProps {
  card: CardType;
  isHeld: boolean;
  isRevealed: boolean;
  onClick?: () => void;
  disabled?: boolean;
  dealDelay?: number;
  showTrail?: boolean;
}

export function PlayingCard({ 
  card, 
  isHeld, 
  isRevealed, 
  onClick, 
  disabled,
  dealDelay = 0,
  showTrail = false
}: PlayingCardProps) {
  const [isFlipped, setIsFlipped] = useState(!isRevealed);
  const [isDealt, setIsDealt] = useState(false);
  const [showDealTrail, setShowDealTrail] = useState(false);

  useEffect(() => {
    // Show trail effect during deal
    if (showTrail) {
      setShowDealTrail(true);
      const trailTimer = setTimeout(() => {
        setShowDealTrail(false);
      }, dealDelay + 400);
      return () => clearTimeout(trailTimer);
    }
  }, [showTrail, dealDelay]);

  useEffect(() => {
    const dealTimer = setTimeout(() => {
      setIsDealt(true);
    }, dealDelay);

    return () => clearTimeout(dealTimer);
  }, [dealDelay]);

  useEffect(() => {
    if (isRevealed && isFlipped) {
      const flipTimer = setTimeout(() => {
        setIsFlipped(false);
      }, dealDelay + 100);
      return () => clearTimeout(flipTimer);
    }
  }, [isRevealed, dealDelay]);

  const suitSymbol = getSuitSymbol(card.suit);
  const suitColor = getSuitColor(card.suit);

  return (
    <div 
      className={cn(
        'relative cursor-pointer transition-all duration-300',
        isDealt ? 'opacity-100' : 'opacity-0 translate-y-8 -translate-x-20 rotate-[-15deg]',
        !disabled && 'hover:scale-105 active:scale-95'
      )}
      onClick={!disabled ? onClick : undefined}
      style={{ transitionDelay: `${dealDelay}ms` }}
    >
      {/* Card trail effect */}
      {showDealTrail && (
        <>
          <div 
            className="absolute inset-0 opacity-30 blur-sm animate-trail-1"
            style={{ animationDelay: `${dealDelay}ms` }}
          >
            <div className="w-full h-full rounded-lg bg-gradient-to-br from-primary/50 to-primary/20" />
          </div>
          <div 
            className="absolute inset-0 opacity-20 blur-md animate-trail-2"
            style={{ animationDelay: `${dealDelay + 50}ms` }}
          >
            <div className="w-full h-full rounded-lg bg-gradient-to-br from-primary/40 to-primary/10" />
          </div>
          <div 
            className="absolute inset-0 opacity-10 blur-lg animate-trail-3"
            style={{ animationDelay: `${dealDelay + 100}ms` }}
          >
            <div className="w-full h-full rounded-lg bg-primary/30" />
          </div>
        </>
      )}
      {/* Hold indicator - mobile friendly */}
      {isHeld && (
        <div className="absolute -top-5 sm:-top-6 left-1/2 -translate-x-1/2 z-10">
          <span className="text-[10px] sm:text-xs font-bold text-casino-gold uppercase tracking-wider bg-background/90 px-1.5 sm:px-2 py-0.5 rounded border border-primary/50">
            HOLD
          </span>
        </div>
      )}
      
      <div 
        className={cn(
          'perspective-1000',
          // Responsive card sizes - larger on mobile for easier touch
          'w-[58px] h-[82px] xs:w-[64px] xs:h-[90px] sm:w-20 sm:h-28 md:w-24 md:h-32',
          isHeld && 'ring-2 ring-primary ring-offset-1 sm:ring-offset-2 ring-offset-background rounded-lg shadow-lg shadow-primary/30'
        )}
      >
        <div 
          className={cn(
            'relative w-full h-full preserve-3d transition-transform duration-500',
            isFlipped && 'rotate-y-180'
          )}
        >
          {/* Card Front - Premium design */}
          <div 
            className={cn(
              'absolute inset-0 backface-hidden rounded-lg',
              'bg-gradient-to-br from-[#faf9f6] via-[#f5f3ef] to-[#ebe8e2]',
              'flex flex-col justify-between p-1 sm:p-1.5 md:p-2',
              'border border-border/50',
              'shadow-md'
            )}
          >
            {/* Top left corner */}
            <div className={cn(
              'text-sm sm:text-base md:text-lg font-bold leading-none',
              suitColor === 'red' ? 'text-casino-red' : 'text-gray-800'
            )}>
              <div className="flex flex-col items-start">
                <span>{card.rank}</span>
                <span className="text-xs sm:text-sm md:text-base -mt-0.5">{suitSymbol}</span>
              </div>
            </div>
            
            {/* Center suit - large */}
            <div className={cn(
              'text-2xl sm:text-3xl md:text-4xl text-center leading-none',
              suitColor === 'red' ? 'text-casino-red' : 'text-gray-800'
            )}>
              {suitSymbol}
            </div>
            
            {/* Bottom right corner - rotated */}
            <div className={cn(
              'text-sm sm:text-base md:text-lg font-bold text-right rotate-180 leading-none',
              suitColor === 'red' ? 'text-casino-red' : 'text-gray-800'
            )}>
              <div className="flex flex-col items-start">
                <span>{card.rank}</span>
                <span className="text-xs sm:text-sm md:text-base -mt-0.5">{suitSymbol}</span>
              </div>
            </div>
          </div>

          {/* Card Back - Premium casino design */}
          <div 
            className={cn(
              'absolute inset-0 backface-hidden rounded-lg rotate-y-180',
              'bg-gradient-to-br from-[#1a365d] via-[#2c5282] to-[#1a365d]',
              'border border-[#4a5568]',
              'flex items-center justify-center',
              'shadow-md'
            )}
          >
            <div className="w-[85%] h-[85%] rounded border border-[#4a5568]/50 bg-gradient-to-br from-[#2d3748] to-[#1a202c] flex items-center justify-center">
              <div className="text-[#4a5568] text-lg sm:text-xl md:text-2xl font-bold opacity-50">
                ♠♦
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
