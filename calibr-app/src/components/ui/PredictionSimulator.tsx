"use client";

import { useState } from "react";
import { ConfidenceSliderEnhanced } from "@/components/markets/ConfidenceSliderEnhanced";
import { TrendingUp, TrendingDown, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function PredictionSimulator() {
    const [confidence, setConfidence] = useState(70);
    const [outcome, setOutcome] = useState<"correct" | "incorrect">("correct");

    // Calibr formula reference
    // Risk = 5 + (confidence - 50) * 2.5 (approx scaled to 100)
    // Actual formula from PredictionPanel: Math.max(5, Math.round(100 * (confidence - 50) / 40))
    const calculateRisk = (conf: number) => Math.max(5, Math.round(100 * (conf - 50) / 40));

    const risk = calculateRisk(confidence);
    const stake = 100;
    const protectedAmount = stake - risk;

    // Simulator logic for Reputation (Simplified Model)
    // Base gain/loss scales with risk
    const repGain = Math.round(risk * 0.8);
    const repLoss = Math.round(risk * 1.2); // Penalty is higher than gain (asymmetric)

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-soft max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    Prediction Simulator
                </h3>
                <div className="flex bg-muted/50 p-1 rounded-lg">
                    <button
                        onClick={() => setOutcome("correct")}
                        className={cn(
                            "px-3 py-1 text-sm font-medium rounded-md transition-all",
                            outcome === "correct"
                                ? "bg-green-500 text-white shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        I'm Right
                    </button>
                    <button
                        onClick={() => setOutcome("incorrect")}
                        className={cn(
                            "px-3 py-1 text-sm font-medium rounded-md transition-all",
                            outcome === "incorrect"
                                ? "bg-red-500 text-white shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        I'm Wrong
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-sm font-medium">Confidence Level</span>
                            <span className="text-sm font-bold font-mono-numbers text-primary">{confidence}%</span>
                        </div>
                        <ConfidenceSliderEnhanced
                            value={confidence}
                            onChange={setConfidence}
                            maxValue={90}
                        />
                    </div>

                    <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Fixed Stake</span>
                            <span className="font-mono-numbers">{stake} pts</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Risk Amount</span>
                            <span className="font-bold text-red-500 font-mono-numbers">{risk} pts</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Protected</span>
                            <span className="font-mono-numbers">{protectedAmount} pts</span>
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div className="flex flex-col justify-center">
                    <div className={cn(
                        "relative overflow-hidden rounded-xl p-6 text-center border-2 transition-all duration-300",
                        outcome === "correct"
                            ? "border-green-500/20 bg-green-500/5"
                            : "border-red-500/20 bg-red-500/5"
                    )}>
                        <div className="mb-2 uppercase tracking-wider text-xs font-semibold text-muted-foreground">
                            Result Impact
                        </div>

                        <div className="flex items-center justify-center gap-4 mb-4">
                            <div className="text-center">
                                <div className={cn(
                                    "text-3xl font-bold font-mono-numbers mb-1",
                                    outcome === "correct" ? "text-green-600" : "text-red-500"
                                )}>
                                    {outcome === "correct" ? `+${risk}` : `-${risk}`}
                                </div>
                                <div className="text-xs text-muted-foreground">Points</div>
                            </div>

                            <div className="h-8 w-px bg-border"></div>

                            <div className="text-center">
                                <div className={cn(
                                    "text-3xl font-bold font-mono-numbers mb-1 flex items-center gap-1",
                                    outcome === "correct" ? "text-blue-600" : "text-orange-500"
                                )}>
                                    {outcome === "correct" ? `+${repGain}` : `-${repLoss}`}
                                </div>
                                <div className="text-xs text-muted-foreground">Reputation</div>
                            </div>
                        </div>

                        <div className="text-sm">
                            {outcome === "correct" ? (
                                <p className="text-green-700 dark:text-green-400 flex items-center justify-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    High confidence wins compound fast.
                                </p>
                            ) : (
                                <p className="text-red-700 dark:text-red-400 flex items-center justify-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Overconfidence is punished heavily.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
