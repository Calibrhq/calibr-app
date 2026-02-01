"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface CalibrationGaugeProps {
    score: number; // 0-1000
    size?: "sm" | "md" | "lg";
    showLabel?: boolean;
    animated?: boolean;
    className?: string;
}

function getTierInfo(score: number): { name: string; color: string; gradient: string } {
    if (score > 850) {
        return {
            name: "Elite",
            color: "text-purple-500",
            gradient: "from-purple-500 to-pink-500",
        };
    } else if (score >= 700) {
        return {
            name: "Proven",
            color: "text-blue-500",
            gradient: "from-blue-500 to-cyan-400",
        };
    } else {
        return {
            name: "Novice",
            color: "text-slate-400",
            gradient: "from-slate-400 to-slate-500",
        };
    }
}

export function CalibrationGauge({
    score,
    size = "md",
    showLabel = true,
    animated = true,
    className,
}: CalibrationGaugeProps) {
    const progressRef = useRef<SVGCircleElement>(null);
    const scoreRef = useRef<HTMLSpanElement>(null);

    const sizeConfig = {
        sm: { width: 64, strokeWidth: 4, fontSize: "text-lg", tierSize: "text-[10px]" },
        md: { width: 96, strokeWidth: 6, fontSize: "text-2xl", tierSize: "text-xs" },
        lg: { width: 128, strokeWidth: 8, fontSize: "text-3xl", tierSize: "text-sm" },
    };

    const config = sizeConfig[size];
    const radius = (config.width - config.strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(score / 1000, 1);
    const strokeDashoffset = circumference * (1 - progress);

    const tier = getTierInfo(score);

    useEffect(() => {
        if (!animated) return;

        // Animate the progress ring
        const circle = progressRef.current;
        if (circle) {
            circle.style.strokeDashoffset = String(circumference);
            requestAnimationFrame(() => {
                circle.style.transition = "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)";
                circle.style.strokeDashoffset = String(strokeDashoffset);
            });
        }

        // Animate the score counter
        const scoreEl = scoreRef.current;
        if (scoreEl) {
            let start = 0;
            const duration = 1500;
            const startTime = performance.now();

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Ease out cubic
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                const currentScore = Math.round(easeProgress * score);
                scoreEl.textContent = String(currentScore);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        }
    }, [score, animated, circumference, strokeDashoffset]);

    return (
        <div className={cn("relative inline-flex flex-col items-center", className)}>
            <div className="relative" style={{ width: config.width, height: config.width }}>
                {/* Background circle */}
                <svg
                    className="absolute inset-0 -rotate-90"
                    width={config.width}
                    height={config.width}
                >
                    <circle
                        cx={config.width / 2}
                        cy={config.width / 2}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={config.strokeWidth}
                        className="text-muted/20"
                    />
                    {/* Progress circle */}
                    <circle
                        ref={progressRef}
                        cx={config.width / 2}
                        cy={config.width / 2}
                        r={radius}
                        fill="none"
                        stroke="url(#gaugeGradient)"
                        strokeWidth={config.strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={animated ? circumference : strokeDashoffset}
                        className="drop-shadow-sm"
                    />
                    {/* Gradient definition */}
                    <defs>
                        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" className={cn("stop-current", tier.color)} />
                            <stop offset="100%" className="stop-current text-primary" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                        ref={scoreRef}
                        className={cn("font-bold font-mono-numbers", config.fontSize)}
                    >
                        {animated ? "0" : score}
                    </span>
                    {showLabel && (
                        <span
                            className={cn(
                                "font-medium uppercase tracking-wider",
                                config.tierSize,
                                tier.color
                            )}
                        >
                            {tier.name}
                        </span>
                    )}
                </div>
            </div>

            {/* Glow effect for Elite tier */}
            {score > 850 && (
                <div
                    className="absolute inset-0 rounded-full blur-xl opacity-30 animate-pulse"
                    style={{
                        background: `linear-gradient(135deg, rgb(168 85 247), rgb(236 72 153))`,
                    }}
                />
            )}
        </div>
    );
}
