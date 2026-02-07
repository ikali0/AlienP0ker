/**
 * Tube Poker Game Page
 * Premium casino-style game with full engine integration
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GameTable, 
  TubeDashboard, 
  GameControlsPanel, 
  EconomicDashboard 
} from '@/components/game';
import { SimulationPanel } from '@/components/SimulationPanel';
import { HandRankingsPopup } from '@/components/HandRankingsPopup';
import { createGameOrchestrator, GameOrchestrator } from '@/orchestrator';
import { DEFAULT_ENGINE_CONFIG, TubeBalances } from '@/engine/types';
import { analyzeLedger } from '@/engine/houseLedger';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
  BarChart3, 
  Play, 
  Trophy,
  Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GamePage() {
  // Core game state
  const [orchestrator] = useState(() => createGameOrchestrator());
  const [gameState, setGameState] = useState(orchestrator.getState());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('game');
  
  // Derived state
  const round = gameState.currentRound;
  const ledger = gameState.houseLedger;
  const ledgerAnalytics = analyzeLedger(ledger);
  
  // Subscribe to engine events
  useEffect(() => {
    const unsubscribe = orchestrator.addEventListener((event) => {
      console.log('[Engine Event]', event.type, event.data);
      setGameState(orchestrator.getState());
    });
    
    return unsubscribe;
  }, [orchestrator]);
  
  // Game actions
  const handleDeal = useCallback(() => {
    orchestrator.startRound();
    orchestrator.collectAntes();
    orchestrator.dealCards();
    setGameState(orchestrator.getState());
  }, [orchestrator]);
  
  const handleDraw = useCallback(() => {
    orchestrator.applyHTDecisions();
    orchestrator.executeDraw();
    orchestrator.evaluateHands();
    
    // Delay resolution for dramatic effect
    setTimeout(() => {
      orchestrator.resolveOutcomes();
      orchestrator.completeRound();
      setGameState(orchestrator.getState());
    }, 1500);
    
    setGameState(orchestrator.getState());
  }, [orchestrator]);
  
  const handleNewHand = useCallback(() => {
    setGameState(orchestrator.getState());
  }, [orchestrator]);
  
  const handleReset = useCallback(() => {
    // Create new orchestrator instance for clean reset
    window.location.reload();
  }, []);
  
  // Get current tube balances
  const tubeBalances: Record<string, number> = round?.tubeBalances 
    ? { ...round.tubeBalances }
    : {
        ST: DEFAULT_ENGINE_CONFIG.tubes.ST.initial,
        FL: DEFAULT_ENGINE_CONFIG.tubes.FL.initial,
        FH: DEFAULT_ENGINE_CONFIG.tubes.FH.initial,
        SF: DEFAULT_ENGINE_CONFIG.tubes.SF.initial,
        RF: DEFAULT_ENGINE_CONFIG.tubes.RF.initial,
      };
  
  // Calculate player credits (simplified - sum of all players)
  const totalPlayerCredits = round?.participants.reduce((sum, p) => sum + p.credits, 0) || 4000;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-casino-gold tracking-wide">
              Tube Poker
            </h1>
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">Round {ledger.roundsPlayed}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30">
              <Coins className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">{totalPlayerCredits}</span>
            </div>
            <HandRankingsPopup />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
            <TabsTrigger value="game" className="gap-2">
              <Play className="w-4 h-4" />
              <span className="hidden sm:inline">Play</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="simulation" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Simulation</span>
            </TabsTrigger>
          </TabsList>

          {/* Game Tab */}
          <TabsContent value="game" className="space-y-6">
            <div className="grid lg:grid-cols-[1fr_280px] gap-6">
              {/* Game Table Area */}
              <div className="space-y-6">
                <GameTable
                  dealer={round?.dealer || null}
                  players={round?.participants || []}
                  tubeBalances={tubeBalances}
                  phase={round?.phase || 'waiting'}
                  playPot={round?.playPot || 0}
                  showCards={round?.phase === 'showdown' || round?.phase === 'payout' || round?.phase === 'complete'}
                  highlightedTube={null}
                />
                
                <GameControlsPanel
                  phase={round?.phase || 'waiting'}
                  credits={totalPlayerCredits}
                  ante={DEFAULT_ENGINE_CONFIG.ante}
                  canAffordAnte={totalPlayerCredits >= DEFAULT_ENGINE_CONFIG.ante}
                  isSimulating={false}
                  soundEnabled={soundEnabled}
                  onDeal={handleDeal}
                  onDraw={handleDraw}
                  onNewHand={handleNewHand}
                  onReset={handleReset}
                  onToggleSound={() => setSoundEnabled(!soundEnabled)}
                />
              </div>

              {/* Right Sidebar */}
              <aside className="space-y-4">
                <TubeDashboard
                  balances={tubeBalances}
                  vertical
                />
                
                <EconomicDashboard
                  houseEdge={ledgerAnalytics.houseEdge}
                  volatilityIndex={0}
                  exploitCount={0}
                  riskLevel="moderate"
                  roundsCompleted={ledger.roundsPlayed}
                  houseProfitPercent={ledgerAnalytics.houseEdgePercent}
                  isOptimal={ledgerAnalytics.isHealthy}
                />
              </aside>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* House Stats */}
              <div className="p-4 rounded-xl bg-card border border-border">
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4">House Performance</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Ante Collected</span>
                    <span className="font-bold text-foreground">{ledger.totalAnteCollected}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Payouts</span>
                    <span className="font-bold text-foreground">{ledger.totalPayoutsGiven}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Bust Penalties</span>
                    <span className="font-bold text-foreground">{ledger.totalBustPenaltiesCollected}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="text-sm font-bold text-muted-foreground">Net Profit</span>
                    <span className={cn(
                      'font-bold',
                      ledger.netProfit >= 0 ? 'text-accent' : 'text-destructive'
                    )}>
                      {ledger.netProfit >= 0 ? '+' : ''}{ledger.netProfit}
                    </span>
                  </div>
                </div>
              </div>

              {/* Round History */}
              <div className="p-4 rounded-xl bg-card border border-border">
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4">Recent Rounds</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {gameState.roundHistory.slice(-10).reverse().map((r, i) => (
                    <div 
                      key={r.roundNumber}
                      className="flex justify-between text-sm p-2 rounded bg-muted/30"
                    >
                      <span className="text-muted-foreground">Round {r.roundNumber}</span>
                      <span className="text-foreground">Pot: {r.anteCollected}</span>
                    </div>
                  ))}
                  {gameState.roundHistory.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No rounds played yet
                    </p>
                  )}
                </div>
              </div>

              {/* Tube Performance */}
              <div className="p-4 rounded-xl bg-card border border-border">
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4">Tube Stats</h3>
                <TubeDashboard
                  balances={tubeBalances}
                  vertical
                />
              </div>
            </div>
          </TabsContent>

          {/* Simulation Tab */}
          <TabsContent value="simulation">
            <SimulationPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
