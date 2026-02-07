/**
 * Economic Dashboard Component
 * House edge, volatility, and exploit alerts
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Activity,
  Shield,
  Target,
  Gauge,
} from 'lucide-react';

interface EconomicDashboardProps {
  houseEdge: number;
  volatilityIndex: number;
  exploitCount: number;
  riskLevel: 'low' | 'moderate' | 'high';
  roundsCompleted: number;
  houseProfitPercent: number;
  isOptimal: boolean;
}

export function EconomicDashboard({
  houseEdge,
  volatilityIndex,
  exploitCount,
  riskLevel,
  roundsCompleted,
  houseProfitPercent,
  isOptimal,
}: EconomicDashboardProps) {
  const edgePercent = houseEdge * 100;
  const isEdgeInRange = edgePercent >= 3 && edgePercent <= 7;
  
  const riskColors = {
    low: 'text-accent',
    moderate: 'text-primary',
    high: 'text-destructive',
  };

  return (
    <div className="p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Economic Health
        </h3>
        {isOptimal ? (
          <span className="flex items-center gap-1 text-xs text-accent">
            <CheckCircle2 className="w-3 h-3" />
            Optimal
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-primary">
            <AlertTriangle className="w-3 h-3" />
            Needs Tuning
          </span>
        )}
      </div>

      {/* House Edge Gauge */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            <Target className="w-3 h-3" />
            House Edge
          </span>
          <span className={cn(
            'font-bold',
            isEdgeInRange ? 'text-accent' : 'text-primary'
          )}>
            {edgePercent.toFixed(2)}%
          </span>
        </div>
        
        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          {/* Target range indicator (3-7%) */}
          <div 
            className="absolute h-full bg-accent/20"
            style={{ left: '30%', width: '40%' }}
          />
          
          {/* Current edge marker */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(edgePercent * 10, 100)}%` }}
            className={cn(
              'h-full rounded-full',
              isEdgeInRange ? 'bg-accent' : 'bg-primary'
            )}
          />
        </div>
        
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0%</span>
          <span className="text-accent">3-7% Target</span>
          <span>10%+</span>
        </div>
      </div>

      {/* Volatility */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Volatility</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold text-foreground">
            {volatilityIndex.toFixed(2)}
          </span>
          <span className={cn('text-xs ml-2', riskColors[riskLevel])}>
            {riskLevel}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-muted/30 text-center">
          <div className="text-lg font-bold text-foreground">{roundsCompleted}</div>
          <div className="text-[10px] text-muted-foreground uppercase">Rounds</div>
        </div>
        
        <div className="p-2 rounded-lg bg-muted/30 text-center">
          <div className={cn(
            'text-lg font-bold',
            houseProfitPercent >= 0 ? 'text-accent' : 'text-destructive'
          )}>
            {houseProfitPercent >= 0 ? '+' : ''}{houseProfitPercent.toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground uppercase">House P/L</div>
        </div>
      </div>

      {/* Exploit Alerts */}
      {exploitCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-2 rounded-lg bg-destructive/10 border border-destructive/30"
        >
          <div className="flex items-center gap-2 text-xs text-destructive">
            <Shield className="w-3 h-3" />
            <span className="font-medium">
              {exploitCount} exploitable {exploitCount === 1 ? 'strategy' : 'strategies'} detected
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
