import Link from "next/link";
import { cn } from "@/lib/utils";
import { Check, X, Clock, TrendingUp, TrendingDown } from "lucide-react";

interface PredictionRowProps {
  id: string;
  question: string;
  side: "yes" | "no";
  confidence: number;
  status: "active" | "won" | "lost";
  resolvedAt?: string;
  pointsWon?: number;
  pointsLost?: number;
  repGained?: number;
  repLost?: number;
  stakeAmount?: number;
}

export function PredictionRow({
  id,
  question,
  side,
  confidence,
  status,
  resolvedAt,
  pointsWon,
  pointsLost,
  repGained,
  repLost,
  stakeAmount,
}: PredictionRowProps) {
  const StatusIcon = status === "won" ? Check : status === "lost" ? X : Clock;

  return (
    <Link
      href={`/market/${id}`}
      className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors group"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
          status === "won" && "bg-success/10 text-success",
          status === "lost" && "bg-destructive/10 text-destructive",
          status === "active" && "bg-primary/10 text-primary"
        )}>
          <StatusIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {question}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {resolvedAt && (
              <span className="text-xs text-muted-foreground">
                Resolved {resolvedAt}
              </span>
            )}
            {stakeAmount && status === "active" && (
              <span className="text-xs text-muted-foreground">
                Stake: {stakeAmount} pts
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
        {/* Side */}
        <div className="text-right hidden sm:block">
          <span className={cn(
            "text-sm font-medium capitalize px-2 py-0.5 rounded",
            side === "yes" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {side}
          </span>
        </div>

        {/* Confidence */}
        <div className="text-right w-14">
          <span className="text-sm font-medium font-mono-numbers">{confidence}%</span>
          <span className="text-xs text-muted-foreground block">conf.</span>
        </div>

        {/* Outcome (for resolved) */}
        {status !== "active" && (
          <div className="text-right w-20 hidden md:block">
            {status === "won" ? (
              <div className="flex items-center gap-1 justify-end">
                <TrendingUp className="h-3 w-3 text-success" />
                <span className="text-sm font-medium text-success font-mono-numbers">
                  +{pointsWon}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 justify-end">
                <TrendingDown className="h-3 w-3 text-destructive" />
                <span className="text-sm font-medium text-destructive font-mono-numbers">
                  -{pointsLost}
                </span>
              </div>
            )}
            <span className="text-xs text-muted-foreground">
              {status === "won" && repGained && `+${repGained} rep`}
              {status === "lost" && repLost && `-${repLost} rep`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
