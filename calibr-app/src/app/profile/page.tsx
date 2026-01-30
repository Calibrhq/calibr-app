"use client";

import { ReputationDisplay } from "@/components/profile/ReputationDisplay";
import { ReputationChart } from "@/components/profile/ReputationChart";
import { ConfidenceAccuracyChart } from "@/components/profile/ConfidenceAccuracyChart";
import { userStats, reputationHistory, confidenceAccuracy, bestPredictions, worstPredictions } from "@/data/mockMarkets";
import { TrendingUp, TrendingDown, Award, AlertTriangle } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="container py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="mb-3">Your Reputation</h1>
          <p className="text-muted-foreground">
            Your reputation reflects how well your confidence matches reality.
          </p>
        </div>

        {/* Main Reputation Display */}
        <ReputationDisplay
          score={userStats.reputationScore}
          maxConfidence={userStats.maxConfidence}
          tier={userStats.tier}
        />

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2 mt-12">
          <ReputationChart data={reputationHistory} />
          <ConfidenceAccuracyChart data={confidenceAccuracy} />
        </div>

        {/* Best and Worst Predictions */}
        <div className="grid gap-6 md:grid-cols-2 mt-8">
          {/* Best Predictions */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-success" />
              <h3 className="font-medium">Best Predictions</h3>
            </div>
            <div className="space-y-3">
              {bestPredictions.map((pred, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{pred.question}</p>
                    <span className="text-xs text-muted-foreground">{pred.confidence}% confidence</span>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <TrendingUp className="h-3 w-3 text-success" />
                    <span className="text-sm font-medium text-success font-mono-numbers">+{pred.repGained}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Worst Overconfidence */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h3 className="font-medium">Overconfidence Penalties</h3>
            </div>
            <div className="space-y-3">
              {worstPredictions.map((pred, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{pred.question}</p>
                    <span className="text-xs text-muted-foreground">{pred.confidence}% confidence</span>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <TrendingDown className="h-3 w-3 text-destructive" />
                    <span className="text-sm font-medium text-destructive font-mono-numbers">-{pred.repLost}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Total Profit/Loss */}
        <div className="mt-8 bg-card border border-border rounded-xl p-6 text-center">
          <span className="text-sm text-muted-foreground block mb-2">Total Profit / Loss</span>
          <span className={`text-3xl font-bold font-mono-numbers ${userStats.netProfitLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
            {userStats.netProfitLoss > 0 ? '+' : ''}{userStats.netProfitLoss} pts
          </span>
        </div>

        {/* How Reputation Works */}
        <div className="mt-12 space-y-6">
          <h2 className="text-xl font-medium text-center">How Reputation Works</h2>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-medium text-sm">1</span>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Calibrated Wins</h3>
                  <p className="text-sm text-muted-foreground">
                    When you&apos;re right at 70% confidence, you gain reputation.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-medium text-sm">2</span>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Overconfidence Penalty</h3>
                  <p className="text-sm text-muted-foreground">
                    Being wrong at 90% confidence costs more than being wrong at 60%.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-medium text-sm">3</span>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Confidence Unlocks</h3>
                  <p className="text-sm text-muted-foreground">
                    Higher reputation unlocks higher max confidence levels.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-medium text-sm">4</span>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Long-term Focus</h3>
                  <p className="text-sm text-muted-foreground">
                    Reputation rewards consistent calibration over time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
