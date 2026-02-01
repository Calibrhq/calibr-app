import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted/60", className)} {...props} />;
}

// Market Card Skeleton
function MarketCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      {/* Category badge */}
      <Skeleton className="h-5 w-20 rounded-full" />

      {/* Question */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
      </div>

      {/* Yes/No bar */}
      <Skeleton className="h-3 w-full rounded-full" />

      {/* Stats row */}
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

// Dashboard Prediction Card Skeleton
function PredictionCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-2/3" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

// Profile Stats Skeleton
function ProfileStatsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Score ring placeholder */}
      <div className="flex flex-col items-center">
        <Skeleton className="h-40 w-40 rounded-full" />
        <Skeleton className="h-4 w-24 mt-4" />
      </div>

      {/* Tier badge */}
      <div className="flex justify-center">
        <Skeleton className="h-16 w-48 rounded-xl" />
      </div>

      {/* Confidence cap card */}
      <Skeleton className="h-48 w-full max-w-md mx-auto rounded-xl" />
    </div>
  );
}

// Leaderboard Row Skeleton
function LeaderboardRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border last:border-b-0">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-6 w-16" />
    </div>
  );
}

// Grid of market card skeletons
function MarketGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <MarketCardSkeleton key={i} />
      ))}
    </div>
  );
}

// List of prediction card skeletons
function PredictionListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <PredictionCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Leaderboard skeleton
function LeaderboardSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <LeaderboardRowSkeleton key={i} />
      ))}
    </div>
  );
}

export {
  Skeleton,
  MarketCardSkeleton,
  PredictionCardSkeleton,
  ProfileStatsSkeleton,
  LeaderboardRowSkeleton,
  MarketGridSkeleton,
  PredictionListSkeleton,
  LeaderboardSkeleton
};
