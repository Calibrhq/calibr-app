"use client";

import { useMemo } from "react";
import { ReputationDisplay } from "@/components/profile/ReputationDisplay";
import { ReputationChart } from "@/components/profile/ReputationChart";
import { ConfidenceAccuracyChart } from "@/components/profile/ConfidenceAccuracyChart";
import { TrendingUp, TrendingDown, Award, AlertTriangle, User, Loader2, Coins } from "lucide-react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { usePointsBalance } from "@/hooks/usePointsBalance";
import { useUserPredictions } from "@/hooks/useUserPredictions";

export default function ProfilePage() {
  const { isConnected, address, shortAddress, reputation, tier, maxConfidence } = useWallet();
  const { data: pointsBalance, isLoading: isLoadingPoints } = usePointsBalance();
  const { data: predictions, isLoading: isLoadingPredictions } = useUserPredictions();

  // Calculate stats and chart data from real predictions
  const {
    reputationHistory,
    confidenceAccuracy,
    bestPredictions,
    worstPredictions,
    netProfit
  } = useMemo(() => {
    if (!predictions || predictions.length === 0) {
      return {
        reputationHistory: [{ date: "Now", score: reputation }],
        confidenceAccuracy: [],
        bestPredictions: [],
        worstPredictions: [],
        netProfit: 0
      };
    }

    const resolved = predictions.filter(p => p.status !== "active");

    // Build reputation history (simulate from predictions chronologically)
    // Since we don't have timestamps, we'll show current + trajectory
    const repHistory = [
      { date: "Start", score: 500 },
      { date: "Now", score: reputation }
    ];

    // Build confidence vs accuracy chart data
    // Group predictions by confidence buckets
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
          confidenceBuckets[bucket].actual += 100; // 100% win for this pred
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

    // Best predictions (won with highest profit)
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

    // Worst predictions (lost with highest loss)
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
  }, [predictions, reputation]);

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

  const isLoading = isLoadingPoints || isLoadingPredictions;

  return (
    <div className="container py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="mb-3">Your Profile</h1>
          <p className="text-muted-foreground">
            {shortAddress && <code className="bg-muted px-2 py-1 rounded text-sm">{shortAddress}</code>}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Main Reputation Display */}
            <ReputationDisplay
              score={reputation}
              maxConfidence={maxConfidence}
              tier={tier}
            />

            {/* Points Balance Card */}
            <div className="mt-8 bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Coins className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Points Balance</p>
                    <p className="text-2xl font-bold font-mono-numbers">
                      {pointsBalance?.balance.toLocaleString() || "0"}
                    </p>
                  </div>
                </div>
                <Link
                  href="/points"
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Buy More
                </Link>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-2 mt-8">
              <ReputationChart data={reputationHistory} />
              {confidenceAccuracy.length > 0 ? (
                <ConfidenceAccuracyChart data={confidenceAccuracy} />
              ) : (
                <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center">
                  <p className="text-muted-foreground text-sm text-center">
                    Make predictions to see your calibration chart
                  </p>
                </div>
              )}
            </div>

            {/* Best and Worst Predictions */}
            <div className="grid gap-6 md:grid-cols-2 mt-8">
              {/* Best Predictions */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="h-5 w-5 text-green-500" />
                  <h3 className="font-medium">Best Predictions</h3>
                </div>
                {bestPredictions.length > 0 ? (
                  <div className="space-y-3">
                    {bestPredictions.map((pred, i) => (
                      <Link
                        key={i}
                        href={`/market/${pred.marketId}`}
                        className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{pred.question}</p>
                          <span className="text-xs text-muted-foreground">{pred.confidence}% confidence</span>
                        </div>
                        <div className="flex items-center gap-1 ml-3">
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-sm font-medium text-green-500 font-mono-numbers">+{pred.profit}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No winning predictions yet</p>
                )}
              </div>

              {/* Worst Overconfidence */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h3 className="font-medium">Losses</h3>
                </div>
                {worstPredictions.length > 0 ? (
                  <div className="space-y-3">
                    {worstPredictions.map((pred, i) => (
                      <Link
                        key={i}
                        href={`/market/${pred.marketId}`}
                        className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{pred.question}</p>
                          <span className="text-xs text-muted-foreground">{pred.confidence}% confidence</span>
                        </div>
                        <div className="flex items-center gap-1 ml-3">
                          <TrendingDown className="h-3 w-3 text-red-500" />
                          <span className="text-sm font-medium text-red-500 font-mono-numbers">-{pred.loss}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No losses yet — keep it up!</p>
                )}
              </div>
            </div>

            {/* Total Profit/Loss */}
            <div className="mt-8 bg-card border border-border rounded-xl p-6 text-center">
              <span className="text-sm text-muted-foreground block mb-2">Total Profit / Loss</span>
              <span className={`text-3xl font-bold font-mono-numbers ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {netProfit > 0 ? '+' : ''}{netProfit} pts
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
