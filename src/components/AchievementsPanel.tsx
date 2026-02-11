import { Achievement } from '@/hooks/useAchievements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger } from
'@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AchievementsPanelProps {
  achievements: Achievement[];
  unlockedCount: number;
  totalCount: number;
}

export function AchievementsPanel({
  achievements,
  unlockedCount,
  totalCount
}: AchievementsPanelProps) {
  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const lockedAchievements = achievements.filter((a) => !a.unlocked);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-border hover:bg-muted">
          <Trophy className="h-4 w-4 text-casino-gold" />
          <span className="font-medium text-xs">{unlockedCount}/{totalCount}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Trophy className="h-5 w-5 text-casino-gold" />
            Achievements ({unlockedCount}/{totalCount})
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-3">
            {/* Unlocked */}
            {unlockedAchievements.length > 0 &&
            <div className="space-y-2">
                <h4 className="text-sm font-semibold text-casino-gold">Unlocked</h4>
                {unlockedAchievements.map((achievement) =>
              <AchievementCard key={achievement.id} achievement={achievement} />
              )}
              </div>
            }
            
            {/* Locked */}
            {lockedAchievements.length > 0 &&
            <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">Locked</h4>
                {lockedAchievements.map((achievement) =>
              <AchievementCard key={achievement.id} achievement={achievement} />
              )}
              </div>
            }
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>);

}

function AchievementCard({ achievement }: {achievement: Achievement;}) {
  const hasProgress = achievement.target && achievement.target > 0;
  const progressPercent = hasProgress ?
  Math.min((achievement.progress || 0) / achievement.target! * 100, 100) :
  0;

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg border transition-all',
      achievement.unlocked ?
      'bg-primary/10 border-primary/30' :
      'bg-muted/30 border-border opacity-60'
    )}>
      <div className={cn(
        'text-2xl w-10 h-10 flex items-center justify-center rounded-lg',
        achievement.unlocked ? 'bg-primary/20' : 'bg-muted grayscale'
      )}>
        {achievement.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h5 className={cn(
          'font-semibold text-sm truncate',
          achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {achievement.name}
        </h5>
        <p className="text-xs text-muted-foreground truncate">
          {achievement.description}
        </p>
        {hasProgress && !achievement.unlocked &&
        <div className="mt-1.5">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
              className="h-full bg-primary/60 transition-all duration-300"
              style={{ width: `${progressPercent}%` }} />

            </div>
            <span className="text-[10px] text-muted-foreground">
              {achievement.progress || 0}/{achievement.target}
            </span>
          </div>
        }
      </div>
      {achievement.unlocked &&
      <div className="text-casino-gold text-lg">✓</div>
      }
    </div>);

}