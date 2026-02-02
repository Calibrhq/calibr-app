"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useLeaderboard, TimeFrame } from "@/hooks/useLeaderboard";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Award, TrendingUp, Crown, Flame, Target, Sparkles, ChevronRight } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";

const timeFrames: TimeFrame[] = ["All Time", "This Week", "This Month"];

const tierConfig = {
  elite: { label: "Elite", color: "text-purple-500", bg: "bg-purple-500/10", icon: Crown },
  proven: { label: "Proven", color: "text-blue-500", bg: "bg-blue-500/10", icon: Award },
  new: { label: "New", color: "text-gray-500", bg: "bg-gray-500/10", icon: Target },
};

function getRankIcon(rank: number) {
  if (rank === 1) return <div className="relative flex justify-center"><Medal className="w-6 h-6 text-yellow-500 fill-yellow-500/20" /><span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-yellow-700 dark:text-yellow-600 pt-0.5">1</span></div>;
  if (rank === 2) return <div className="relative flex justify-center"><Medal className="w-6 h-6 text-slate-400 fill-slate-400/20" /><span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-700 pt-0.5">2</span></div>;
  if (rank === 3) return <div className="relative flex justify-center"><Medal className="w-6 h-6 text-amber-600 fill-amber-600/20" /><span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-amber-800 dark:text-amber-700 pt-0.5">3</span></div>;
  return <span className="text-sm font-mono font-medium text-muted-foreground w-6 text-center">{rank}</span>;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { address } = useWallet();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("All Time");
  const { data: leaderboardData, isLoading } = useLeaderboard(address, timeFrame);

  // Stats for cards (derived from real data)
  const topRep = leaderboardData && leaderboardData.length > 0 ? leaderboardData[0].reputation : 0;

  const avgWinRate = leaderboardData && leaderboardData.length > 0
    ? Math.round(leaderboardData.reduce((acc, user) => acc + user.winRate, 0) / leaderboardData.length)
    : 0;

  // Calculate total PnL of platform (sum of all positive PnLs?) or just max earner?
  // Let's show "Top Earner" PnL or Platform Volume? 
  // Existing card is "Elite Forecasters". Let's keep it or change to "Highest Streak"?
  // Let's keep Elite count for now.
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
          Top forecasters ranked by {timeFrame === "All Time" ? "reputation" : "earnings"}.
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

      {/* Time Frame Filters */}
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
      <div className="bg-card border border-border rounded-xl overflow-hidden min-h-[300px]">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-muted/50 text-sm font-medium text-muted-foreground border-b border-border">
          <div className="col-span-1">Rank</div>
          <div className="col-span-4 md:col-span-3">Forecaster</div>
          <div className="col-span-2 text-right">Reputation</div>
          <div className="col-span-2 text-right hidden md:block text-muted-foreground">Earnings</div>
          <div className="col-span-2 text-right hidden sm:block">Win Rate</div>
          <div className="col-span-1 text-right hidden md:block">Streak</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {isLoading ? (
            // Loading Skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 items-center animate-pulse">
                <div className="col-span-1 text-center"><div className="mx-auto w-5 h-5 bg-muted rounded-full" /></div>
                <div className="col-span-4 md:col-span-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="w-24 h-4 bg-muted rounded" />
                </div>
                <div className="col-span-2"><div className="ml-auto w-12 h-6 bg-muted rounded" /></div>
                <div className="col-span-2 hidden md:block"><div className="ml-auto w-16 h-6 bg-muted rounded" /></div>
                <div className="col-span-2 hidden sm:block"><div className="ml-auto w-10 h-6 bg-muted rounded" /></div>
                <div className="col-span-1 hidden md:block"><div className="ml-auto w-8 h-6 bg-muted rounded" /></div>
              </div>
            ))
          ) : !leaderboardData || leaderboardData.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No active forecasters for this period.
            </div>
          ) : (
            leaderboardData.map((user, index) => {
              const tierInfo = tierConfig[user.tier];

              const rankStyles: Record<number, string> = {
                1: "bg-gradient-to-r from-yellow-500/10 via-transparent to-transparent border-l-2 border-l-yellow-500",
                2: "bg-gradient-to-r from-slate-400/10 via-transparent to-transparent border-l-2 border-l-slate-400",
                3: "bg-gradient-to-r from-amber-600/10 via-transparent to-transparent border-l-2 border-l-amber-600"
              };

              return (
                <div
                  key={user.address}
                  onClick={() => router.push(`/profile/${user.address}`)}
                  className={cn(
                    "grid grid-cols-12 gap-4 px-6 py-4 items-center transition-all duration-300 cursor-pointer group hover:bg-muted/50 relative border-l-2 border-transparent",
                    user.isYou && !rankStyles[user.rank] && "bg-primary/5 hover:bg-primary/10 border-l-primary",
                    rankStyles[user.rank],
                    "animate-fade-in"
                  )}
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                >
                  {/* Rank */}
                  <div className="col-span-1 flex items-center justify-center">
                    {getRankIcon(user.rank)}
                  </div>

                  {/* Address & Tier */}
                  <div className="col-span-4 md:col-span-3 flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-transform group-hover:scale-105",
                      user.rank <= 3
                        ? "bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30"
                        : "bg-muted"
                    )}>
                      {user.address.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium group-hover:text-primary transition-colors">
                          {user.address.slice(0, 6)}...
                        </span>
                        {user.isYou && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className={cn("text-[10px]", tierInfo.color)}>
                        {tierInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Reputation */}
                  <div className="col-span-2 text-right">
                    <span className="text-lg font-bold font-mono-numbers">{user.reputation}</span>
                  </div>

                  {/* Earnings (PnL) */}
                  <div className="col-span-2 text-right hidden md:block">
                    <span className={cn(
                      "font-mono-numbers font-medium",
                      user.pnl > 0 ? "text-green-500" : user.pnl < 0 ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {user.pnl > 0 ? "+" : ""}{user.pnl.toFixed(1)} <span className="text-xs text-muted-foreground">SUI</span>
                    </span>
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

                  {/* Streak */}
                  <div className="col-span-1 text-right hidden md:block relative">
                    {/* Move streak content out of the way of the chevron slightly? No, chevron is absolute right-4 */}
                    {user.streak > 1 ? (
                      <div className="flex items-center justify-end gap-1 text-orange-500 font-bold text-sm">
                        <Flame className="w-3 h-3 fill-orange-500" />
                        {user.streak}
                      </div>
                    ) : <span className="text-muted-foreground text-xs">-</span>}
                  </div>

                  {/* Hover Action Chevron */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                    <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer / Legend */}
      <div className="mt-4 flex gap-4 text-xs text-muted-foreground justify-center">
        <div className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" /> Win Streak</div>
      </div>

    </div>
  );
}
