import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MarketCardProps {
  id: string;
  question: string;
  category: string;
  yesPercentage: number;
  volume: number;
  isTrending?: boolean;
  resolveDate?: string;
}

export function MarketCard({
  id,
  question,
  category,
  yesPercentage,
  volume,
  isTrending,
  resolveDate,
}: MarketCardProps) {
  const noPercentage = 100 - yesPercentage;

  const formatVolume = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
    return v.toString();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return format(new Date(dateStr), "MMM d, yyyy");
  };

  return (
    <Link href={`/market/${id}`} className="block">
      <article className="market-card group h-full">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-secondary text-secondary-foreground">
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
          <span className="text-xs text-muted-foreground font-mono-numbers whitespace-nowrap">
            {formatVolume(volume)} vol
          </span>
        </div>

        <h3 className="text-lg font-medium leading-snug mb-6 group-hover:text-primary transition-colors">
          {question}
        </h3>

        <div className="space-y-3 mt-auto">
          <div className="probability-bar">
            <div
              className="probability-bar-fill"
              style={{ width: `${yesPercentage}%` }}
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Yes</span>
              <span className={cn(
                "text-lg font-semibold font-mono-numbers",
                yesPercentage > 50 ? "text-primary" : "text-muted-foreground"
              )}>
                {yesPercentage}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-lg font-semibold font-mono-numbers",
                noPercentage > 50 ? "text-foreground" : "text-muted-foreground"
              )}>
                {noPercentage}%
              </span>
              <span className="text-sm text-muted-foreground">No</span>
            </div>
          </div>

          {resolveDate && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Resolves {formatDate(resolveDate)}
              </p>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
