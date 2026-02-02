"use client";

import { useState, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { AlertTriangle, Shield, Flame, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConfidenceSliderEnhancedProps {
  value: number;
  onChange: (value: number) => void;
  maxValue?: number;
  minValue?: number;
  disabled?: boolean;
}

// Calculate risk based on Calibr's formula
function calculateRisk(confidence: number): number {
  return Math.max(5, Math.round(100 * (confidence - 50) / 40));
}

// Get risk level info
function getRiskLevel(confidence: number) {
  if (confidence <= 60) {
    return {
      level: "low",
      label: "Low Risk",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30",
      icon: Shield,
      description: "Safe zone - minimal stakes if wrong",
    };
  }
  if (confidence <= 75) {
    return {
      level: "moderate",
      label: "Moderate Risk",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/30",
      icon: Info,
      description: "Balanced risk/reward",
    };
  }
  if (confidence <= 85) {
    return {
      level: "high",
      label: "High Risk",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/30",
      icon: AlertTriangle,
      description: "Significant stakes - proceed carefully",
    };
  }
  return {
    level: "extreme",
    label: "Extreme Risk",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    icon: Flame,
    description: "Maximum stakes - only if highly confident",
  };
}

export function ConfidenceSliderEnhanced({
  value,
  onChange,
  maxValue = 90,
  minValue = 50,
  disabled = false,
}: ConfidenceSliderEnhancedProps) {
  const [isHovering, setIsHovering] = useState(false);
  const risk = calculateRisk(value);
  const riskInfo = getRiskLevel(value);
  const RiskIcon = riskInfo.icon;

  // Calculate position for the tooltip
  const position = ((value - minValue) / (maxValue - minValue)) * 100;

  // Standard solid color for track
  const getTrackGradient = () => {
    return `linear-gradient(90deg, 
      hsl(var(--primary)) 0%, 
      hsl(var(--primary)) ${position}%, 
      hsl(var(--muted)) ${position}%, 
      hsl(var(--muted)) 100%
    )`;
  };

  return (
    <div className="space-y-4">
      {/* Confidence Label and Risk Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Confidence</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="w-60" side="top" align="start">
                <p className="text-xs text-muted-foreground">
                  Your confidence is capped at <span className="text-foreground font-medium">{maxValue}%</span> based on your reputation.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300",
          riskInfo.bgColor,
          riskInfo.borderColor,
          "border"
        )}>
          <RiskIcon className={cn("h-3.5 w-3.5", riskInfo.color)} />
          <span className={riskInfo.color}>{riskInfo.label}</span>
        </div>
      </div>

      {/* Slider Container */}
      <div
        className="relative pt-6 pb-2"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Floating Confidence Value */}
        <div
          className={cn(
            "absolute -top-1 transform -translate-x-1/2 transition-all duration-200",
            isHovering ? "scale-110" : "scale-100"
          )}
          style={{ left: `${position}%` }}
        >
          <div className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg",
            "bg-primary text-primary-foreground"
          )}>
            {value}%
          </div>
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-primary mx-auto" />
        </div>

        {/* Custom Slider Track */}
        <div className="relative">
          <Slider
            value={[value]}
            onValueChange={([v]) => onChange(v)}
            min={minValue}
            max={maxValue}
            step={1}
            disabled={disabled}
            className={cn(
              "confidence-slider-enhanced",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          />

          {/* Track markers */}
          <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-2 pointer-events-none">
            {[50, 60, 70, 80, 90].filter(v => v <= maxValue).map((marker) => (
              <div
                key={marker}
                className={cn(
                  "w-1 h-1 rounded-full transition-colors",
                  marker <= value ? "bg-primary-foreground/50" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>

        {/* Min/Max Labels */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{minValue}%</span>
          {maxValue < 90 && (
            <span className="text-yellow-500 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Cap: {maxValue}%
            </span>
          )}
          <span>{Math.min(maxValue, 90)}%</span>
        </div>
      </div>

      {/* Risk Indicator Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Risk at stake</span>
          <span className={cn(
            "font-mono-numbers font-bold tabular-nums transition-colors duration-300",
            riskInfo.color
          )}>{risk} pts</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out shadow-sm"
            style={{
              width: `${risk}%`,
              background: value <= 60
                ? "linear-gradient(90deg, #22c55e, #4ade80)"
                : value <= 75
                  ? "linear-gradient(90deg, #eab308, #facc15)"
                  : value <= 85
                    ? "linear-gradient(90deg, #f97316, #fb923c)"
                    : "linear-gradient(90deg, #ef4444, #f87171)",
            }}
          />
        </div>
        <p className={cn("text-xs font-medium transition-colors duration-300", riskInfo.color)}>
          {riskInfo.description}
        </p>
      </div>

      {/* Quick Select Buttons */}
      <div className="flex gap-2">
        {[50, 60, 70, 80, 90].filter(v => v <= maxValue).map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            disabled={disabled}
            className={cn(
              "flex-1 py-2 text-xs font-medium rounded-lg transition-all",
              value === preset
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {preset}%
          </button>
        ))}
      </div>
    </div>
  );
}
