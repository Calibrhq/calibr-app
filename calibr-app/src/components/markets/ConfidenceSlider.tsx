"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface ConfidenceSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  maxValue?: number;
}

export function ConfidenceSlider({ value, onChange, disabled, maxValue = 95 }: ConfidenceSliderProps) {
  const getRiskLevel = (confidence: number) => {
    if (confidence <= 60) return { label: "Low", color: "text-muted-foreground" };
    if (confidence <= 75) return { label: "Moderate", color: "text-lavender" };
    if (confidence <= 85) return { label: "High", color: "text-primary" };
    return { label: "Very High", color: "text-destructive" };
  };

  const risk = getRiskLevel(value);

  return (
    <div className="space-y-4">
      <div className="relative pt-2 pb-4">
        <div className="confidence-slider">
          <Slider
            value={[value]}
            onValueChange={(v) => onChange(v[0])}
            min={50}
            max={maxValue}
            step={5}
            disabled={disabled}
            className="w-full"
          />
        </div>

        <div className="flex justify-between mt-3 text-xs text-muted-foreground">
          <span>50%</span>
          <span>{Math.round((50 + maxValue) / 2)}%</span>
          <span>{maxValue}%</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-3xl font-bold font-mono-numbers">{value}%</span>
        <span className={cn("text-sm font-medium", risk.color)}>
          {risk.label} Risk
        </span>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Higher confidence = more at risk
      </p>
    </div>
  );
}
