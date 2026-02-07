import { cn } from '@/lib/utils';
import { TubeState, MAX_TUBES, getTubeDisplayName } from '@/utils/tubes';

interface TubeGaugeProps {
  tubes: TubeState;
  highlightedTube?: keyof TubeState | null;
  isDraining?: boolean;
  horizontal?: boolean;
}

export function TubeGauge({ tubes, highlightedTube, isDraining, horizontal }: TubeGaugeProps) {
  const tubeKeys: (keyof TubeState)[] = ['straight', 'flush', 'fullHouse', 'straightFlush', 'royalFlush'];

  if (horizontal) {
    // Mobile horizontal layout
    return (
      <div className="bg-card/50 rounded-xl p-3 border border-border">
        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">
          Stack Tubes
        </h3>
        
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tubeKeys.map((key) => {
            const value = tubes[key];
            const maxValue = MAX_TUBES[key];
            const percentage = (value / maxValue) * 100;
            const isEmpty = value === 0;
            const isHighlighted = highlightedTube === key;

            return (
              <div 
                key={key}
                className={cn(
                  'flex flex-col items-center gap-1 min-w-[50px] transition-all duration-300',
                  isHighlighted && isDraining && 'animate-tube-drain'
                )}
              >
                {/* Vertical tube bar */}
                <div className="w-6 h-16 bg-muted rounded-full overflow-hidden relative flex flex-col-reverse">
                  <div 
                    className={cn(
                      'w-full transition-all duration-500 rounded-full',
                      isEmpty 
                        ? 'bg-destructive/30' 
                        : 'bg-gradient-to-t from-casino-gold-dim via-casino-gold to-casino-gold-dim',
                      isHighlighted && !isEmpty && 'tube-glow'
                    )}
                    style={{ height: `${percentage}%` }}
                  />
                </div>
                
                <span className={cn(
                  'text-[10px] font-bold tabular-nums',
                  isEmpty ? 'text-destructive' : 'text-foreground',
                  isHighlighted && !isEmpty && 'text-casino-gold'
                )}>
                  {value}
                </span>
                
                <span className={cn(
                  'text-[8px] font-medium text-center leading-tight',
                  isEmpty ? 'text-destructive' : 'text-muted-foreground',
                  isHighlighted && 'text-casino-gold'
                )}>
                  {getTubeDisplayName(key).split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop vertical list layout
  return (
    <div className="bg-card/50 rounded-xl p-4 border border-border">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">
        Stack Tubes
      </h3>
      
      <div className="flex flex-col gap-3">
        {tubeKeys.map((key) => {
          const value = tubes[key];
          const maxValue = MAX_TUBES[key];
          const percentage = (value / maxValue) * 100;
          const isEmpty = value === 0;
          const isHighlighted = highlightedTube === key;

          return (
            <div 
              key={key}
              className={cn(
                'flex items-center gap-3 transition-all duration-300',
                isHighlighted && isDraining && 'animate-tube-drain'
              )}
            >
              <span className={cn(
                'text-xs font-medium w-20 text-right transition-colors',
                isEmpty ? 'text-destructive' : 'text-muted-foreground',
                isHighlighted && 'text-casino-gold'
              )}>
                {getTubeDisplayName(key)}
              </span>
              
              <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden relative">
                <div 
                  className={cn(
                    'h-full transition-all duration-500 rounded-full',
                    isEmpty 
                      ? 'bg-destructive/30' 
                      : 'bg-gradient-to-r from-casino-gold-dim via-casino-gold to-casino-gold-dim',
                    isHighlighted && !isEmpty && 'tube-glow'
                  )}
                  style={{ width: `${percentage}%` }}
                />
                
                {/* Tick marks */}
                <div className="absolute inset-0 flex justify-between px-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="w-px h-full bg-background/20"
                    />
                  ))}
                </div>
              </div>
              
              <span className={cn(
                'text-xs font-bold w-8 text-left tabular-nums',
                isEmpty ? 'text-destructive' : 'text-foreground',
                isHighlighted && !isEmpty && 'text-casino-gold'
              )}>
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
