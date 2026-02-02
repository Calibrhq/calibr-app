"use client";

import { CalibrationGauge } from "@/components/ui/CalibrationGauge";

import { StatCard } from "@/components/dashboard/StatCard";
import { NoActivePredictions, NoPredictions } from "@/components/ui/empty-state";
import { StatCardSkeleton, PredictionRowSkeleton } from "@/components/ui/skeleton-cards";
import { Target, Percent, Trophy, TrendingUp, LayoutDashboard, Clock, CheckCircle, Coins, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { usePointsBalance } from "@/hooks/usePointsBalance";
import { useUserPredictions } from "@/hooks/useUserPredictions";
import { useMarkets } from "@/hooks/useMarkets";
import { useMemo, useState } from "react";
import { buildSettlePredictionTx, buildClaimAllTx } from "@/lib/calibr-transactions";
import { toast } from "sonner";

export default function DashboardPage() {
  const { isConnected, reputation, tier, address, userProfile, signAndExecuteTransaction } = useWallet();
  const { data: pointsBalance, isLoading: isLoadingPoints } = usePointsBalance();
  const { data: predictions, isLoading: isLoadingPredictions, refetch: refetchPredictions } = useUserPredictions();
  const { data: markets } = useMarkets();
  const [isClaiming, setIsClaiming] = useState(false);

  // Calculate stats from real data
  const stats = useMemo(() => {
    if (!predictions) return {
      totalPredictions: 0,
      activePredictions: 0,
      winRate: 0,
      avgConfidence: 0,
      netProfit: 0
    };

    const active = predictions.filter(p => p.status === "active");
    const resolved = predictions.filter(p => p.status !== "active");
    const won = resolved.filter(p => p.status === "won");

    const winRate = resolved.length > 0
      ? Math.round((won.length / resolved.length) * 100)
      : 0;

    const avgConfidence = predictions.length > 0
      ? Math.round(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length)
      : 0;

    const netProfit = resolved.reduce((sum, p) => {
      if (p.profit) return sum + p.profit;
      if (p.loss) return sum - p.loss;
      return sum;
    }, 0);

    return {
      totalPredictions: predictions.length,
      activePredictions: active.length,
      winRate,
      avgConfidence,
      netProfit
    };
  }, [predictions]);

  // Get market for a prediction
  const getMarket = (marketId: string) => markets?.find(m => m.id === marketId);

  // Identify predictions that can be claimed (Market Resolved + Prediction Active)
  const claimablePredictions = useMemo(() => {
    if (!predictions || !markets) return [];
    return predictions.filter(p => {
      const market = markets.find(m => m.id === p.marketId);
      return p.status === "active" && market?.status === "resolved";
    });
  }, [predictions, markets]);

  const activePredictions = predictions?.filter(p => p.status === "active") || [];
  const resolvedPredictions = predictions?.filter(p => p.status !== "active") || [];

  // --- Handlers ---

  const handleClaim = async (prediction: any) => {
    if (!userProfile) {
      toast.error("User profile not found");
      return;
    }
    if (!pointsBalance) {
      toast.error("Points balance not found");
      return;
    }

    try {
      const market = getMarket(prediction.marketId);
      if (!market) return;

      setIsClaiming(true);
      // Corrected: Pass pointsBalance.id
      const tx = buildSettlePredictionTx(userProfile.id, prediction.predictionId, market.id, pointsBalance.id);

      const result = await signAndExecuteTransaction(tx);
      if (result) {
        toast.success("Winnings claimed successfully! Points added.");
        refetchPredictions();
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to claim winnings");
    } finally {
      setIsClaiming(false);
    }
  };

  const handleClaimAll = async () => {
    if (!userProfile) return;
    if (!pointsBalance) {
      toast.error("Points balance not found");
      return;
    }

    try {
      setIsClaiming(true);
      const claims = claimablePredictions.map(p => ({
        profileId: userProfile.id,
        predictionId: p.predictionId,
        marketId: p.marketId
      }));

      // Corrected: Pass pointsBalance.id
      const tx = buildClaimAllTx(claims, pointsBalance.id);

      const result = await signAndExecuteTransaction(tx);
      if (result) {
        toast.success(`Claimed ${claims.length} predictions! Points added.`);
        refetchPredictions();
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to claim all winnings");
    } finally {
      setIsClaiming(false);
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="container py-8 md:py-12">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <LayoutDashboard className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Connect Your Wallet</h1>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to view your dashboard and predictions.
          </p>
        </div>
      </div>
    );
  }

  const isLoading = isLoadingPoints || isLoadingPredictions;

  return (
    <div className="container py-8 md:py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <h1 className="mb-0">Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Track your markets and calibration performance.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-12">
          {/* Stats Skeletons */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>

          {/* Active Markets Skeletons */}
          <div className="space-y-4">
            <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <PredictionRowSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Claim All Banner */}
          {claimablePredictions.length > 0 && (
            <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-amber-500/20 rounded-xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/20 rounded-full text-amber-600">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-amber-900 dark:text-amber-100">
                    You have {claimablePredictions.length} winning predictions!
                  </h3>
                  <p className="text-muted-foreground">
                    Market resolutions are in. Claim your points and burn the losses.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleClaimAll}
                disabled={isClaiming}
                className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-white shadow-lg gap-2"
              >
                {isClaiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                Claim All ({claimablePredictions.length})
              </Button>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-12">
            <StatCard
              label="Points Balance"
              value={pointsBalance?.balance.toLocaleString() || "0"}
              icon={Coins}
            />
            <StatCard
              label="Total Predictions"
              value={stats.totalPredictions}
              icon={Target}
            />
            <StatCard
              label="Average Confidence"
              value={`${stats.avgConfidence}%`}
              icon={Percent}
            />
            <StatCard
              label="Win Rate"
              value={`${stats.winRate}%`}
              icon={Trophy}
              trend={stats.winRate >= 50 ? "up" : undefined}
            />
            {/* Enhanced Reputation Card with CalibrationGauge */}
            <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-sm font-medium text-muted-foreground">Reputation</span>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex flex-col items-center justify-center py-2 relative z-10">
                <CalibrationGauge
                  score={reputation}
                  size="md"
                  showLabel={true}
                  animated={true}
                />
              </div>

              {/* Background Glow Effect */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, ${reputation > 850 ? 'rgba(168, 85, 247, 0.1)' :
                    reputation >= 700 ? 'rgba(59, 130, 246, 0.1)' :
                      'rgba(148, 163, 184, 0.05)'
                    } 0%, transparent 70%)`
                }}
              />
            </div>
          </div>

          <div className="space-y-10">
            {/* Active Predictions */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-500/10">
                    <Clock className="h-4 w-4 text-blue-500" />
                  </div>
                  <h2 className="text-xl font-semibold">Active Markets</h2>
                </div>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {activePredictions.length} active
                </span>
              </div>
              {activePredictions.length > 0 ? (
                <div className="space-y-3">
                  {activePredictions.map((prediction, index) => {
                    const market = getMarket(prediction.marketId);
                    const isResolved = market?.status === "resolved";

                    // Logic for button visibility
                    let showClaim = false;
                    let claimLabel = "Claim Payout";
                    let claimVariant = "default"; // green-ish

                    if (isResolved && market && typeof market.outcome === 'boolean') {
                      const won = prediction.side === market.outcome;
                      if (won) {
                        showClaim = true;
                        claimLabel = "Claim Winnings";
                      } else if (prediction.risk < prediction.stake) {
                        showClaim = true;
                        claimLabel = "Reclaim Stake";
                        claimVariant = "secondary"; // gray/red-ish hint
                      }
                    } else if (isResolved) {
                      // Fallback if outcome missing
                      showClaim = true;
                    }

                    return (
                      <Link
                        key={prediction.predictionId}
                        href={`/market/${prediction.marketId}`}
                        className="block animate-fade-in group"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className={`bg-card border rounded-xl p-5 transition-all hover:shadow-md ${showClaim ? "border-amber-500/50 shadow-sm ring-1 ring-amber-500/20" : "border-border hover:border-primary/30"}`}>
                          <div className="flex items-start justify-between gap-4">
                            {/* Left: Market Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base mb-3 group-hover:text-primary transition-colors line-clamp-2">
                                {market?.question || `Market ${prediction.marketId.slice(0, 8)}...`}
                              </p>

                              {/* Position & Stats Row */}
                              <div className="flex flex-wrap items-center gap-3">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${prediction.side ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                                  {prediction.side ? "↑ YES" : "↓ NO"}
                                </span>
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                  {prediction.confidence}% confident
                                </span>
                                <span className="text-xs font-medium text-foreground">
                                  {prediction.stake} pts at risk
                                </span>
                              </div>
                            </div>

                            {/* Right: Action */}
                            <div className="shrink-0">
                              {showClaim ? (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleClaim(prediction);
                                  }}
                                  disabled={isClaiming}
                                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-sm gap-1.5"
                                >
                                  {isClaiming ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Sparkles className="w-3 h-3" /> {claimLabel}</>}
                                </Button>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                  Awaiting
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl">
                  <NoActivePredictions />
                </div>
              )}
            </section>

            {/* Resolved Markets */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-purple-500/10">
                    <CheckCircle className="h-4 w-4 text-purple-500" />
                  </div>
                  <h2 className="text-xl font-semibold">Resolved Markets</h2>
                </div>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  {resolvedPredictions.length} settled
                </span>
              </div>
              {resolvedPredictions.length > 0 ? (
                <div className="space-y-3">
                  {resolvedPredictions.map((prediction, index) => (
                    <Link
                      key={prediction.predictionId}
                      href={`/market/${prediction.marketId}`}
                      className="block animate-fade-in group"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className={`bg-card border rounded-xl p-5 transition-all hover:shadow-md ${prediction.status === "won" ? "border-green-500/30 hover:border-green-500/50" : "border-red-500/20 hover:border-red-500/40"}`}>
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: Market Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base mb-3 group-hover:text-primary transition-colors line-clamp-2">
                              {getMarket(prediction.marketId)?.question}
                            </p>

                            {/* Position & Stats Row */}
                            <div className="flex flex-wrap items-center gap-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${prediction.side ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                                {prediction.side ? "↑ YES" : "↓ NO"}
                              </span>
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                {prediction.confidence}% confident
                              </span>
                              <span className="text-xs font-medium text-foreground">
                                {prediction.stake} pts staked
                              </span>
                            </div>
                          </div>

                          {/* Right: Results Panel */}
                          <div className="shrink-0 flex flex-col items-end gap-2">
                            {/* Outcome Badge */}
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${prediction.status === "won"
                              ? "bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30"
                              : "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                              }`}>
                              {prediction.status === "won" ? "✓ Won" : "✗ Lost"}
                            </span>

                            {/* Points & Rep Changes */}
                            <div className="flex items-center gap-3 text-sm">
                              {/* Points */}
                              <div className="flex items-center gap-1">
                                <Coins className="w-3.5 h-3.5 text-muted-foreground" />
                                {prediction.profit !== undefined && prediction.profit > 0 ? (
                                  <span className="font-bold text-green-600 dark:text-green-400">+{prediction.profit}</span>
                                ) : prediction.loss !== undefined && prediction.loss > 0 ? (
                                  <span className="font-bold text-red-600 dark:text-red-400">-{prediction.loss}</span>
                                ) : (
                                  <span className="font-medium text-muted-foreground">+0</span>
                                )}
                              </div>

                              {/* Rep */}
                              {prediction.reputationChange !== undefined && (
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className={`font-bold ${prediction.reputationChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                    {prediction.reputationChange >= 0 ? "+" : ""}{prediction.reputationChange}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl">
                  <NoPredictions />
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
