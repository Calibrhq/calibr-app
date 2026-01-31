"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Award, TrendingUp, Crown, Flame, Target } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";

// Mock leaderboard data
const leaderboardData = [
  { rank: 1, address: "0x8f3a...2d1b", reputation: 982, predictions: 156, winRate: 78, tier: "elite" as const },
  { rank: 2, address: "0x2c7d...9e4f", reputation: 945, predictions: 203, winRate: 74, tier: "elite" as const },
  { rank: 3, address: "0x1b9e...3a2c", reputation: 923, predictions: 89, winRate: 82, tier: "elite" as const },
  { rank: 4, address: "0x4d5f...7b8a", reputation: 891, predictions: 167, winRate: 71, tier: "elite" as const },
  { rank: 5, address: "0x6e2a...1c9d", reputation: 876, predictions: 245, winRate: 69, tier: "elite" as const },
  { rank: 6, address: "0x9f8b...4e3a", reputation: 854, predictions: 112, winRate: 75, tier: "elite" as const },
  { rank: 7, address: "0x2367...51e8", reputation: 847, predictions: 24, winRate: 71, tier: "proven" as const, isYou: true },
  { rank: 8, address: "0x3a1c...8d2e", reputation: 832, predictions: 198, winRate: 68, tier: "proven" as const },
  { rank: 9, address: "0x7b4d...2f9a", reputation: 821, predictions: 76, winRate: 73, tier: "proven" as const },
  { rank: 10, address: "0x5e6f...3c1b", reputation: 809, predictions: 143, winRate: 66, tier: "proven" as const },
  { rank: 11, address: "0x8c2d...7a4e", reputation: 798, predictions: 87, winRate: 70, tier: "proven" as const },
  { rank: 12, address: "0x1d9e...5b3f", reputation: 785, predictions: 234, winRate: 64, tier: "proven" as const },
];

const timeFrames = ["All Time", "This Month", "This Week"];

const tierConfig = {
  elite: { label: "Elite", color: "text-purple-500", bg: "bg-purple-500/10", icon: Crown },
  proven: { label: "Proven", color: "text-blue-500", bg: "bg-blue-500/10", icon: Award },
  new: { label: "New", color: "text-gray-500", bg: "bg-gray-500/10", icon: Target },
};

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
  return <span className="text-sm text-muted-foreground font-mono-numbers w-5 text-center">{rank}</span>;
}

export default function LeaderboardPage() {
  const [timeFrame, setTimeFrame] = useState("All Time");

  return (
    <div className="container py-8 md:py-12">
      {/* Header */}
      <div className="max-w-3xl mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <h1>Leaderboard</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Top forecasters ranked by reputation. Calibration is key.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="bg-card border border-border rounded-xl p-5 card-interactive">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Flame className="h-4 w-4 text-yellow-500" />
            </div>
            <span className="text-sm text-muted-foreground">Top Reputation</span>
          </div>
          <AnimatedCounter value={982} className="text-2xl font-bold" />
        </div>
        
        <div className="bg-card border border-border rounded-xl p-5 card-interactive">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <span className="text-sm text-muted-foreground">Avg Win Rate</span>
          </div>
          <AnimatedCounter value={72} suffix="%" className="text-2xl font-bold" />
        </div>
        
        <div className="bg-card border border-border rounded-xl p-5 card-interactive">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Crown className="h-4 w-4 text-purple-500" />
            </div>
            <span className="text-sm text-muted-foreground">Elite Forecasters</span>
          </div>
          <AnimatedCounter value={6} className="text-2xl font-bold" />
        </div>
      </div>

      {/* Time Frame Filter */}
      <div className="flex gap-2 mb-6">
        {timeFrames.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeFrame(tf)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all",
              timeFrame === tf
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-muted/50 text-sm font-medium text-muted-foreground border-b border-border">
          <div className="col-span-1">Rank</div>
          <div className="col-span-4">Forecaster</div>
          <div className="col-span-2 text-right">Reputation</div>
          <div className="col-span-2 text-right hidden sm:block">Predictions</div>
          <div className="col-span-2 text-right hidden sm:block">Win Rate</div>
          <div className="col-span-1 text-right">Tier</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {leaderboardData.map((user, index) => {
            const tierInfo = tierConfig[user.tier];
            const TierIcon = tierInfo.icon;
            
            return (
              <div
                key={user.rank}
                className={cn(
                  "grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-muted/30",
                  user.isYou && "bg-primary/5 hover:bg-primary/10",
                  "animate-fade-in"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Rank */}
                <div className="col-span-1 flex items-center justify-center">
                  {getRankIcon(user.rank)}
                </div>

                {/* Address */}
                <div className="col-span-4 flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                    user.rank <= 3 
                      ? "bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30" 
                      : "bg-muted"
                  )}>
                    {user.address.slice(2, 4).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-mono text-sm">{user.address}</span>
                    {user.isYou && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                        You
                      </span>
                    )}
                  </div>
                </div>

                {/* Reputation */}
                <div className="col-span-2 text-right">
                  <span className="text-lg font-bold font-mono-numbers">{user.reputation}</span>
                </div>

                {/* Predictions */}
                <div className="col-span-2 text-right hidden sm:block">
                  <span className="font-mono-numbers text-muted-foreground">{user.predictions}</span>
                </div>

                {/* Win Rate */}
                <div className="col-span-2 text-right hidden sm:block">
                  <span className={cn(
                    "font-mono-numbers",
                    user.winRate >= 70 ? "text-green-500" : "text-muted-foreground"
                  )}>
                    {user.winRate}%
                  </span>
                </div>

                {/* Tier */}
                <div className="col-span-1 flex justify-end">
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    tierInfo.bg, tierInfo.color
                  )}>
                    <TierIcon className="h-3 w-3" />
                    <span className="hidden md:inline">{tierInfo.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Your Rank Card (if not in top) */}
      <div className="mt-8 bg-card border border-primary/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="font-bold font-mono-numbers text-primary">#7</span>
            </div>
            <div>
              <p className="font-medium">Your Ranking</p>
              <p className="text-sm text-muted-foreground">
                Top 10% of all forecasters
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-mono-numbers">847</p>
            <p className="text-sm text-muted-foreground">Reputation</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Points to next rank</span>
            <span className="font-mono-numbers font-medium text-primary">+7 rep</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: "85%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
