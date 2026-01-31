"use client";

import { cn } from "@/lib/utils";
import { AnimatedScore, AnimatedCounter } from "@/components/ui/animated-counter";
import { Shield, Target, Award, Crown, Lock, Unlock, TrendingUp } from "lucide-react";

interface ReputationDisplayProps {
  score: number;
  maxConfidence: number;
  tier: string;
}

const tierInfo: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: typeof Target;
  description: string;
  nextTier: string | null;
  nextAt: number;
}> = {
  New: {
    label: "New",
    color: "gray",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/30",
    textColor: "text-gray-500",
    icon: Target,
    description: "Building your track record",
    nextTier: "Proven",
    nextAt: 700,
  },
  Proven: {
    label: "Proven",
    color: "blue",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-500",
    icon: Award,
    description: "Consistent calibration",
    nextTier: "Elite",
    nextAt: 850,
  },
  Elite: {
    label: "Elite",
    color: "purple",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    textColor: "text-purple-500",
    icon: Crown,
    description: "Exceptional forecaster",
    nextTier: null,
    nextAt: 1000,
  },
};

const confidenceTiers = [
  { rep: 0, cap: 70, label: "New" },
  { rep: 700, cap: 80, label: "Proven" },
  { rep: 850, cap: 90, label: "Elite" },
];

// Default tier info fallback
const defaultTierInfo = tierInfo.New;

export function ReputationDisplay({ score, maxConfidence, tier }: ReputationDisplayProps) {
  const info = tierInfo[tier] || defaultTierInfo;
  const TierIcon = info.icon;

  // Calculate progress to next tier
  const currentTierIndex = confidenceTiers.findIndex(t => t.cap === maxConfidence);
  const nextTier = confidenceTiers[currentTierIndex + 1];
  const prevTierRep = currentTierIndex > 0 ? confidenceTiers[currentTierIndex].rep : 0;
  const progressToNext = nextTier
    ? ((score - prevTierRep) / (nextTier.rep - prevTierRep)) * 100
    : 100;

  return (
    <div className="space-y-8">
      {/* Main Score Display */}
      <div className="flex flex-col items-center">
        <div className="relative">
          {/* Glow effect */}
          <div className={cn(
            "absolute inset-0 rounded-full blur-xl opacity-30",
            tier === "Elite" ? "bg-purple-500" : "bg-primary"
          )} />

          {/* Score Ring */}
          <AnimatedScore
            value={score}
            maxValue={1000}
            size={160}
            strokeWidth={10}
          />
        </div>

        <p className="text-sm text-muted-foreground mt-4">Reputation Score</p>
      </div>

      {/* Tier Badge */}
      <div className="flex justify-center">
        <div className={cn(
          "inline-flex items-center gap-3 px-5 py-3 rounded-xl border",
          info.bgColor,
          info.borderColor
        )}>
          <TierIcon className={cn("h-5 w-5", info.textColor)} />
          <div>
            <span className={cn("font-semibold", info.textColor)}>{info.label}</span>
            <p className="text-xs text-muted-foreground">{info.description}</p>
          </div>
        </div>
      </div>

      {/* Confidence Cap Card */}
      <div className="max-w-md mx-auto bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 bg-muted/30 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-medium">Confidence Cap</span>
            </div>
            <span className="text-2xl font-bold font-mono-numbers text-primary">
              {maxConfidence}%
            </span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Tier Progress */}
          <div className="space-y-3">
            {confidenceTiers.map((t, i) => {
              const isUnlocked = score >= t.rep;
              const isCurrent = t.cap === maxConfidence;

              return (
                <div key={t.cap} className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    isUnlocked ? "bg-primary/10" : "bg-muted"
                  )}>
                    {isUnlocked ? (
                      <Unlock className={cn("h-4 w-4", isCurrent ? "text-primary" : "text-green-500")} />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-sm font-medium",
                        isCurrent ? "text-primary" : isUnlocked ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {t.cap}% Max
                      </span>
                      <span className="text-xs text-muted-foreground font-mono-numbers">
                        {t.rep}+ rep
                      </span>
                    </div>
                    {isCurrent && (
                      <div className="text-xs text-muted-foreground">Current tier</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress to next tier */}
          {nextTier && (
            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Progress to {nextTier.cap}%
                </span>
                <span className="font-mono-numbers font-medium">
                  {nextTier.rep - score} to go
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, progressToNext))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
