"use client";

import React, { useState, useMemo } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import {
    Coins,
    ArrowRight,
    Shield,
    TrendingUp,
    Lock,
    Wallet,
    Sparkles,
    AlertCircle,
    ChevronRight
} from "lucide-react";
import Link from "next/link";
import { InfoTooltip, EducationalBanner } from "@/components/ui/InfoTooltip";
import {
    POINTS_BASE_PRICE_MIST,
    POINTS_UNIT,
    mistToSui,
    estimatePointsCost,
} from "@/lib/points-transactions";

// Preset buy amounts
const BUY_PRESETS = [
    { points: 500, label: "Starter" },
    { points: 1000, label: "Explorer" },
    { points: 2500, label: "Enthusiast" },
    { points: 5000, label: "Pro" },
];

export default function BuyPointsPage() {
    const account = useCurrentAccount();
    const [selectedPoints, setSelectedPoints] = useState(1000);
    const [customAmount, setCustomAmount] = useState("");
    const [isCustom, setIsCustom] = useState(false);

    // Calculate cost
    const pointsToBuy = isCustom ? parseInt(customAmount) || 0 : selectedPoints;
    const estimatedCost = useMemo(() => {
        if (pointsToBuy < POINTS_UNIT || pointsToBuy % POINTS_UNIT !== 0) return 0;
        return estimatePointsCost(pointsToBuy);
    }, [pointsToBuy]);

    const costInSui = mistToSui(estimatedCost);
    const pricePerPoint = costInSui / (pointsToBuy || 1);

    // How many predictions this enables
    const predictionsEnabled = Math.floor(pointsToBuy / 100);

    const handleBuyPoints = async () => {
        if (!account) {
            alert("Please connect your wallet first");
            return;
        }

        // TODO: Implement actual buy transaction after contract deployment
        alert(`Coming soon! This will purchase ${pointsToBuy} points for ~${costInSui.toFixed(4)} SUI`);
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-gradient-mesh">
                <div className="container mx-auto px-4 py-12">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
                            <ChevronRight className="w-4 h-4" />
                            <span className="text-foreground">Buy Points</span>
                        </div>
                        <h1 className="text-3xl font-bold text-foreground mb-3">
                            Buy Points
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Points are your stake in predictions. Buy with SUI, predict with confidence.
                        </p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">

                    {/* Educational Banner */}
                    <EducationalBanner
                        icon={<Sparkles className="w-5 h-5" />}
                        title="Why do I need points?"
                        variant="info"
                        content={
                            <span>
                                Points represent your &quot;judgment capacity&quot; in Calibr. Each prediction costs 100 points.
                                You earn more back when you predict correctly — your skill determines your returns, not your
                                capital. <Link href="/how-it-works" className="text-primary hover:underline">Learn more →</Link>
                            </span>
                        }
                    />

                    <div className="grid md:grid-cols-5 gap-8 mt-8">

                        {/* Left: Buy Form */}
                        <div className="md:col-span-3 space-y-6">

                            {/* Amount Selection */}
                            <div className="bg-card border border-border rounded-2xl p-6">
                                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                    <Coins className="w-5 h-5 text-primary" />
                                    Select Amount
                                    <InfoTooltip
                                        title="Points Pricing"
                                        content={
                                            <span>
                                                Points are priced via a <strong>bonding curve</strong>.
                                                Early buyers get better rates. Current base price: ~0.01 SUI per 100 points.
                                                Price increases as total supply grows.
                                            </span>
                                        }
                                    />
                                </h2>

                                {/* Preset Buttons */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                    {BUY_PRESETS.map((preset) => (
                                        <button
                                            key={preset.points}
                                            onClick={() => {
                                                setSelectedPoints(preset.points);
                                                setIsCustom(false);
                                            }}
                                            className={`p-4 rounded-xl border-2 transition-all ${!isCustom && selectedPoints === preset.points
                                                    ? "border-primary bg-primary/10"
                                                    : "border-border hover:border-primary/50"
                                                }`}
                                        >
                                            <div className="font-bold text-xl text-foreground">
                                                {preset.points.toLocaleString()}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {preset.label}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* Custom Amount */}
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

                                {/* Validation Error */}
                                {isCustom && customAmount && parseInt(customAmount) % POINTS_UNIT !== 0 && (
                                    <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
                                        <AlertCircle className="w-4 h-4" />
                                        Points must be in multiples of {POINTS_UNIT}
                                    </div>
                                )}
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
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            Price per point
                                            <InfoTooltip
                                                content="This is the current estimated price. Actual cost may vary slightly due to the bonding curve."
                                            />
                                        </span>
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

                                {/* Buy Button */}
                                <button
                                    onClick={handleBuyPoints}
                                    disabled={!account || pointsToBuy < POINTS_UNIT}
                                    className="w-full mt-6 py-4 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    {!account ? (
                                        "Connect Wallet to Buy"
                                    ) : (
                                        <>
                                            Buy {pointsToBuy.toLocaleString()} Points
                                            <ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Right: Info Cards */}
                        <div className="md:col-span-2 space-y-4">

                            {/* How it works */}
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
                                        <span><strong className="text-foreground">Build</strong> reputation for bigger returns</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Security Card */}
                            <div className="bg-card border border-border rounded-2xl p-5">
                                <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-primary" />
                                    Security
                                </h3>
                                <ul className="space-y-3 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <Lock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                        <span>
                                            <strong className="text-foreground">Non-transferable:</strong> Points can&apos;t be traded
                                            <InfoTooltip
                                                content="This prevents speculation and secondary markets. Your points, your predictions."
                                                position="left"
                                            />
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Lock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                        <span>
                                            <strong className="text-foreground">Backed by SUI:</strong> Points have real value
                                            <InfoTooltip
                                                content="All SUI spent goes to the Treasury, backing every point in circulation."
                                                position="left"
                                            />
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Lock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                        <span>
                                            <strong className="text-foreground">Redeemable:</strong> Cash out to SUI
                                            <InfoTooltip
                                                content="Skilled users (800+ rep, 20+ predictions) can redeem points back to SUI with a small fee."
                                                position="left"
                                            />
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            {/* Fair Pricing Card */}
                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-5">
                                <h3 className="font-semibold text-base mb-2 text-foreground">
                                    Fair Pricing
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Points use a <strong className="text-foreground">bonding curve</strong> — early
                                    supporters get better rates, and price grows organically with demand.
                                </p>
                                <div className="mt-3 text-xs text-muted-foreground">
                                    Base rate: ~0.01 SUI per 100 points
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
