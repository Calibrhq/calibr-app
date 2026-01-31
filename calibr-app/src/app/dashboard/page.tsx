"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { PredictionRow } from "@/components/dashboard/PredictionRow";
import { mockUserPredictions, userStats } from "@/data/mockMarkets";
import { NoActivePredictions, NoPredictions } from "@/components/ui/empty-state";
import { Target, Percent, Trophy, Award, TrendingUp, TrendingDown, LayoutDashboard, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const activePredictions = mockUserPredictions.filter((p) => p.status === "active");
  const resolvedPredictions = mockUserPredictions.filter((p) => p.status !== "active");

  return (
    <div className="container py-8 md:py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <h1 className="mb-0">Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Track your predictions and performance.
          </p>
        </div>
        <Link href="/explore">
          <Button className="gap-2">
            <Target className="h-4 w-4" />
            New Prediction
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-12">
        <StatCard
          label="Total Predictions"
          value={userStats.totalPredictions}
          icon={Target}
        />
        <StatCard
          label="Average Confidence"
          value={`${userStats.averageConfidence}%`}
          icon={Percent}
        />
        <StatCard
          label="Win Rate"
          value={`${userStats.winRate}%`}
          icon={Trophy}
          trend="up"
          sublabel="+3% this month"
        />
        <StatCard
          label="Net Profit/Loss"
          value={userStats.netProfitLoss > 0 ? `+${userStats.netProfitLoss}` : userStats.netProfitLoss}
          icon={userStats.netProfitLoss >= 0 ? TrendingUp : TrendingDown}
          trend={userStats.netProfitLoss >= 0 ? "up" : "down"}
        />
        <StatCard
          label="Rep Change"
          value={userStats.repChangeThisWeek > 0 ? `+${userStats.repChangeThisWeek}` : userStats.repChangeThisWeek}
          icon={Award}
          trend={userStats.repChangeThisWeek >= 0 ? "up" : "down"}
          sublabel="this week"
        />
      </div>

      <div className="space-y-10">
        {/* Active Predictions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-medium">Active Predictions</h2>
            </div>
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
              {activePredictions.length} open
            </span>
          </div>
          {activePredictions.length > 0 ? (
            <div className="space-y-3">
              {activePredictions.map((prediction, index) => (
                <div
                  key={prediction.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <PredictionRow
                    id={prediction.marketId}
                    question={prediction.question}
                    side={prediction.side}
                    confidence={prediction.confidence}
                    status={prediction.status}
                    stakeAmount={prediction.stakeAmount}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl">
              <NoActivePredictions />
            </div>
          )}
        </section>

        {/* Resolved Predictions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-medium">Recently Resolved</h2>
            </div>
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-secondary text-secondary-foreground">
              {resolvedPredictions.length} resolved
            </span>
          </div>
          {resolvedPredictions.length > 0 ? (
            <div className="space-y-3">
              {resolvedPredictions.map((prediction, index) => (
                <div
                  key={prediction.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <PredictionRow
                    id={prediction.marketId}
                    question={prediction.question}
                    side={prediction.side}
                    confidence={prediction.confidence}
                    status={prediction.status}
                    resolvedAt={prediction.resolvedAt}
                    pointsWon={prediction.pointsWon}
                    pointsLost={prediction.pointsLost}
                    repGained={prediction.repGained}
                    repLost={prediction.repLost}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl">
              <NoPredictions />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
