import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ChevronRight, Clock, TrendingUp, Users } from "lucide-react";
import { CountdownTimer } from "@/components/ui/CountdownTimer";

interface MarketCardProps {
  id: string;
  question: string;
  category: string;
  yesPercentage: number;
  volume: number;
  isTrending?: boolean;
  resolveDate?: string;
  participants?: number;
}

export function MarketCard({
  id,
  question,
  category,
  yesPercentage,
  volume,
  isTrending,
  resolveDate,
  participants,
}: MarketCardProps) {
  const noPercentage = 100 - yesPercentage;

  const formatVolume = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
    return v.toString();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    // If invalid date (e.g. "Open"), return raw string
    if (isNaN(date.getTime())) return dateStr;
    return format(date, "MMM d, yyyy");
  };

  return (
    <Link href={`/market/${id}`} className="block">
      <article className={cn(
        "market-card group h-full relative overflow-hidden",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-xl",
        "hover:shadow-primary/10"
      )}>
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-secondary text-secondary-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                {category}
              </span>
              {isTrending && (
                <span className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                  </span>
                  Trending
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono-numbers whitespace-nowrap">
              <TrendingUp className="h-3.5 w-3.5" />
              {formatVolume(volume)}
            </div>
          </div>

          <h3 className="text-lg font-medium leading-snug mb-6 group-hover:text-primary transition-colors duration-300">
            {question}
          </h3>

          <div className="space-y-3 mt-auto">
            {/* Enhanced probability bar */}
            <div className="h-3 bg-muted rounded-full overflow-hidden shadow-inner">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  "bg-gradient-to-r from-green-500 to-green-400",
                  "group-hover:shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                )}
                style={{ width: `${yesPercentage}%` }}
              />
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">Yes</span>
                <span className={cn(
                  "text-lg font-semibold font-mono-numbers transition-colors",
                  yesPercentage > 50 ? "text-green-500" : "text-muted-foreground"
                )}>
                  {yesPercentage}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-lg font-semibold font-mono-numbers transition-colors",
                  noPercentage > 50 ? "text-foreground" : "text-muted-foreground"
                )}>
                  {noPercentage}%
                </span>
                <span className="text-sm text-muted-foreground">No</span>
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
              </div>
            </div>

            {/* Footer with enhanced info */}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {resolveDate && (
                  <span className="flex items-center gap-1">
                    <CountdownTimer targetDate={resolveDate} showIcon={true} />
                  </span>
                )}
                {participants && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {participants}
                  </span>
                )}
              </div>

              {/* View indicator */}
              <span className="flex items-center gap-0.5 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                Predict
                <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
