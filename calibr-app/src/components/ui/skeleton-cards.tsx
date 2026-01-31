"use client";

import { cn } from "@/lib/utils";
import { CSSProperties } from "react";

// Base shimmer skeleton
function Shimmer({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted rounded-lg",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        className
      )}
      style={style}
    />
  );
}

// Market card skeleton
export function MarketCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex gap-2">
          <Shimmer className="h-6 w-16" />
          <Shimmer className="h-6 w-20" />
        </div>
        <Shimmer className="h-4 w-16" />
      </div>
      <Shimmer className="h-6 w-full" />
      <Shimmer className="h-6 w-3/4" />
      <div className="space-y-3 pt-2">
        <Shimmer className="h-2 w-full rounded-full" />
        <div className="flex justify-between">
          <Shimmer className="h-5 w-16" />
          <Shimmer className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

// Stat card skeleton
export function StatCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Shimmer className="h-4 w-24" />
        <Shimmer className="h-8 w-8 rounded-lg" />
      </div>
      <Shimmer className="h-8 w-20" />
      <Shimmer className="h-3 w-16" />
    </div>
  );
}

// Prediction row skeleton
export function PredictionRowSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
      <Shimmer className="h-10 w-10 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-5 w-3/4" />
        <Shimmer className="h-4 w-1/2" />
      </div>
      <div className="flex items-center gap-3">
        <Shimmer className="h-6 w-16" />
        <Shimmer className="h-6 w-12" />
      </div>
    </div>
  );
}

// Profile header skeleton
export function ProfileHeaderSkeleton() {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <Shimmer className="h-40 w-40 rounded-full" />
      </div>
      <div className="space-y-3">
        <Shimmer className="h-6 w-32 mx-auto" />
        <Shimmer className="h-4 w-48 mx-auto" />
      </div>
      <div className="bg-card border border-border rounded-xl p-5 max-w-sm mx-auto">
        <div className="flex justify-between items-center mb-2">
          <Shimmer className="h-4 w-24" />
          <Shimmer className="h-6 w-12" />
        </div>
        <Shimmer className="h-3 w-full" />
      </div>
    </div>
  );
}

// Chart skeleton
export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <Shimmer className="h-5 w-32" />
        <Shimmer className="h-4 w-20" />
      </div>
      <Shimmer className={`w-full rounded-lg`} style={{ height }} />
    </div>
  );
}

// Leaderboard row skeleton
export function LeaderboardRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4 px-4 border-b border-border last:border-0">
      <Shimmer className="h-8 w-8 rounded-full flex-shrink-0" />
      <Shimmer className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-3 w-20" />
      </div>
      <Shimmer className="h-6 w-16" />
    </div>
  );
}

// Market detail skeleton
export function MarketDetailSkeleton() {
  return (
    <div className="space-y-8">
      <Shimmer className="h-4 w-32" />

      <div className="space-y-4">
        <div className="flex gap-3">
          <Shimmer className="h-8 w-20" />
          <Shimmer className="h-8 w-16" />
        </div>
        <Shimmer className="h-10 w-full" />
        <Shimmer className="h-10 w-3/4" />
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <Shimmer className="h-4 w-40" />
        <Shimmer className="h-20 w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <Shimmer className="h-4 w-24" />
          <Shimmer className="h-5 w-32" />
        </div>
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <Shimmer className="h-4 w-24" />
          <Shimmer className="h-5 w-32" />
        </div>
      </div>
    </div>
  );
}

// Full page loading
export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-muted" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

// Inline loading spinner
export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3",
  };

  return (
    <div className={cn(
      "rounded-full border-muted border-t-primary animate-spin",
      sizeClasses[size]
    )} />
  );
}
