import { cn } from "@/lib/utils";

interface ReputationDisplayProps {
  score: number;
  maxConfidence: number;
  tier: "novice" | "calibrated" | "expert" | "oracle";
}

const tierInfo = {
  novice: { label: "Novice", color: "tier-novice", description: "Building track record" },
  calibrated: { label: "Calibrated", color: "tier-calibrated", description: "Consistent accuracy" },
  expert: { label: "Expert", color: "tier-expert", description: "Proven forecaster" },
  oracle: { label: "Oracle", color: "tier-oracle", description: "Exceptional calibration" },
};

export function ReputationDisplay({ score, maxConfidence, tier }: ReputationDisplayProps) {
  const info = tierInfo[tier];

  return (
    <div className="text-center space-y-6">
      <div className="relative inline-block">
        <div className="glow-subtle rounded-full p-1">
          <div className="w-40 h-40 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 flex items-center justify-center">
            <div className="text-center">
              <span className="text-5xl font-bold font-mono-numbers">{score}</span>
              <span className="text-sm text-muted-foreground block mt-1">Reputation</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary">
          <div className={cn("w-2 h-2 rounded-full", `bg-${info.color}`)} 
               style={{ backgroundColor: `hsl(var(--${info.color}))` }} />
          <span className="text-sm font-medium">{info.label}</span>
        </div>
        <p className="text-sm text-muted-foreground">{info.description}</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 max-w-sm mx-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">Confidence Cap</span>
          <span className="text-lg font-semibold font-mono-numbers">{maxConfidence}%</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your reputation unlocks higher confidence levels. Better calibration = more range.
        </p>
      </div>
    </div>
  );
}
