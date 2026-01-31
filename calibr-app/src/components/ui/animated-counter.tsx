"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  formatNumber?: boolean;
}

export function AnimatedCounter({
  value,
  duration = 1000,
  className,
  prefix = "",
  suffix = "",
  decimals = 0,
  formatNumber = true,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out-cubic)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (endValue - startValue) * easeOutCubic;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  const formattedValue = formatNumber
    ? displayValue.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : displayValue.toFixed(decimals);

  return (
    <span className={cn("font-mono-numbers tabular-nums", className)}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}

// Animated percentage with visual bar
interface AnimatedPercentageProps {
  value: number;
  duration?: number;
  className?: string;
  showBar?: boolean;
  barClassName?: string;
  size?: "sm" | "md" | "lg";
}

export function AnimatedPercentage({
  value,
  duration = 1000,
  className,
  showBar = false,
  barClassName,
  size = "md",
}: AnimatedPercentageProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      setDisplayValue(value * easeOutCubic);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };

  return (
    <div className="space-y-2">
      <span className={cn("font-mono-numbers font-semibold", sizeClasses[size], className)}>
        {Math.round(displayValue)}%
      </span>
      {showBar && (
        <div className={cn("h-2 rounded-full bg-muted overflow-hidden", barClassName)}>
          <div
            className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${displayValue}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Animated reputation score with ring
interface AnimatedScoreProps {
  value: number;
  maxValue?: number;
  duration?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function AnimatedScore({
  value,
  maxValue = 1000,
  duration = 1500,
  size = 120,
  strokeWidth = 8,
  className,
}: AnimatedScoreProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<number>();

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const animProgress = Math.min(elapsed / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - animProgress, 3);
      
      setDisplayValue(Math.round(value * easeOutCubic));
      setProgress((value / maxValue) * easeOutCubic);

      if (animProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, maxValue, duration]);

  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="fill-none stroke-primary transition-all duration-300 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold font-mono-numbers">{displayValue}</span>
      </div>
    </div>
  );
}
