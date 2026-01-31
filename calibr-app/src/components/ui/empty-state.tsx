"use client";

import { cn } from "@/lib/utils";
import { LucideIcon, Search, TrendingUp, Target, FileQuestion, Inbox } from "lucide-react";
import { Button } from "./button";
import Link from "next/link";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-6 text-center",
      className
    )}>
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description}
      </p>
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button variant="outline">{action.label}</Button>
          </Link>
        ) : (
          <Button variant="outline" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}

// Preset empty states for common scenarios
export function NoMarketsFound() {
  return (
    <EmptyState
      icon={Search}
      title="No markets found"
      description="Try adjusting your filters or search query to find what you're looking for."
      action={{
        label: "Clear filters",
        onClick: () => window.location.reload(),
      }}
    />
  );
}

export function NoPredictions() {
  return (
    <EmptyState
      icon={Target}
      title="No predictions yet"
      description="Start making predictions to build your track record and reputation."
      action={{
        label: "Explore markets",
        href: "/explore",
      }}
    />
  );
}

export function NoActivePredictions() {
  return (
    <EmptyState
      icon={TrendingUp}
      title="No active predictions"
      description="All your predictions have been settled. Browse markets to make new ones."
      action={{
        label: "Find markets",
        href: "/explore",
      }}
    />
  );
}

export function PageNotFound() {
  return (
    <EmptyState
      icon={FileQuestion}
      title="Page not found"
      description="The page you're looking for doesn't exist or has been moved."
      action={{
        label: "Go home",
        href: "/",
      }}
      className="min-h-[60vh]"
    />
  );
}
