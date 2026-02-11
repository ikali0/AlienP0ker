import { useState, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import { useDailyChallenges } from '../hooks/useDailyChallenges';
import { useAchievements } from '../hooks/useAchievements';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { Hand } from '../components/Hand';
import { TubeGauge } from '../components/TubeGauge';
import { StatsPanel } from '../components/StatsPanel';
import { GameControls } from '../components/GameControls';
import { ResultOverlay } from '../components/ResultOverlay';
import { HandRankingsPopup } from '../components/HandRankingsPopup';
import { DailyChallenges } from '../components/DailyChallenges';
import { AchievementsPanel } from '../components/AchievementsPanel';
import { AchievementNotification } from '../components/AchievementNotification';
import { Particles } from '../components/Particles';
import { cn } from '../lib/utils';
const Index = () => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showWinParticles, setShowWinParticles] = useState(false);
  const [showBustParticles, setShowBustParticles] = useState(false);
  const [showCardTrails, setShowCardTrails] = useState(false);
  const game = useGameState();
  const challenges = useDailyChallenges();
  const achievements = useAchievements();
  const {
    playSound
  } = useSoundEffects(soundEnabled);
  const isPlayerTurn = game.phase === 'holding';
  const showHands = game.playerHand.length > 0;
  const showResults = game.phase === 'showdown' || game.phase === 'result';

  /* =========================
     Phase: Deal Animation
  ========================= */
  useEffect(() => {
    if (game.phase === 'holding' && game.playerHand.length > 0) {
      setShowCardTrails(true);
      const timeout = setTimeout(() => setShowCardTrails(false), 800);
      game.playerHand.forEach((_, i) => {
        setTimeout(() => playSound('deal'), i * 100);
      });
      return () => clearTimeout(timeout);
    }
  }, [game.phase, game.playerHand, playSound]);

  /* =========================
     Phase: Showdown Sound
  ========================= */
  useEffect(() => {
    if (game.phase === 'showdown') {
      playSound('flip');
    }
  }, [game.phase, playSound]);

  /* =========================
     Phase: Result Effects
  ========================= */
  useEffect(() => {
    if (game.phase === 'result' && game.result) {
      if (game.result === 'win') {
        playSound('win');
        setShowWinParticles(true);
        const timeout = setTimeout(() => {
          playSound('coins');
          setShowWinParticles(false);
        }, 300);
        return () => clearTimeout(timeout);
      }
      if (game.result === 'bust') {
        playSound('bust');
        setShowBustParticles(true);
        const timeout = setTimeout(() => setShowBustParticles(false), 500);
        return () => clearTimeout(timeout);
      }
      if (game.result === 'lose') {
        playSound('lose');
      }
    }
  }, [game.phase, game.result, playSound]);

  /* =========================
     Track Challenges + Achievements
  ========================= */
  useEffect(() => {
    if (game.phase === 'result' && game.result) {
      const isWin = game.result === 'win';
      const isBust = game.result === 'bust';
      const handRank = game.playerHandResult?.rank;
      challenges.recordHandResult(isWin, isBust, handRank);
      achievements.recordResult(isWin, isBust, handRank, game.credits);
    }
  }, [game.phase, game.result, game.playerHandResult, game.credits, challenges, achievements]);
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
      {/* Particle Effects */}
      <Particles trigger={showWinParticles} type="win" />
      <Particles trigger={showBustParticles} type="bust" />

      {/* Achievement Notification */}
      <AchievementNotification achievement={achievements.newlyUnlocked} />

      {/* Header */}
      <header className="p-4 border-b border-border bg-card/30">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center sm:items-start justify-between px-[8px] gap-[7px]">
          <h1 className="font-bold tracking-wide text-lg text-purple-400">Alien Poker

        </h1>

          <div className="gap-1.5 flex items-start justify-center">
            <AchievementsPanel achievements={achievements.achievements} unlockedCount={achievements.unlockedCount} totalCount={achievements.totalCount} />
            <HandRankingsPopup />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 container max-w-6xl mx-auto p-4 flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row gap-6 flex-1">
          {/* Tubes */}
          <aside className="">
            <TubeGauge tubes={game.tubes} highlightedTube={game.highlightedTube} isDraining={game.result === 'win'} />
          </aside>

          {/* Table */}
          <div className="flex-1 h-full flex flex-col items-center justify-center">
            <div className="felt-texture p-8 w-full max-w-3xl border px-[16px] py-[16px] rounded-sm border-dashed shadow-sm border-fuchsia-500">
              {!showHands ? <div className="text-center py-24">
                  <h2 className="text-3xl font-bold mb-2 text-popover-foreground">
                    Ready to Play?
                  </h2>
                  <p className="text-destructive-foreground text-sm">
                    Tap Deal to start a new hand
                  </p>
                </div> : <div className="flex flex-col gap-8">
                  <Hand cards={game.dealerHand} heldCards={game.dealerHeldCards} isRevealed={showResults} disabled label="Dealer" handName={showResults ? game.dealerHandResult?.name : undefined} isWinner={game.result === 'lose'} showTrail={showCardTrails} />

                  <Hand cards={game.playerHand} heldCards={game.playerHeldCards} isRevealed onCardClick={isPlayerTurn ? handleToggleHold : undefined} disabled={!isPlayerTurn} label="Your Hand" handName={showResults ? game.playerHandResult?.name : undefined} isWinner={game.result === 'win'} showTrail={showCardTrails} />
                </div>}
            </div>

            <div className="mt-8">
              <GameControls gamePhase={game.phase} onDeal={game.deal} onDraw={game.draw} onNewHand={game.newHand} onReset={game.resetGame} soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled(!soundEnabled)} credits={game.credits} ante={game.ante} canAffordAnte={game.canAffordAnte} />
            </div>
          </div>

          {/* Stats */}
          <aside className="hidden lg:block lg:w-56 space-y-4">
            <StatsPanel handsPlayed={game.stats.handsPlayed} wins={game.stats.wins} losses={game.stats.losses} busts={game.stats.busts} totalWagered={game.stats.totalWagered} totalWon={game.stats.totalWon} />
            <DailyChallenges challenges={challenges.challenges} currentStreak={challenges.currentStreak} onClaimReward={handleClaimReward} />
          </aside>
        </div>
      </main>

      <ResultOverlay result={game.result} payout={game.payout} message={game.resultMessage} />
    </div>;
};
export default Index;