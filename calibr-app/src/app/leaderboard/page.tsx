"use client";

import { useWallet } from "@/hooks/useWallet";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Award, TrendingUp, Crown, Flame, Target } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";

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
  const { address } = useWallet();
  const { data: leaderboardData, isLoading } = useLeaderboard(address);

  // Stats for cards (derived from real data)
  const topRep = leaderboardData && leaderboardData.length > 0 ? leaderboardData[0].reputation : 0;

  const avgWinRate = leaderboardData && leaderboardData.length > 0
    ? Math.round(leaderboardData.reduce((acc, user) => acc + user.winRate, 0) / leaderboardData.length)
    : 0;

  const eliteCount = leaderboardData ? leaderboardData.filter(u => u.tier === "elite").length : 0;

  // Find current user rank
  const userRank = leaderboardData?.find(u => u.isYou);

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
          Top forecasters ranked by reputation.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="relative overflow-hidden bg-card/80 backdrop-blur-sm border border-primary/10 rounded-xl p-5 card-interactive">
          <div className="absolute inset-0 bg-gradient-radial opacity-40 pointer-events-none" aria-hidden />
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Flame className="h-4 w-4 text-yellow-500" />
              </div>
              <span className="text-sm text-muted-foreground">Top Reputation</span>
            </div>
            {isLoading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <AnimatedCounter value={topRep} className="text-2xl font-bold" />
            )}
          </div>
        </div>

        <div className="relative overflow-hidden bg-card/80 backdrop-blur-sm border border-primary/10 rounded-xl p-5 card-interactive">
          <div className="absolute inset-0 bg-gradient-radial opacity-30 pointer-events-none" aria-hidden />
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <span className="text-sm text-muted-foreground">Avg Win Rate</span>
            </div>
            {isLoading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <AnimatedCounter value={avgWinRate} suffix="%" className="text-2xl font-bold" />
            )}
          </div>
        </div>

        <div className="relative overflow-hidden bg-card/80 backdrop-blur-sm border border-primary/10 rounded-xl p-5 card-interactive">
          <div className="absolute inset-0 bg-gradient-radial opacity-30 pointer-events-none" aria-hidden />
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Crown className="h-4 w-4 text-purple-500" />
              </div>
              <span className="text-sm text-muted-foreground">Elite Forecasters</span>
            </div>
            {isLoading ? (
              <div className="h-8 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <AnimatedCounter value={eliteCount} className="text-2xl font-bold" />
            )}
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden min-h-[300px]">
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
          {isLoading ? (
            // Loading Skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 items-center animate-pulse">
                <div className="col-span-1 text-center"><div className="mx-auto w-5 h-5 bg-muted rounded-full" /></div>
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="w-32 h-4 bg-muted rounded" />
                </div>
                <div className="col-span-2"><div className="ml-auto w-12 h-6 bg-muted rounded" /></div>
                <div className="col-span-2 hidden sm:block"><div className="ml-auto w-8 h-6 bg-muted rounded" /></div>
                <div className="col-span-2 hidden sm:block"><div className="ml-auto w-10 h-6 bg-muted rounded" /></div>
                <div className="col-span-1"><div className="ml-auto w-16 h-6 bg-muted rounded" /></div>
              </div>
            ))
          ) : !leaderboardData || leaderboardData.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No active forecasters yet. Be the first!
            </div>
          ) : (
            leaderboardData.map((user, index) => {
              const tierInfo = tierConfig[user.tier];
              const TierIcon = tierInfo.icon;

              return (
                <div
                  key={user.address}
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
                      <span className="font-mono text-sm">
                        {user.address.slice(0, 6)}...{user.address.slice(-4)}
                      </span>
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
            })
          )}
        </div>
      </div>

      {/* Your Rank Card */}
      {userRank && (
        <div className="mt-8 bg-card border border-primary/30 rounded-xl p-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-bold font-mono-numbers text-primary">#{userRank.rank}</span>
              </div>
              <div>
                <p className="font-medium">Your Ranking</p>
                <p className="text-sm text-muted-foreground">
                  {userRank.tier === "elite" ? "Elite Tier Forecaster" : userRank.tier === "proven" ? "Proven Forecaster" : "New Forecaster"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-mono-numbers">{userRank.reputation}</p>
              <p className="text-sm text-muted-foreground">Reputation</p>
            </div>
          </div>
          {/* Progress bar logic could be added here if we knew next threshold */}
        </div>
      )}
    </div>
  );
}
