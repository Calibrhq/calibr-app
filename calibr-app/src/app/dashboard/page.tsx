"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { NoActivePredictions, NoPredictions } from "@/components/ui/empty-state";
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

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
            <StatCard
              label="Reputation"
              value={reputation}
              icon={TrendingUp}
              sublabel={tier !== "New" ? tier : undefined}
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
                  {activePredictions.map((prediction, index) => {
                    const market = getMarket(prediction.marketId);
                    const isClaimable = market?.status === "resolved";

                    return (
                      <div
                        key={prediction.predictionId}
                        className="block animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className={`bg-card border rounded-xl p-4 transition-colors ${isClaimable ? "border-amber-500/50 shadow-sm" : "border-border"}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <Link href={`/market/${prediction.marketId}`} className="hover:underline">
                                <p className="font-medium text-sm mb-1">
                                  {market?.question || `Market ${prediction.marketId.slice(0, 8)}...`}
                                </p>
                              </Link>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className={prediction.side ? "text-green-500" : "text-red-500"}>
                                  {prediction.side ? "YES" : "NO"}
                                </span>
                                <span>{prediction.confidence}% confidence</span>
                                <span>{prediction.stake} pts staked</span>
                              </div>
                            </div>

                            {isClaimable ? (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleClaim(prediction);
                                }}
                                disabled={isClaiming}
                                className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20"
                              >
                                {isClaiming ? <Loader2 className="w-3 h-3 animate-spin" /> : "Claim Payout"}
                              </Button>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded">
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
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
                    <Link
                      key={prediction.predictionId}
                      href={`/market/${prediction.marketId}`}
                      className="block animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm mb-1">
                              {getMarket(prediction.marketId)?.question}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className={prediction.side ? "text-green-500" : "text-red-500"}>
                                {prediction.side ? "YES" : "NO"}
                              </span>
                              <span>{prediction.confidence}% confidence</span>
                              {prediction.profit && (
                                <span className="text-green-500">+{prediction.profit} pts</span>
                              )}
                              {prediction.loss && (
                                <span className="text-red-500">-{prediction.loss} pts</span>
                              )}
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded ${prediction.status === "won"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                            }`}>
                            {prediction.status === "won" ? "Won" : "Lost"}
                          </span>
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
