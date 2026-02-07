import { Challenge } from '@/hooks/useDailyChallenges';
import { Button } from '@/components/ui/button';
import { Trophy, Gift, Check, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
interface DailyChallengesProps {
  challenges: Challenge[];
  currentStreak: number;
  onClaimReward: (challengeId: string) => void;
}
export function DailyChallenges({
  challenges,
  currentStreak,
  onClaimReward
}: DailyChallengesProps) {
  const completedCount = challenges.filter(c => c.completed).length;
  const claimedCount = challenges.filter(c => c.claimed).length;
  return <div className="bg-card/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border mx-2 sm:mx-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-casino-gold" />
          <h3 className="font-bold text-foreground">Daily Challenges</h3>
        </div>
        <div className="text-xs text-primary">
          {completedCount}/{challenges.length} Complete
        </div>
      </div>

      {/* Current Streak */}
      {currentStreak > 0 && <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-accent/20 border border-accent/30">
          <Flame className="h-4 w-4 text-accent" />
          <span className="text-sm text-accent font-medium">
            {currentStreak} Win Streak!
          </span>
        </div>}

      {/* Challenges List */}
      <div className="space-y-3">
        {challenges.map(challenge => {
        const targetNum = typeof challenge.target === 'number' ? challenge.target : 1;
        const progressPercent = typeof challenge.target === 'string' ? challenge.completed ? 100 : 0 : Math.min(challenge.progress / targetNum * 100, 100);
        return <div key={challenge.id} className={cn('p-3 rounded-lg border transition-all', challenge.claimed ? 'bg-muted/30 border-muted opacity-60' : challenge.completed ? 'bg-casino-gold/10 border-casino-gold/30' : 'bg-muted/50 border-border')}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">
                      {challenge.title}
                    </span>
                    {challenge.claimed && <Check className="h-4 w-4 text-secondary shrink-0" />}
                  </div>
                  <p className="text-xs mt-0.5 text-secondary-foreground">
                    {challenge.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Gift className="h-3 w-3 text-casino-gold" />
                  <span className="text-xs font-bold text-casino-gold">
                    +{challenge.reward}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-2">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={cn('h-full transition-all duration-500', challenge.completed ? 'bg-casino-gold' : 'bg-accent')} style={{
                width: `${progressPercent}%`
              }} />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    {typeof challenge.target === 'string' ? challenge.completed ? 'Done!' : 'Not yet' : `${challenge.progress}/${targetNum}`}
                  </span>
                  {challenge.completed && !challenge.claimed && <Button size="sm" onClick={() => onClaimReward(challenge.id)} className="h-6 px-2 text-xs bg-casino-gold hover:bg-casino-gold/90 text-primary-foreground">
                      Claim
                    </Button>}
                </div>
              </div>
            </div>;
      })}
      </div>

      {/* All Claimed Message */}
      {claimedCount === challenges.length && <p className="text-center text-xs text-muted-foreground mt-4">
          All challenges completed! Come back tomorrow for more.
        </p>}
    </div>;
}