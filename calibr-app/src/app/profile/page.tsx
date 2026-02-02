"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ReputationDisplay } from "@/components/profile/ReputationDisplay";
import { ReputationChart } from "@/components/profile/ReputationChart";
import { ConfidenceAccuracyChart } from "@/components/profile/ConfidenceAccuracyChart";
import { TrendingUp, TrendingDown, Award, AlertTriangle, User, Loader2, Copy, Check } from "lucide-react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useUserPredictions } from "@/hooks/useUserPredictions";
import { useLeaderboard } from "@/hooks/useLeaderboard";

export default function ProfilePage() {
  const { isConnected, address, shortAddress } = useWallet();
  const { data: predictions, isLoading: isLoadingPredictions } = useUserPredictions();
  const { data: leaderboardData, isLoading: isLoadingLeaderboard } = useLeaderboard(null);

  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const userStats = leaderboardData?.find(u => u.address === address);

  // Calculate stats and chart data from real predictions
  const {
    reputationHistory,
    confidenceAccuracy,
    bestPredictions,
    worstPredictions,
    netProfit
  } = useMemo(() => {
    const currentRep = userStats?.reputation || 500; // Default/Fallback

    if (!predictions || predictions.length === 0) {
      return {
        reputationHistory: [{ date: "Now", score: currentRep }],
        confidenceAccuracy: [],
        bestPredictions: [],
        worstPredictions: [],
        netProfit: 0
      };
    }

    const resolved = predictions.filter(p => p.status !== "active");

    // Build reputation history
    const repHistory = [
      { date: "Start", score: 500 },
      { date: "Now", score: currentRep }
    ];

    // Build confidence vs accuracy chart data
    const confidenceBuckets: Record<string, { predicted: number; actual: number; count: number }> = {
      "50-55%": { predicted: 52.5, actual: 0, count: 0 },
      "55-60%": { predicted: 57.5, actual: 0, count: 0 },
      "60-65%": { predicted: 62.5, actual: 0, count: 0 },
      "65-70%": { predicted: 67.5, actual: 0, count: 0 },
      "70-75%": { predicted: 72.5, actual: 0, count: 0 },
      "75-80%": { predicted: 77.5, actual: 0, count: 0 },
      "80-85%": { predicted: 82.5, actual: 0, count: 0 },
      "85-90%": { predicted: 87.5, actual: 0, count: 0 },
    };

    for (const pred of resolved) {
      let bucket = "";
      if (pred.confidence >= 50 && pred.confidence < 55) bucket = "50-55%";
      else if (pred.confidence >= 55 && pred.confidence < 60) bucket = "55-60%";
      else if (pred.confidence >= 60 && pred.confidence < 65) bucket = "60-65%";
      else if (pred.confidence >= 65 && pred.confidence < 70) bucket = "65-70%";
      else if (pred.confidence >= 70 && pred.confidence < 75) bucket = "70-75%";
      else if (pred.confidence >= 75 && pred.confidence < 80) bucket = "75-80%";
      else if (pred.confidence >= 80 && pred.confidence < 85) bucket = "80-85%";
      else if (pred.confidence >= 85) bucket = "85-90%";

      if (bucket && confidenceBuckets[bucket]) {
        confidenceBuckets[bucket].count++;
        if (pred.status === "won") {
          confidenceBuckets[bucket].actual += 100;
        }
      }
    }

    // Calculate average actual win rate per bucket
    const confAccuracy = Object.entries(confidenceBuckets)
      .filter(([_, v]) => v.count > 0)
      .map(([confidence, v]) => ({
        confidence,
        predicted: v.predicted,
        actual: Math.round(v.actual / v.count)
      }));

    // Best predictions
    const won = resolved.filter(p => p.status === "won" && p.profit);
    const best = won
      .sort((a, b) => (b.profit || 0) - (a.profit || 0))
      .slice(0, 3)
      .map(p => ({
        marketId: p.marketId,
        question: `Market ${p.marketId.slice(0, 8)}...`,
        confidence: p.confidence,
        profit: p.profit || 0
      }));

    // Worst predictions
    const lost = resolved.filter(p => p.status === "lost" && p.loss);
    const worst = lost
      .sort((a, b) => (b.loss || 0) - (a.loss || 0))
      .slice(0, 3)
      .map(p => ({
        marketId: p.marketId,
        question: `Market ${p.marketId.slice(0, 8)}...`,
        confidence: p.confidence,
        loss: p.loss || 0
      }));

    // Net profit
    const profit = resolved.reduce((sum, p) => {
      if (p.profit) return sum + p.profit;
      if (p.loss) return sum - p.loss;
      return sum;
    }, 0);

    return {
      reputationHistory: repHistory,
      confidenceAccuracy: confAccuracy,
      bestPredictions: best,
      worstPredictions: worst,
      netProfit: profit
    };
  }, [predictions, userStats]);

  // Not connected state
  if (!isConnected) {
    return (
      <div className="container py-8 md:py-12">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <User className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Connect Your Wallet</h1>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to view your profile and reputation.
          </p>
        </div>
      </div>
    );
  }

  const isLoading = isLoadingPredictions || isLoadingLeaderboard;

  // Determine tiers/caps from userStats or defaults
  let inferredMaxConf = 70;
  if (userStats?.tier === "elite") inferredMaxConf = 90;
  else if (userStats?.tier === "proven") inferredMaxConf = 80;

  return (
    <div className="container py-8 md:py-12 animate-fade-in text-left">
      <div className="max-w-6xl mx-auto">
        {/* Header & Identity */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
            </div>
            <div className="flex items-center gap-2">
              <div
                onClick={copyToClipboard}
                className="bg-muted hover:bg-muted/80 active:scale-95 transition-all px-3 py-1.5 rounded-lg text-sm font-mono cursor-pointer flex items-center gap-2 group border border-transparent hover:border-primary/20"
                role="button"
                title="Copy address"
              >
                <span className="text-foreground/80">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-500 animate-in zoom-in" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Hero Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {/* Net PnL Card */}
              <div className="relative overflow-hidden bg-card border border-border rounded-xl p-5 group hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="text-sm text-muted-foreground font-medium mb-1">Net PnL</div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      "text-3xl font-bold font-mono-numbers",
                      netProfit > 0 ? "text-green-500" : netProfit < 0 ? "text-red-500" : "text-foreground"
                    )}>
                      {netProfit > 0 ? "+" : ""}{netProfit}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium uppercase">pts</span>
                  </div>
                </div>
              </div>

              {/* Rank Card */}
              <div className="relative overflow-hidden bg-card border border-border rounded-xl p-5 group hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                <div className="text-sm text-muted-foreground font-medium mb-1">Global Rank</div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold font-mono-numbers">
                    #{userStats?.rank || "-"}
                  </span>
                  {userStats?.rank && userStats.rank <= 3 && (
                    <Award className="h-5 w-5 text-yellow-500 fill-yellow-500/20" />
                  )}
                </div>
              </div>

              {/* Win Rate Card */}
              <div className="relative overflow-hidden bg-card border border-border rounded-xl p-5 group hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                <div className="text-sm text-muted-foreground font-medium mb-1">Win Rate</div>
                <div className="text-3xl font-bold font-mono-numbers">
                  {userStats?.winRate || 0}%
                </div>
              </div>

              {/* Streak Card */}
              <div className="relative overflow-hidden bg-card border border-border rounded-xl p-5 group hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                <div className="text-sm text-muted-foreground font-medium mb-1">Current Streak</div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-orange-500" />
                  <span className="text-3xl font-bold font-mono-numbers text-orange-500">
                    {userStats?.streak || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Content Layout - Stacked */}
            <div className="space-y-10">

              {/* 1. Reputation Overview (Full Width) */}
              <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <ReputationDisplay
                  score={userStats?.reputation || 500}
                  maxConfidence={inferredMaxConf}
                  tier={userStats?.tier || "new"}
                />
              </div>

              {/* 2. Charts Area */}
              <div className="grid md:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-1 shadow-sm h-[350px]">
                  <ReputationChart data={reputationHistory} />
                </div>
                <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-1 shadow-sm h-[350px]">
                  {confidenceAccuracy.length > 0 ? (
                    <ConfidenceAccuracyChart data={confidenceAccuracy} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      Not enough data for calibration chart
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Lists Area (Wins/Misses) */}
              <div className="grid md:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                {/* Best Predictions */}
                <div className="bg-card border border-border rounded-xl p-6 h-full shadow-sm hover:border-primary/20 transition-colors">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-green-500/10">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <h3 className="font-medium">Top Wins</h3>
                  </div>
                  {bestPredictions.length > 0 ? (
                    <div className="space-y-3">
                      {bestPredictions.map((pred, i) => (
                        <Link
                          key={i}
                          href={`/market/${pred.marketId}`}
                          className="group flex items-center justify-between py-3 border-b border-border/50 last:border-0 hover:bg-muted/50 -mx-2 px-3 rounded-lg transition-all hover:scale-[1.01] hover:shadow-sm"
                        >
                          <div className="min-w-0 flex-1 mr-4">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{pred.question}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded font-mono font-medium">WON</span>
                              <span className="text-xs text-muted-foreground">{pred.confidence}% conf</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-green-500 font-mono-numbers">+{pred.profit}</span>
                            <div className="text-[10px] text-muted-foreground">pts</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-muted-foreground text-sm italic">
                      No wins recorded yet
                    </div>
                  )}
                </div>

                {/* Worst Predictions */}
                <div className="bg-card border border-border rounded-xl p-6 h-full shadow-sm hover:border-primary/20 transition-colors">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-red-500/10">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                    <h3 className="font-medium">Misses</h3>
                  </div>
                  {worstPredictions.length > 0 ? (
                    <div className="space-y-3">
                      {worstPredictions.map((pred, i) => (
                        <Link
                          key={i}
                          href={`/market/${pred.marketId}`}
                          className="group flex items-center justify-between py-3 border-b border-border/50 last:border-0 hover:bg-muted/50 -mx-2 px-3 rounded-lg transition-all hover:scale-[1.01] hover:shadow-sm"
                        >
                          <div className="min-w-0 flex-1 mr-4">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{pred.question}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-mono font-medium">LOST</span>
                              <span className="text-xs text-muted-foreground">{pred.confidence}% conf</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-red-500 font-mono-numbers">-{pred.loss}</span>
                            <div className="text-[10px] text-muted-foreground">pts</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-muted-foreground text-sm italic">
                      Clean record so far
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
