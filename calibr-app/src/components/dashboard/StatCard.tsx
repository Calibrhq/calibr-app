import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  sublabel?: string;
}

export function StatCard({ label, value, icon: Icon, trend, sublabel }: StatCardProps) {
  return (
    <div className={cn(
      "bg-card border border-border rounded-xl p-5 card-interactive",
      "transition-all duration-300 ease-out",
      "hover:shadow-lg hover:-translate-y-0.5"
    )}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && (
          <div className={cn(
            "p-2 rounded-lg transition-colors",
            trend === "up" && "bg-green-500/10",
            trend === "down" && "bg-red-500/10",
            !trend && "bg-secondary"
          )}>
            <Icon className={cn(
              "h-4 w-4",
              trend === "up" && "text-green-500",
              trend === "down" && "text-red-500",
              !trend && "text-muted-foreground"
            )} />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn(
          "text-2xl font-semibold font-mono-numbers",
          trend === "up" && "text-green-500",
          trend === "down" && "text-red-500"
        )}>
          {value}
        </span>
      </div>
      {sublabel && (
        <div className="flex items-center gap-1 mt-2">
          {trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
          {trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
          <span className={cn(
            "text-xs",
            trend === "up" && "text-green-500",
            trend === "down" && "text-red-500",
            trend === "neutral" && "text-muted-foreground",
            !trend && "text-muted-foreground"
          )}>
            {sublabel}
          </span>
        </div>
      )}
    </div>
  );
}
