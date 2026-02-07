/**
 * Game Controls Panel
 * Premium action buttons and game controls
 */

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Play, 
  RefreshCw, 
  Pause, 
  SkipForward, 
  Settings,
  Volume2,
  VolumeX,
  Coins,
  Zap,
} from 'lucide-react';

interface GameControlsPanelProps {
  phase: string;
  credits: number;
  ante: number;
  canAffordAnte: boolean;
  isSimulating: boolean;
  soundEnabled: boolean;
  onDeal: () => void;
  onDraw: () => void;
  onNewHand: () => void;
  onReset: () => void;
  onToggleSound: () => void;
  onOpenSettings?: () => void;
  onQuickSimulation?: () => void;
}

export function GameControlsPanel({
  phase,
  credits,
  ante,
  canAffordAnte,
  isSimulating,
  soundEnabled,
  onDeal,
  onDraw,
  onNewHand,
  onReset,
  onToggleSound,
  onOpenSettings,
  onQuickSimulation,
}: GameControlsPanelProps) {
  const renderMainAction = () => {
    if (isSimulating) {
      return (
        <Button disabled size="lg" className="min-w-32">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          Simulating...
        </Button>
      );
    }

    switch (phase) {
      case 'betting':
      case 'waiting':
        return (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={onDeal}
              disabled={!canAffordAnte}
              size="lg"
              className={cn(
                'min-w-32 bg-gradient-to-r from-primary to-primary/80',
                'hover:from-primary/90 hover:to-primary/70',
                'shadow-lg shadow-primary/30'
              )}
            >
              <Play className="w-4 h-4 mr-2" />
              Deal ({ante})
            </Button>
          </motion.div>
        );

      case 'holding':
      case 'hold':
        return (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={onDraw}
              size="lg"
              className={cn(
                'min-w-32 bg-gradient-to-r from-accent to-accent/80',
                'hover:from-accent/90 hover:to-accent/70',
                'shadow-lg shadow-accent/30'
              )}
            >
              <SkipForward className="w-4 h-4 mr-2" />
              Draw
            </Button>
          </motion.div>
        );

      case 'showdown':
      case 'evaluate':
        return (
          <Button disabled size="lg" className="min-w-32">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Resolving...
          </Button>
        );

      case 'result':
      case 'payout':
      case 'complete':
        return (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={onNewHand}
              size="lg"
              variant="secondary"
              className="min-w-32"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              New Hand
            </Button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border">
      {/* Credits Display */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border">
          <Coins className="w-5 h-5 text-primary" />
          <motion.span
            key={credits}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-xl font-bold text-foreground"
          >
            {credits}
          </motion.span>
          <span className="text-sm text-muted-foreground">credits</span>
        </div>

        <div className="text-sm text-muted-foreground">
          Ante: <span className="font-bold text-foreground">{ante}</span>
        </div>
      </div>

      {/* Main Action */}
      <div className="flex items-center gap-3">
        {renderMainAction()}
      </div>

      {/* Secondary Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSound}
          className="h-9 w-9"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </Button>

        {onOpenSettings && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            className="h-9 w-9"
          >
            <Settings className="w-4 h-4" />
          </Button>
        )}

        {onQuickSimulation && (
          <Button
            variant="outline"
            size="sm"
            onClick={onQuickSimulation}
            className="gap-1"
          >
            <Zap className="w-3 h-3" />
            Quick Sim
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-muted-foreground hover:text-destructive"
        >
          Reset
        </Button>
      </div>

      {/* Phase Indicator */}
      <div className="text-xs text-muted-foreground uppercase tracking-wider">
        Phase: <span className="text-foreground">{phase}</span>
      </div>
    </div>
  );
}
