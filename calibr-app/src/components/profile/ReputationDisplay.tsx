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
    <div className="grid md:grid-cols-2 gap-6 items-stretch">
      {/* Left Column: Score & Badge */}
      <div className="flex flex-col items-center justify-center space-y-8 p-6 bg-card border border-border rounded-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial opacity-30 pointer-events-none" />

        {/* Header (Optional, but nice to have Context) */}
        <div className="absolute top-4 left-4 flex items-center gap-2 text-muted-foreground">
          <Award className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Reputation Status</span>
        </div>

        {/* Main Score Display */}
        <div className="relative mt-4">
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

        {/* Tier Badge */}
        <div className={cn(
          "inline-flex items-center gap-3 px-5 py-3 rounded-xl border max-w-xs w-full justify-center transition-colors",
          info.bgColor,
          info.borderColor
        )}>
          <TierIcon className={cn("h-5 w-5", info.textColor)} />
          <div className="text-left">
            <span className={cn("font-semibold block leading-none mb-1", info.textColor)}>{info.label}</span>
            <p className="text-xs text-muted-foreground leading-none">{info.description}</p>
          </div>
        </div>
      </div>

      {/* Right Column: Confidence Cap Card (Self Contained) */}
      <div className="w-full bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-r from-muted/50 to-transparent border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold">Confidence Cap</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono-numbers text-primary block leading-none">
                {maxConfidence}%
              </span>
              <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Current Limit</span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-6 flex-1 flex flex-col justify-center">
          {/* Visual Tier Timeline */}
          <div className="relative space-y-0 pl-2">
            {/* Vertical Line */}
            <div className="absolute left-[15px] top-4 bottom-8 w-0.5 bg-border pointer-events-none" />

            {confidenceTiers.map((t, i) => {
              const isUnlocked = score >= t.rep;
              const isCurrent = t.cap === maxConfidence;

              return (
                <div key={t.cap} className="relative flex items-center gap-4 py-2">
                  {/* Node */}
                  <div className={cn(
                    "relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isCurrent ? "bg-primary border-primary shadow-[0_0_0_4px_rgba(var(--primary),0.1)]" :
                      isUnlocked ? "bg-card border-primary text-primary" :
                        "bg-muted border-border text-muted-foreground"
                  )}>
                    {isUnlocked ? (
                      <Unlock className={cn("h-3.5 w-3.5", isCurrent ? "text-primary-foreground" : "")} />
                    ) : (
                      <Lock className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={cn(
                    "flex-1 p-3 rounded-lg border transition-all",
                    isCurrent ? "bg-primary/5 border-primary/20" : "border-transparent opacity-80"
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "text-sm font-medium",
                        isCurrent ? "text-primary" : isUnlocked ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {t.cap}% Max Prediction
                      </span>
                      {isCurrent && <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">ACTIVE</span>}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                      {t.rep > 0 ? `${t.rep}+ Reputation` : "No Requirement"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress to next tier */}
          {nextTier && (
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Next Unlock: <span className="text-foreground">{nextTier.cap}% Cap</span>
                </span>
                <span className="font-mono font-medium text-primary">
                  {Math.max(0, nextTier.rep - score)} rep needed
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-1000 ease-out"
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
