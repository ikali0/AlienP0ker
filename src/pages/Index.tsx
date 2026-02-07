import { useState, useEffect } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { useDailyChallenges } from '@/hooks/useDailyChallenges';
import { useAchievements } from '@/hooks/useAchievements';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { Hand } from '@/components/Hand';
import { TubeGauge } from '@/components/TubeGauge';
import { StatsPanel } from '@/components/StatsPanel';
import { GameControls } from '@/components/GameControls';
import { ResultOverlay } from '@/components/ResultOverlay';
import { HandRankingsPopup } from '@/components/HandRankingsPopup';
import { DailyChallenges } from '@/components/DailyChallenges';
import { AchievementsPanel } from '@/components/AchievementsPanel';
import { AchievementNotification } from '@/components/AchievementNotification';
import { cn } from '@/lib/utils';
const Index = () => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const game = useGameState();
  const challenges = useDailyChallenges();
  const achievements = useAchievements();
  const {
    playSound
  } = useSoundEffects(soundEnabled);
  const isPlayerTurn = game.phase === 'holding';
  const showHands = game.playerHand.length > 0;
  const showResults = game.phase === 'showdown' || game.phase === 'result';

  // Sound effects on phase changes
  useEffect(() => {
    if (game.phase === 'holding' && game.playerHand.length > 0) {
      // Staggered deal sounds
      game.playerHand.forEach((_, i) => {
        setTimeout(() => playSound('deal'), i * 100);
      });
    }
  }, [game.phase, game.playerHand.length]);
  useEffect(() => {
    if (game.phase === 'showdown') {
      playSound('flip');
    }
  }, [game.phase]);
  useEffect(() => {
    if (game.phase === 'result' && game.result) {
      if (game.result === 'win') {
        playSound('win');
        setTimeout(() => playSound('coins'), 300);
      } else if (game.result === 'bust') {
        playSound('bust');
      } else if (game.result === 'lose') {
        playSound('lose');
      }
    }
  }, [game.phase, game.result]);

  // Track game results for challenges and achievements
  useEffect(() => {
    if (game.phase === 'result' && game.result) {
      const isWin = game.result === 'win';
      const isBust = game.result === 'bust';
      const handRank = game.playerHandResult?.rank;
      challenges.recordHandResult(isWin, isBust, handRank);
      achievements.recordResult(isWin, isBust, handRank, game.credits);
    }
  }, [game.phase, game.result, game.playerHandResult?.rank, game.credits]);
  const handleClaimReward = (challengeId: string) => {
    const reward = challenges.claimReward(challengeId);
    if (reward > 0) {
      game.addCredits(reward);
      playSound('coins');
    }
  };
  const handleToggleHold = (index: number) => {
    game.toggleHold(index);
    playSound('hold');
  };
  return <div className={cn('min-h-screen flex flex-col', game.result === 'bust' && 'animate-bust-flash')}>
      {/* Achievement Notification */}
      <AchievementNotification achievement={achievements.newlyUnlocked} />

      {/* Header - Mobile optimized */}
      <header className="p-2 sm:p-4 border-b border-border bg-card/30">
        <div className="container max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-casino-gold tracking-wide">
            Stack Draw
          </h1>
          <div className="flex items-center gap-2 sm:gap-3">
            <AchievementsPanel achievements={achievements.achievements} unlockedCount={achievements.unlockedCount} totalCount={achievements.totalCount} />
            <HandRankingsPopup />
          </div>
        </div>
      </header>

      {/* Main Game Area - Mobile first layout */}
      <main className="flex-1 container max-w-6xl mx-auto p-2 sm:p-4 flex flex-col gap-3 sm:gap-6">
        {/* Mobile: Stack vertically, Desktop: Side by side */}
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-6 flex-1">
          
          {/* Left Sidebar - Tubes (hidden on mobile, shown at bottom) */}
          <aside className="hidden lg:block lg:w-56 shrink-0 space-y-4">
            <TubeGauge tubes={game.tubes} highlightedTube={game.highlightedTube} isDraining={game.result === 'win'} />
          </aside>

          {/* Center - Game Table */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Felt Table - More compact on mobile */}
            <div className="felt-texture rounded-2xl sm:rounded-3xl p-3 sm:p-6 md:p-10 w-full max-w-3xl border border-green-900/50 shadow-2xl bg-purple-400">
              {!showHands ? <div className="text-center py-10 sm:py-16 md:py-24">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground/80 mb-2">
                    Ready to Play?
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Tap Deal to start a new hand
                  </p>
                </div> : <div className="flex flex-col gap-4 sm:gap-8">
                  {/* Dealer Hand */}
                  <Hand cards={game.dealerHand} heldCards={game.dealerHeldCards} isRevealed={showResults} disabled label="Dealer" handName={showResults ? game.dealerHandResult?.name : undefined} isWinner={game.result === 'lose'} />

                  {/* Divider */}
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex-1 h-px bg-foreground/10" />
                    <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                      {isPlayerTurn ? 'Tap cards to hold' : 'VS'}
                    </span>
                    <div className="flex-1 h-px bg-foreground/10" />
                  </div>

                  {/* Player Hand */}
                  <Hand cards={game.playerHand} heldCards={game.playerHeldCards} isRevealed onCardClick={isPlayerTurn ? handleToggleHold : undefined} disabled={!isPlayerTurn} label="Your Hand" handName={showResults ? game.playerHandResult?.name : undefined} isWinner={game.result === 'win'} />
                </div>}
            </div>

            {/* Controls */}
            <div className="mt-4 sm:mt-8">
              <GameControls gamePhase={game.phase} onDeal={game.deal} onDraw={game.draw} onNewHand={game.newHand} onReset={game.resetGame} soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled(!soundEnabled)} credits={game.credits} ante={game.ante} canAffordAnte={game.canAffordAnte} />
            </div>
          </div>

          {/* Right Sidebar - Stats & Challenges (hidden on mobile) */}
          <aside className="hidden lg:block lg:w-56 shrink-0 space-y-4">
            <StatsPanel handsPlayed={game.stats.handsPlayed} wins={game.stats.wins} losses={game.stats.losses} busts={game.stats.busts} totalWagered={game.stats.totalWagered} totalWon={game.stats.totalWon} />
            <DailyChallenges challenges={challenges.challenges} currentStreak={challenges.currentStreak} onClaimReward={handleClaimReward} />
          </aside>
        </div>

        {/* Mobile Tubes - Horizontal scroll */}
        <div className="lg:hidden">
          <TubeGauge tubes={game.tubes} highlightedTube={game.highlightedTube} isDraining={game.result === 'win'} horizontal />
        </div>

        {/* Mobile Stats Row */}
        <div className="lg:hidden grid grid-cols-2 gap-2">
          <div className="bg-card/50 rounded-lg p-3 text-center border border-border">
            <div className="text-lg font-bold text-foreground">{game.stats.wins}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Wins</div>
          </div>
          <div className="bg-card/50 rounded-lg p-3 text-center border border-border">
            <div className="text-lg font-bold text-foreground">{game.stats.handsPlayed}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Played</div>
          </div>
        </div>

        {/* Instructions - Smaller on mobile */}
        <div className="text-center text-[10px] sm:text-xs text-muted-foreground max-w-2xl mx-auto px-2">
          <p>
            <strong>How to Play:</strong> Ante {game.ante} credits, tap cards to hold, then draw. 
            Beat the dealer to win from Stack Tubes!
          </p>
        </div>
      </main>

      {/* Result Overlay */}
      <ResultOverlay result={game.result} payout={game.payout} message={game.resultMessage} />
    </div>;
};
export default Index;