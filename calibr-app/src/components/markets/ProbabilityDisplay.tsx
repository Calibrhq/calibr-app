import { cn } from "@/lib/utils";

interface ProbabilityDisplayProps {
  yesPercentage: number;
  size?: "sm" | "lg";
}

export function ProbabilityDisplay({ yesPercentage, size = "lg" }: ProbabilityDisplayProps) {
  const noPercentage = 100 - yesPercentage;

  return (
    <div className={cn(
      "grid grid-cols-2 gap-4",
      size === "lg" ? "gap-6" : "gap-4"
    )}>
      <div className={cn(
        "rounded-xl p-6 text-center",
        "bg-yes-bg border border-primary/20"
      )}>
        <span className={cn(
          "block font-mono-numbers font-bold",
          size === "lg" ? "text-5xl" : "text-3xl"
        )} style={{ color: "hsl(var(--yes-color))" }}>
          {yesPercentage}%
        </span>
        <span className="text-sm text-muted-foreground mt-2 block">Yes</span>
      </div>

      <div className={cn(
        "rounded-xl p-6 text-center",
        "bg-no-bg border border-border"
      )}>
        <span className={cn(
          "block font-mono-numbers font-bold text-muted-foreground",
          size === "lg" ? "text-5xl" : "text-3xl"
        )}>
          {noPercentage}%
        </span>
        <span className="text-sm text-muted-foreground mt-2 block">No</span>
      </div>
    </div>
  );
}
