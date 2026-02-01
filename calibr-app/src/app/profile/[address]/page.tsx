"use client";

import { useMemo } from "react";
import { ReputationDisplay } from "@/components/profile/ReputationDisplay";
import { ReputationChart } from "@/components/profile/ReputationChart";
import { ConfidenceAccuracyChart } from "@/components/profile/ConfidenceAccuracyChart";
import { TrendingUp, TrendingDown, Award, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useUserPredictions } from "@/hooks/useUserPredictions";
import { useLeaderboard } from "@/hooks/useLeaderboard";

export default function PublicProfilePage({ params }: { params: { address: string } }) {
    const { address: myAddress } = useWallet();
    // Decode address in case of URL encoding
    const address = decodeURIComponent(params.address);
    const isMe = myAddress === address;

    const { data: predictions, isLoading: isLoadingPredictions } = useUserPredictions(address);
    const { data: leaderboardData, isLoading: isLoadingLeaderboard } = useLeaderboard(null);

    const userStats = leaderboardData?.find(u => u.address === address);

    // Calculate stats and chart data from real predictions
    const {
        reputationHistory,
        confidenceAccuracy,
        bestPredictions,
        worstPredictions,
        netProfit
    } = useMemo(() => {
        // If we have leaderboard stats, use that reputation as "Current"
        const currentRep = userStats?.reputation || 700;

        if (!predictions || predictions.length === 0) {
            return {
                reputationHistory: [{ date: "Now", score: currentRep }],
                confidenceAccuracy: [],
                bestPredictions: [],
                worstPredictions: [],
                netProfit: 0
            };
        }

        const resolved = predictions.filter(p => p.status !== "active");

        // Build reputation history
        const repHistory = [
            { date: "Start", score: 700 },
            { date: "Now", score: currentRep }
        ];

        // Build confidence vs accuracy chart data
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
                    confidenceBuckets[bucket].actual += 100;
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

        // Worst predictions
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
            // Only count SETTLED profit/loss
            if (p.profit) return sum + p.profit;
            if (p.loss) return sum - p.loss;
            return sum;
        }, 0);

        return {
            reputationHistory: repHistory,
            confidenceAccuracy: confAccuracy,
            bestPredictions: best,
            worstPredictions: worst,
            netProfit: profit // In MIST/Points directly (as integer)
        };
    }, [predictions, userStats]);

    const isLoading = isLoadingPredictions || isLoadingLeaderboard;

    if (isLoading) {
        return (
            <div className="container py-20 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Handle case where user doesn't exist on leaderboard (no profile yet?)
    if (!userStats && !isLoading) {
        return (
            <div className="container py-20 text-center">
                <h1 className="text-2xl font-bold mb-2">User Not Found</h1>
                <p className="text-muted-foreground">This address hasn't created a profile yet.</p>
            </div>
        );
    }

    // Determine tiers/caps from userStats
    // Since we don't have exact 'maxConfidence' from wallet, we infer from tier
    let inferredMaxConf = 70;
    if (userStats?.tier === "elite") inferredMaxConf = 90;
    else if (userStats?.tier === "proven") inferredMaxConf = 80;

    return (
        <div className="container py-8 md:py-12">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    {isMe && (
                        <div className="mb-4">
                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">
                                This is you
                            </span>
                        </div>
                    )}
                    <h1 className="mb-3">Forecaster Profile</h1>
                    <p className="text-muted-foreground break-all">
                        <code className="bg-muted px-2 py-1 rounded text-sm">{address}</code>
                    </p>
                </div>

                {/* Main Reputation Display */}
                <ReputationDisplay
                    score={userStats?.reputation || 0}
                    maxConfidence={inferredMaxConf}
                    tier={userStats?.tier || "new"}
                />

                {/* Charts Section */}
                <div className="grid gap-6 md:grid-cols-2 mt-8">
                    <ReputationChart data={reputationHistory} />
                    {confidenceAccuracy.length > 0 ? (
                        <ConfidenceAccuracyChart data={confidenceAccuracy} />
                    ) : (
                        <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center">
                            <p className="text-muted-foreground text-sm text-center">
                                No predictions made yet
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
                            <h3 className="font-medium">Best Wins</h3>
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
                            <p className="text-muted-foreground text-sm">No wins recorded</p>
                        )}
                    </div>

                    {/* Worst Overconfidence */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            <h3 className="font-medium">Biggest Losses</h3>
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
                            <p className="text-muted-foreground text-sm">No losses recorded</p>
                        )}
                    </div>
                </div>

                {/* Total Profit/Loss */}
                <div className="mt-8 bg-card border border-border rounded-xl p-6 text-center">
                    <span className="text-sm text-muted-foreground block mb-2">Total Profit / Loss</span>
                    {/* Convert points (MIST/integer) to SUI if needed, but points are just points here? 
                Actually 'netProfit' here is aggregated from 'profit/loss' fields in predictions.
                In contracts, profit/loss are u64 integers (MIST). 
                If we want to show SUI, we assume / 1e9. 
                But previous profile displayed them as 'pts' (points). 
                Let's stick to points/raw integer to match existing profile.
            */}
                    <span className={`text-3xl font-bold font-mono-numbers ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {netProfit > 0 ? '+' : ''}{(netProfit / 100).toFixed(0)} {/* Showing as raw points or scaled? 
               Wait, existing profile used pure `netProfit`. 
               Prediction profit/loss in MIST? 
               Points token has decimals? No, integer.
               Let's assume points are 1:1 integers. 
            */}
                        {netProfit} pts
                    </span>
                </div>
            </div>
        </div>
    );
}
