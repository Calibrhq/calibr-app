import { cn } from "@/lib/utils";

interface MarketInsightPanelProps {
  yesPercentage: number;
  startDate: string;
  resolveDate: string;
  daysRemaining: number;
  hoursRemaining: number;
  status: "active" | "resolving" | "resolved";
}

export function MarketInsightPanel({
  yesPercentage,
  daysRemaining,
  hoursRemaining,
  status,
}: MarketInsightPanelProps) {
  const noPercentage = 100 - yesPercentage;

  const getSentiment = () => {
    if (yesPercentage >= 70) return { label: "Strongly Yes", color: "text-primary" };
    if (yesPercentage >= 55) return { label: "Leaning Yes", color: "text-primary/80" };
    if (yesPercentage >= 45) return { label: "Uncertain", color: "text-muted-foreground" };
    if (yesPercentage >= 30) return { label: "Leaning No", color: "text-muted-foreground" };
    return { label: "Strongly No", color: "text-muted-foreground" };
  };

  const sentiment = getSentiment();

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
      {/* Horizontal Confidence Bar */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-mono-numbers text-primary">
              {yesPercentage}%
            </span>
            <span className="text-sm text-muted-foreground">Yes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">No</span>
            <span className="text-2xl font-bold font-mono-numbers text-muted-foreground">
              {noPercentage}%
            </span>
          </div>
        </div>
        <div className="confidence-bar-horizontal">
          <div 
            className="confidence-bar-yes" 
            style={{ width: `${yesPercentage}%` }} 
          />
          <div 
            className="confidence-bar-no" 
            style={{ width: `${noPercentage}%` }} 
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
        <div>
          <span className="text-xs text-muted-foreground block mb-1">Market Sentiment</span>
          <span className={cn("text-sm font-medium", sentiment.color)}>
            {sentiment.label}
          </span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block mb-1">Time Remaining</span>
          {status === "resolved" ? (
            <span className="text-sm font-medium text-muted-foreground">Resolved</span>
          ) : status === "resolving" ? (
            <span className="text-sm font-medium text-yellow-600">Resolving soon</span>
          ) : (
            <span className="text-sm font-medium font-mono-numbers">
              {daysRemaining}d {hoursRemaining}h
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
