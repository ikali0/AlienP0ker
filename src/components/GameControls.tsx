import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedCredits } from './AnimatedCredits';

interface GameControlsProps {
  gamePhase: 'betting' | 'holding' | 'showdown' | 'result';
  onDeal: () => void;
  onDraw: () => void;
  onNewHand: () => void;
  onReset: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  credits: number;
  ante: number;
  canAffordAnte: boolean;
}

export function GameControls({
  gamePhase,
  onDeal,
  onDraw,
  onNewHand,
  onReset,
  soundEnabled,
  onToggleSound,
  credits,
  ante,
  canAffordAnte,
}: GameControlsProps) {
  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4">
      {/* Credit Display with Animation */}
      <div className="text-center">
        <AnimatedCredits value={credits} className="justify-center" />
        <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mt-1">
          Credits
        </div>
      </div>

      {/* Main Game Button */}
      <div className="flex gap-3">
        {gamePhase === 'betting' && (
          <Button
            onClick={onDeal}
            disabled={!canAffordAnte}
            size="lg"
            className={cn(
              'px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-bold uppercase tracking-wider',
              'bg-gradient-to-r from-casino-gold-dim via-casino-gold to-casino-gold-dim',
              'hover:brightness-110',
              'text-primary-foreground shadow-lg',
              'transition-all duration-200',
              canAffordAnte && 'casino-glow hover:casino-glow-strong'
            )}
          >
            Deal ({ante})
          </Button>
        )}

        {gamePhase === 'holding' && (
          <Button
            onClick={onDraw}
            size="lg"
            className={cn(
              'px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-bold uppercase tracking-wider',
              'bg-gradient-to-r from-accent via-secondary to-accent',
              'hover:brightness-110',
              'text-primary-foreground shadow-lg casino-glow',
              'transition-all duration-200 hover:casino-glow-strong'
            )}
          >
            Draw
          </Button>
        )}

        {gamePhase === 'result' && (
          <Button
            onClick={onNewHand}
            disabled={!canAffordAnte}
            size="lg"
            className={cn(
              'px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-bold uppercase tracking-wider',
              'bg-gradient-to-r from-casino-gold-dim via-casino-gold to-casino-gold-dim',
              'hover:brightness-110',
              'text-primary-foreground shadow-lg',
              'transition-all duration-200',
              canAffordAnte && 'casino-glow hover:casino-glow-strong'
            )}
          >
            New Hand
          </Button>
        )}
      </div>

      {/* Secondary Controls */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleSound}
          className="border-border hover:bg-muted"
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onReset}
          className="border-border hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {!canAffordAnte && gamePhase !== 'holding' && gamePhase !== 'showdown' && (
        <p className="text-destructive text-sm">
          Not enough credits! Reset to continue.
        </p>
      )}
    </div>
  );
}
