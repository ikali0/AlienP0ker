import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  runSimulation, 
  generateReport, 
  SimulationConfig, 
  SimulationResult,
  DEFAULT_CONFIG,
} from '@/simulation';
import { Play, RotateCcw, BarChart3 } from 'lucide-react';

interface SimulationPanelProps {
  onClose?: () => void;
}

export function SimulationPanel({ onClose }: SimulationPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SimulationResult | null>(null);
  
  // Configuration state
  const [config, setConfig] = useState<Partial<SimulationConfig>>({
    roundsPerRun: 10000,
    playerCount: 4,
    ante: 5,
    initSTTube: 5,
    initFLTube: 10,
    initFHTube: 15,
    initSFTube: 20,
    initRFTube: 25,
    dealerDrawAllowed: true,
    dealerBustAllowed: true,
    dealerWinsOnSameHT: false,
    bustPenaltyMultiplier: 1,
  });

  const updateConfig = (key: keyof SimulationConfig, value: number | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const runSim = useCallback(() => {
    setIsRunning(true);
    setProgress(0);
    setResult(null);

    // Run simulation in next tick to allow UI update
    setTimeout(() => {
      const simResult = runSimulation(config, {
        onProgress: (completed, total) => {
          setProgress((completed / total) * 100);
        },
      });
      
      setResult(simResult);
      setIsRunning(false);
      setProgress(100);
    }, 10);
  }, [config]);

  const reset = () => {
    setResult(null);
    setProgress(0);
    setConfig({
      ...DEFAULT_CONFIG,
      roundsPerRun: 10000,
    });
  };

  const report = result ? generateReport(result.stats) : null;

  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto p-4">
      {/* Configuration Section */}
      <Card className="bg-card border-border">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Simulation Config
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Rounds</Label>
              <Input
                type="number"
                value={config.roundsPerRun}
                onChange={(e) => updateConfig('roundsPerRun', parseInt(e.target.value) || 1000)}
                className="h-8 text-sm"
                min={100}
                max={100000}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Players</Label>
              <Input
                type="number"
                value={config.playerCount}
                onChange={(e) => updateConfig('playerCount', parseInt(e.target.value) || 4)}
                className="h-8 text-sm"
                min={1}
                max={8}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Ante</Label>
              <Input
                type="number"
                value={config.ante}
                onChange={(e) => updateConfig('ante', parseInt(e.target.value) || 5)}
                className="h-8 text-sm"
                min={1}
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Bust Multiplier</Label>
              <Input
                type="number"
                value={config.bustPenaltyMultiplier}
                onChange={(e) => updateConfig('bustPenaltyMultiplier', parseFloat(e.target.value) || 1)}
                className="h-8 text-sm"
                min={0}
                max={10}
                step={0.5}
              />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">ST Tube</Label>
              <Input
                type="number"
                value={config.initSTTube}
                onChange={(e) => updateConfig('initSTTube', parseInt(e.target.value) || 5)}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">FL Tube</Label>
              <Input
                type="number"
                value={config.initFLTube}
                onChange={(e) => updateConfig('initFLTube', parseInt(e.target.value) || 10)}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">FH Tube</Label>
              <Input
                type="number"
                value={config.initFHTube}
                onChange={(e) => updateConfig('initFHTube', parseInt(e.target.value) || 15)}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">SF Tube</Label>
              <Input
                type="number"
                value={config.initSFTube}
                onChange={(e) => updateConfig('initSFTube', parseInt(e.target.value) || 20)}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">RF Tube</Label>
              <Input
                type="number"
                value={config.initRFTube}
                onChange={(e) => updateConfig('initRFTube', parseInt(e.target.value) || 25)}
                className="h-7 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Dealer Draws</Label>
              <Switch
                checked={config.dealerDrawAllowed}
                onCheckedChange={(v) => updateConfig('dealerDrawAllowed', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Dealer Busts</Label>
              <Switch
                checked={config.dealerBustAllowed}
                onCheckedChange={(v) => updateConfig('dealerBustAllowed', v)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={runSim}
              disabled={isRunning}
              className="flex-1 bg-primary text-primary-foreground"
            >
              <Play className="w-4 h-4 mr-2" />
              {isRunning ? 'Running...' : 'Run Simulation'}
            </Button>
            <Button variant="outline" onClick={reset} disabled={isRunning}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {isRunning && (
            <Progress value={progress} className="h-2" />
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {report && (
        <>
          <Card className="bg-card border-border">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rounds</span>
                <span>{report.summary.roundsCompleted.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Execution Time</span>
                <span>{(result!.executionTimeMs / 1000).toFixed(2)}s</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Player Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Inputs</span>
                <span>{report.playerStats.totalInputs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Wins</span>
                <span className="text-accent">{report.playerStats.totalWins.toLocaleString()} ({report.playerStats.winRate.toFixed(1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Losses</span>
                <span>{report.playerStats.totalLosses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Busts</span>
                <span className="text-destructive">{report.playerStats.totalBusts.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Net Credits</span>
                <span className={report.playerStats.netCredits >= 0 ? 'text-accent' : 'text-destructive'}>
                  {report.playerStats.netCredits >= 0 ? '+' : ''}{report.playerStats.netCredits.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Return %</span>
                <span>{report.playerStats.returnPercent.toFixed(2)}%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">House Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between font-bold">
                <span>Net Profit</span>
                <span className={report.houseStats.netProfit >= 0 ? 'text-casino-gold' : 'text-destructive'}>
                  {report.houseStats.netProfit >= 0 ? '+' : ''}{report.houseStats.netProfit.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">House Edge</span>
                <span>{report.houseStats.takePercent.toFixed(2)}%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Tube Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {report.tubeStats.map(tube => (
                <div key={tube.tubeType} className="flex justify-between items-center">
                  <span className="text-muted-foreground">{tube.tubeType}</span>
                  <div className="text-right">
                    <span className="text-casino-gold">{tube.hitCount}</span>
                    <span className="text-muted-foreground"> hits, </span>
                    <span>{tube.totalTaken}</span>
                    <span className="text-muted-foreground"> paid</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Top Hold Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {report.topHT.slice(0, 5).map(ht => (
                <div key={ht.htId} className="flex justify-between items-center">
                  <span className="font-mono text-primary">{ht.htId}</span>
                  <div className="text-right">
                    <span>{ht.timesUsed.toLocaleString()}x</span>
                    <span className="text-muted-foreground"> · </span>
                    <span className="text-accent">{ht.winRate.toFixed(0)}%</span>
                    <span className="text-muted-foreground"> win</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Hand Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {report.handDistribution.slice(0, 6).map(hand => (
                <div key={hand.rank} className="flex justify-between items-center">
                  <span className="text-muted-foreground capitalize">{hand.rank.replace('-', ' ')}</span>
                  <div className="text-right">
                    <span>{hand.count.toLocaleString()}</span>
                    <span className="text-muted-foreground"> ({hand.percentage.toFixed(2)}%)</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
