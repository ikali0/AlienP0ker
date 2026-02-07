/**
 * Tube Dashboard Component
 * Visual tube meters with animated fill levels
 */

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Zap, TrendingUp, AlertTriangle } from 'lucide-react';

interface TubeDashboardProps {
  balances: Record<string, number>;
  highlightedTube?: string | null;
  vertical?: boolean;
  maxValues?: Record<string, number>;
}

const tubeConfig: Record<string, { label: string; colorClass: string; max: number }> = {
  ST: { label: 'Straight', colorClass: 'bg-accent', max: 10 },
  FL: { label: 'Flush', colorClass: 'bg-secondary', max: 20 },
  FH: { label: 'Full House', colorClass: 'bg-primary/70', max: 30 },
  SF: { label: 'Str. Flush', colorClass: 'bg-primary', max: 40 },
  RF: { label: 'Royal', colorClass: 'bg-destructive', max: 50 },
};

export function TubeDashboard({
  balances,
  highlightedTube,
  vertical = false,
  maxValues,
}: TubeDashboardProps) {
  const tubes = Object.entries(tubeConfig);

  return (
    <div className={cn(
      'p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border',
      vertical ? 'space-y-3' : 'flex gap-4'
    )}>
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
        Stack Tubes
      </div>

      {tubes.map(([key, config]) => {
        const balance = balances[key] ?? 0;
        const max = maxValues?.[key] ?? config.max;
        const fillPercent = Math.min(100, (balance / max) * 100);
        const isHighlighted = highlightedTube === key;
        const isEmpty = balance === 0;
        const isLow = balance > 0 && balance <= 2;

        return (
          <motion.div
            key={key}
            animate={isHighlighted ? { scale: 1.05 } : { scale: 1 }}
            className={cn(
              'relative',
              vertical ? 'flex items-center gap-3' : 'flex flex-col items-center gap-2'
            )}
          >
            {/* Tube Container */}
            <div className={cn(
              'relative overflow-hidden rounded-full bg-muted/50 border',
              vertical ? 'w-full h-6' : 'w-6 h-24',
              isHighlighted ? 'border-primary shadow-lg shadow-primary/30' : 'border-border/50',
              isEmpty && 'border-destructive/50'
            )}>
              {/* Fill Level */}
              <motion.div
                initial={false}
                animate={{
                  [vertical ? 'width' : 'height']: `${fillPercent}%`,
                }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={cn(
                  'absolute',
                  config.colorClass,
                  vertical ? 'left-0 top-0 bottom-0' : 'bottom-0 left-0 right-0',
                  isHighlighted && 'animate-pulse'
                )}
              />

              {/* Empty Warning */}
              {isEmpty && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <AlertTriangle className="w-3 h-3 text-destructive" />
                </div>
              )}

              {/* Low Warning */}
              {isLow && !isEmpty && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-primary" />
                </div>
              )}
            </div>

            {/* Label & Value */}
            <div className={cn(
              'text-center',
              vertical && 'flex-1 flex items-center justify-between'
            )}>
              <span className={cn(
                'text-[10px] uppercase tracking-wider',
                isEmpty ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {config.label}
              </span>
              <motion.span
                key={balance}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className={cn(
                  'font-bold text-sm',
                  isEmpty ? 'text-destructive' : isHighlighted ? 'text-primary' : 'text-foreground'
                )}
              >
                {balance}
              </motion.span>
            </div>

            {/* Highlight Glow */}
            <AnimatePresence>
              {isHighlighted && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background pointer-events-none"
                />
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* Total Indicator */}
      <div className={cn(
        'pt-2 mt-2 border-t border-border',
        'flex items-center justify-between text-xs'
      )}>
        <span className="text-muted-foreground">Total Pool</span>
        <span className="font-bold text-primary flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          {Object.values(balances).reduce((a, b) => a + b, 0)}
        </span>
      </div>
    </div>
  );
}
