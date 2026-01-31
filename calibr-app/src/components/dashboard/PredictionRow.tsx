import Link from "next/link";
import { cn } from "@/lib/utils";
import { Check, X, Clock, TrendingUp, TrendingDown, ChevronRight, ThumbsUp, ThumbsDown } from "lucide-react";

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
  const SideIcon = side === "yes" ? ThumbsUp : ThumbsDown;

  return (
    <Link
      href={`/market/${id}`}
      className={cn(
        "flex items-center justify-between p-4 rounded-xl bg-card border border-border",
        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        "transition-all duration-300 ease-out group"
      )}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Status indicator */}
        <div className={cn(
          "flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
          status === "won" && "bg-green-500/10 text-green-500 ring-1 ring-green-500/20",
          status === "lost" && "bg-red-500/10 text-red-500 ring-1 ring-red-500/20",
          status === "active" && "bg-primary/10 text-primary ring-1 ring-primary/20"
        )}>
          <StatusIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {question}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            {/* Side badge */}
            <span className={cn(
              "inline-flex items-center gap-1 text-xs font-medium capitalize px-2 py-0.5 rounded-md",
              side === "yes" 
                ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}>
              <SideIcon className="h-3 w-3" />
              {side}
            </span>
            
            {resolvedAt && (
              <span className="text-xs text-muted-foreground">
                Resolved {resolvedAt}
              </span>
            )}
            {stakeAmount && status === "active" && (
              <span className="text-xs text-muted-foreground">
                {stakeAmount} pts staked
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 ml-4">
        {/* Confidence */}
        <div className="text-right">
          <div className="flex items-center gap-1">
            <span className="text-lg font-semibold font-mono-numbers">{confidence}</span>
            <span className="text-xs text-muted-foreground">%</span>
          </div>
          <span className="text-xs text-muted-foreground">confidence</span>
        </div>

        {/* Outcome (for resolved) */}
        {status !== "active" && (
          <div className={cn(
            "text-right w-24 py-2 px-3 rounded-lg hidden md:block",
            status === "won" ? "bg-green-500/10" : "bg-red-500/10"
          )}>
            {status === "won" ? (
              <>
                <div className="flex items-center gap-1 justify-end">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-bold text-green-500 font-mono-numbers">
                    +{pointsWon}
                  </span>
                </div>
                {repGained && (
                  <span className="text-xs text-green-600/80 dark:text-green-400/80">
                    +{repGained} rep
                  </span>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 justify-end">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-bold text-red-500 font-mono-numbers">
                    -{pointsLost}
                  </span>
                </div>
                {repLost && (
                  <span className="text-xs text-red-600/80 dark:text-red-400/80">
                    -{repLost} rep
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {/* Arrow indicator */}
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}
