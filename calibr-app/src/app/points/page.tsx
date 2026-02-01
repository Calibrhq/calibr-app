"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";
import { usePointsBalance } from "@/hooks/usePointsBalance";
import NextLink from "next/link";
import {
    Coins,
    ArrowRight,
    ArrowDownUp,
    Shield,
    TrendingUp,
    Lock,
    Wallet,
    Sparkles,
    AlertCircle,
    ChevronRight,
    AlertTriangle,
    CheckCircle
} from "lucide-react";
import { InfoTooltip, EducationalBanner } from "@/components/ui/InfoTooltip";
import {
    POINTS_BASE_PRICE_MIST,
    POINTS_UNIT,
    mistToSui,
    estimatePointsCost,
    POINTS_ECONOMY_OBJECTS,
    buildBuyPointsTx,
    buildCreateBalanceAndBuyPointsTx,
    buildRedeemPointsTx,
    estimateRedemptionPayout,
    REDEMPTION_REQUIREMENTS
} from "@/lib/points-transactions";
import { DEFAULT_NETWORK } from "@/lib/sui-config";

// Preset buy amounts
const BUY_PRESETS = [
    { points: 500, label: "Starter" },
    { points: 1000, label: "Explorer" },
    { points: 2500, label: "Enthusiast" },
    { points: 5000, label: "Pro" },
];

export default function PointsPage() {
    const { isConnected, signAndExecuteTransaction, reputation, userProfile } = useWallet();
    const { data: pointsBalance, isLoading: isLoadingBalance } = usePointsBalance();

    // Tab state
    const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");

    // Buy state
    const [selectedPoints, setSelectedPoints] = useState(1000);
    const [customAmount, setCustomAmount] = useState("");
    const [isCustom, setIsCustom] = useState(false);
    const [isBuying, setIsBuying] = useState(false);

    // Sell state
    const [sellAmount, setSellAmount] = useState("");
    const [isSelling, setIsSelling] = useState(false);

    // Buy calculations
    const pointsToBuy = isCustom ? parseInt(customAmount) || 0 : selectedPoints;
    const estimatedCostMist = useMemo(() => {
        if (pointsToBuy < POINTS_UNIT || pointsToBuy % POINTS_UNIT !== 0) return 0;
        return estimatePointsCost(pointsToBuy);
    }, [pointsToBuy]);
    const costInSui = mistToSui(estimatedCostMist);
    const pricePerPoint = costInSui / (pointsToBuy || 1);
    const predictionsEnabled = Math.floor(pointsToBuy / 100);

    // Sell calculations
    const pointsToSell = parseInt(sellAmount) || 0;
    const sellPayout = useMemo(() => {
        if (pointsToSell < POINTS_UNIT || pointsToSell % POINTS_UNIT !== 0) {
            return { grossMist: 0, feeMist: 0, netMist: 0 };
        }
        return estimateRedemptionPayout(pointsToSell);
    }, [pointsToSell]);

    // Eligibility check (simplified - real check happens on-chain)
    const currentBalance = pointsBalance?.balance || 0;
    const maxRedeemable = Math.floor(currentBalance * 0.1 / 100) * 100; // 10% limit, rounded to 100
    const meetsReputationReq = reputation >= REDEMPTION_REQUIREMENTS.minReputation;
    // Note: We can't check predictions count or epochs held from frontend easily
    // The contract will validate on-chain

    const handleBuyPoints = async () => {
        if (!isConnected) {
            toast.error("Please connect your wallet first");
            return;
        }

        if (pointsToBuy < POINTS_UNIT || pointsToBuy % POINTS_UNIT !== 0) {
            toast.error(`Points must be purchased in multiples of ${POINTS_UNIT}`);
            return;
        }

        try {
            setIsBuying(true);
            const economyIds = POINTS_ECONOMY_OBJECTS[DEFAULT_NETWORK as keyof typeof POINTS_ECONOMY_OBJECTS];

            if (!economyIds.treasury || !economyIds.marketConfig) {
                toast.error("Contract configuration missing for this network");
                setIsBuying(false);
                return;
            }

            // Add 10% buffer to cost estimate to account for bonding curve price increases
            const costWithBuffer = Math.ceil(estimatedCostMist * 1.1);

            console.log("💰 Buy Points Debug:", {
                pointsToBuy,
                estimatedCostMist,
                costWithBuffer,
                hasExistingBalance: !!pointsBalance,
                balanceId: pointsBalance?.id,
                treasury: economyIds.treasury,
                marketConfig: economyIds.marketConfig,
            });

            let tx;
            if (pointsBalance) {
                tx = buildBuyPointsTx(
                    economyIds.treasury,
                    economyIds.marketConfig,
                    pointsBalance.id,
                    costWithBuffer,
                    pointsToBuy
                );
            } else {
                if (!economyIds.balanceRegistry) {
                    toast.error("Balance Registry ID missing");
                    setIsBuying(false);
                    return;
                }
                tx = buildCreateBalanceAndBuyPointsTx(
                    economyIds.treasury,
                    economyIds.marketConfig,
                    economyIds.balanceRegistry,
                    costWithBuffer,
                    pointsToBuy
                );
            }

            const result = await signAndExecuteTransaction(tx);

            if (result && result.digest) {
                toast.success(`Successfully purchased ${pointsToBuy} points!`);
            }
        } catch (error: any) {
            console.error("Buy points error:", error);
            // Try to extract useful error message
            const errorMsg = error?.message || "Transaction failed";
            if (errorMsg.includes("513")) {
                toast.error("You already have a points balance. Please refresh the page.");
            } else if (errorMsg.includes("510")) {
                toast.error("Insufficient payment. Try a smaller amount.");
            } else {
                toast.error(errorMsg.substring(0, 100));
            }
        } finally {
            setIsBuying(false);
        }
    };

    const handleSellPoints = async () => {
        if (!isConnected) {
            toast.error("Please connect your wallet first");
            return;
        }

        if (!pointsBalance) {
            toast.error("No points balance found");
            return;
        }

        if (!userProfile?.id) {
            toast.error("No profile found");
            return;
        }

        if (pointsToSell < POINTS_UNIT || pointsToSell % POINTS_UNIT !== 0) {
            toast.error(`Points must be sold in multiples of ${POINTS_UNIT}`);
            return;
        }

        if (pointsToSell > currentBalance) {
            toast.error("Insufficient balance");
            return;
        }

        try {
            setIsSelling(true);
            const economyIds = POINTS_ECONOMY_OBJECTS[DEFAULT_NETWORK as keyof typeof POINTS_ECONOMY_OBJECTS];

            if (!economyIds.treasury || !economyIds.marketConfig) {
                toast.error("Contract configuration missing");
                setIsSelling(false);
                return;
            }

            const tx = buildRedeemPointsTx(
                userProfile.id,
                pointsBalance.id,
                economyIds.treasury,
                economyIds.marketConfig,
                pointsToSell
            );

            const result = await signAndExecuteTransaction(tx);

            if (result && result.digest) {
                toast.success(`Successfully redeemed ${pointsToSell} points for ~${mistToSui(sellPayout.netMist).toFixed(4)} SUI!`);
                setSellAmount("");
            }
        } catch (error: any) {
            console.error(error);
            // Parse specific errors
            if (error.message?.includes("520")) {
                toast.error("Reputation too low (need 800+)");
            } else if (error.message?.includes("521")) {
                toast.error("Need at least 20 settled predictions");
            } else if (error.message?.includes("522")) {
                toast.error("Points must be held for 4+ epochs");
            } else if (error.message?.includes("523")) {
                toast.error("Weekly redemption limit exceeded");
            } else {
                toast.error("Redemption failed");
            }
        } finally {
            setIsSelling(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-gradient-mesh">
                <div className="container mx-auto px-4 py-12">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                            <NextLink href="/" className="hover:text-foreground transition-colors">Home</NextLink>
                            <ChevronRight className="w-4 h-4" />
                            <span className="text-foreground">Points</span>
                        </div>
                        <h1 className="text-3xl font-bold text-foreground mb-3">
                            Points Exchange
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Buy points to make predictions, or sell them back to SUI.
                        </p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">

                    {/* Current Balance */}
                    {isConnected && (
                        <div className="bg-card border border-border rounded-2xl p-6 mb-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-xl bg-amber-500/10">
                                        <Coins className="w-6 h-6 text-amber-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Your Points Balance</p>
                                        <p className="text-3xl font-bold font-mono-numbers">
                                            {isLoadingBalance ? "..." : currentBalance.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right text-sm text-muted-foreground">
                                    <p>≈ {Math.floor(currentBalance / 100)} predictions</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setActiveTab("buy")}
                            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${activeTab === "buy"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                        >
                            <Wallet className="w-4 h-4 inline-block mr-2" />
                            Buy Points
                        </button>
                        <button
                            onClick={() => setActiveTab("sell")}
                            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${activeTab === "sell"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                        >
                            <ArrowDownUp className="w-4 h-4 inline-block mr-2" />
                            Sell Points
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === "buy" ? (
                        /* BUY TAB */
                        <div className="grid md:grid-cols-5 gap-8">
                            <div className="md:col-span-3 space-y-6">
                                {/* Amount Selection */}
                                <div className="bg-card border border-border rounded-2xl p-6">
                                    <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                        <Coins className="w-5 h-5 text-primary" />
                                        Select Amount
                                    </h2>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                                        {BUY_PRESETS.map((preset) => (
                                            <button
                                                key={preset.points}
                                                onClick={() => {
                                                    setSelectedPoints(preset.points);
                                                    setIsCustom(false);
                                                }}
                                                className={`p-3 rounded-lg border-2 transition-all ${!isCustom && selectedPoints === preset.points
                                                    ? "border-primary bg-primary/10"
                                                    : "border-border hover:border-primary/50"
                                                    }`}
                                            >
                                                <div className="font-bold text-lg text-foreground">
                                                    {preset.points.toLocaleString()}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {preset.label}
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setIsCustom(true)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isCustom
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground hover:bg-primary/10"
                                                }`}
                                        >
                                            Custom
                                        </button>
                                        {isCustom && (
                                            <input
                                                type="number"
                                                min={POINTS_UNIT}
                                                step={POINTS_UNIT}
                                                value={customAmount}
                                                onChange={(e) => setCustomAmount(e.target.value)}
                                                placeholder={`Multiple of ${POINTS_UNIT}`}
                                                className="flex-1 px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Cost Summary */}
                                <div className="bg-card border border-border rounded-2xl p-6">
                                    <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                        <Wallet className="w-5 h-5 text-primary" />
                                        Cost Summary
                                    </h2>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-muted-foreground">Points to buy</span>
                                            <span className="font-semibold text-foreground">{pointsToBuy.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-muted-foreground">Price per point</span>
                                            <span className="font-mono text-sm text-foreground">
                                                ~{pricePerPoint.toFixed(6)} SUI
                                            </span>
                                        </div>
                                        <div className="border-t border-border pt-3">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-foreground">Total Cost</span>
                                                <span className="font-bold text-2xl text-primary">
                                                    ~{costInSui.toFixed(4)} SUI
                                                </span>
                                            </div>
                                            <div className="text-sm text-muted-foreground text-right mt-1">
                                                Enables {predictionsEnabled} predictions
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleBuyPoints}
                                        disabled={!isConnected || pointsToBuy < POINTS_UNIT || isBuying}
                                        className="w-full mt-6 py-4 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        {!isConnected ? (
                                            "Connect Wallet to Buy"
                                        ) : isBuying ? (
                                            "Processing..."
                                        ) : (
                                            <>
                                                Buy {pointsToBuy.toLocaleString()} Points
                                                <ArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Right sidebar - Buy info */}
                            <div className="md:col-span-2 space-y-4">
                                <div className="bg-card border border-border rounded-2xl p-5">
                                    <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-primary" />
                                        How Points Work
                                    </h3>
                                    <ul className="space-y-3 text-sm text-muted-foreground">
                                        <li className="flex items-start gap-2">
                                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                                            <span><strong className="text-foreground">Buy</strong> points with SUI</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                                            <span><strong className="text-foreground">Stake</strong> 100 points per prediction</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                                            <span><strong className="text-foreground">Earn</strong> more back when correct</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                                            <span><strong className="text-foreground">Sell</strong> back to SUI when qualified</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-5">
                                    <h3 className="font-semibold text-base mb-2 text-foreground">
                                        Fair Pricing
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Points use a <strong className="text-foreground">bonding curve</strong> — early supporters get better rates.
                                    </p>
                                    <div className="mt-3 text-xs text-muted-foreground">
                                        Base rate: ~0.01 SUI per 100 points
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* SELL TAB */
                        <div className="grid md:grid-cols-5 gap-8">
                            {/* Left: Sell Form Only */}
                            <div className="md:col-span-3 space-y-6">

                                {/* Sell Amount */}
                                <div className="bg-card border border-border rounded-2xl p-6">
                                    <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                        <ArrowDownUp className="w-5 h-5 text-primary" />
                                        Sell Points
                                    </h2>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm text-muted-foreground mb-2 block">
                                                Amount to sell (multiple of {POINTS_UNIT})
                                            </label>
                                            <input
                                                type="number"
                                                min={POINTS_UNIT}
                                                step={POINTS_UNIT}
                                                max={currentBalance}
                                                value={sellAmount}
                                                onChange={(e) => setSellAmount(e.target.value)}
                                                placeholder="Enter amount..."
                                                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>

                                        {/* Quick select buttons */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setSellAmount(String(Math.min(100, currentBalance)))}
                                                className="px-3 py-1.5 text-xs bg-muted rounded-lg hover:bg-muted/80"
                                            >
                                                Min (100)
                                            </button>
                                            <button
                                                onClick={() => setSellAmount(String(maxRedeemable))}
                                                className="px-3 py-1.5 text-xs bg-muted rounded-lg hover:bg-muted/80"
                                            >
                                                Max ({maxRedeemable})
                                            </button>
                                        </div>
                                    </div>

                                    {/* Payout Summary */}
                                    {pointsToSell >= POINTS_UNIT && (
                                        <div className="mt-6 p-4 bg-muted/50 rounded-xl space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Points to sell</span>
                                                <span className="font-medium">{pointsToSell.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Gross value</span>
                                                <span className="font-mono">{mistToSui(sellPayout.grossMist).toFixed(4)} SUI</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-red-500">
                                                <span>Fee (5%)</span>
                                                <span className="font-mono">-{mistToSui(sellPayout.feeMist).toFixed(4)} SUI</span>
                                            </div>
                                            <div className="border-t border-border pt-2 flex justify-between">
                                                <span className="font-semibold">You receive</span>
                                                <span className="font-bold text-lg text-green-500">
                                                    ~{mistToSui(sellPayout.netMist).toFixed(4)} SUI
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleSellPoints}
                                        disabled={!isConnected || !pointsBalance || pointsToSell < POINTS_UNIT || pointsToSell > currentBalance || isSelling}
                                        className="w-full mt-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:bg-muted disabled:from-muted disabled:to-muted disabled:text-muted-foreground text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        {!isConnected ? (
                                            "Connect Wallet"
                                        ) : isSelling ? (
                                            "Processing..."
                                        ) : pointsToSell < POINTS_UNIT ? (
                                            "Enter amount to sell"
                                        ) : (
                                            <>
                                                Sell {pointsToSell.toLocaleString()} Points
                                                <ArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Right sidebar - Redemption Requirements */}
                            <div className="md:col-span-2 space-y-4">
                                <div className="bg-card border border-border rounded-2xl p-5">
                                    <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-primary" />
                                        Requirements
                                    </h3>
                                    <div className="space-y-2">
                                        <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${meetsReputationReq ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                            {meetsReputationReq ? (
                                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            ) : (
                                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                            )}
                                            <span>Rep ≥ {REDEMPTION_REQUIREMENTS.minReputation} (yours: {reputation})</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 rounded-lg text-sm bg-green-500/10">
                                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            <span>{REDEMPTION_REQUIREMENTS.minPredictions}+ predictions</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 rounded-lg text-sm bg-green-500/10">
                                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            <span>{REDEMPTION_REQUIREMENTS.minEpochsHeld} epochs hold</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 rounded-lg text-sm bg-muted">
                                            <TrendingUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            <span>{REDEMPTION_REQUIREMENTS.maxWeeklyPct}% weekly limit • 5% fee</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                                    <p className="text-sm text-muted-foreground">
                                        <strong className="text-amber-600 dark:text-amber-400">Why?</strong> Ensures only skilled predictors can cash out, prevents gaming.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
