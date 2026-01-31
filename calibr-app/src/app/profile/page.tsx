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
      </div>
    </div>
  );
}
