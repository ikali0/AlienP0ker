import { cn } from '@/lib/utils';
interface StatsPanelProps {
  handsPlayed: number;
  wins: number;
  losses: number;
  busts: number;
  totalWagered: number;
  totalWon: number;
}
export function StatsPanel({
  handsPlayed,
  wins,
  losses,
  busts,
  totalWagered,
  totalWon
}: StatsPanelProps) {
  const returnPercent = totalWagered > 0 ? (totalWon / totalWagered * 100).toFixed(1) : '0.0';
  const stats = [{
    label: 'Hands',
    value: handsPlayed,
    color: 'text-foreground'
  }, {
    label: 'Wins',
    value: wins,
    color: 'text-accent'
  }, {
    label: 'Losses',
    value: losses,
    color: 'text-muted-foreground'
  }, {
    label: 'Busts',
    value: busts,
    color: 'text-destructive'
  }];
  return <div className="bg-card/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border mx-2 sm:mx-0 px-[11px] py-[11px]">
      <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-center text-primary">
        Statistics
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({
        label,
        value,
        color
      }) => <div key={label} className="text-center">
            <div className={cn("text-small font-bold tabular-nums text-purple-300", color)}>
              {value}
            </div>
            <div className="text-xs text-muted-foreground uppercase">
              {label}
            </div>
          </div>)}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className={cn('text-2xl font-bold tabular-nums', Number(returnPercent) >= 100 ? 'text-accent' : 'text-foreground')}>
            {returnPercent}%
          </div>
          <div className="text-xs text-muted-foreground uppercase">
            Return Rate
          </div>
        </div>
      </div>
    </div>;
}