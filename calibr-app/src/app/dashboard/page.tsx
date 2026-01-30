import { StatCard } from "@/components/dashboard/StatCard";
import { PredictionRow } from "@/components/dashboard/PredictionRow";
import { mockUserPredictions, userStats } from "@/data/mockMarkets";
import { Target, Percent, Trophy, Award, TrendingUp, TrendingDown } from "lucide-react";

export default function DashboardPage() {
  const activePredictions = mockUserPredictions.filter((p) => p.status === "active");
  const resolvedPredictions = mockUserPredictions.filter((p) => p.status !== "active");

  return (
    <div className="container py-8 md:py-12">
      <div className="mb-10">
        <h1 className="mb-3">Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Track your predictions and performance.
        </p>
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
            <h2 className="text-xl font-medium">Active Predictions</h2>
            <span className="text-sm text-muted-foreground">
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
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <p className="text-muted-foreground">No active predictions yet.</p>
            </div>
          )}
        </section>

        {/* Resolved Predictions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium">Recently Resolved</h2>
            <span className="text-sm text-muted-foreground">
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
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <p className="text-muted-foreground">No resolved predictions yet.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
