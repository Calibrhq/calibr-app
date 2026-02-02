"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2, Fingerprint, ChevronRight } from "lucide-react";

interface HoldToConfirmButtonProps {
    onConfirm: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    text?: string;
    holdingText?: string;
    className?: string;
    duration?: number; // Duration in ms
}

export function HoldToConfirmButton({
    onConfirm,
    isLoading = false,
    disabled = false,
    text = "Hold to Predict",
    holdingText = "Complete Prediction", // More active phrasing
    className,
    duration = 1200, // Slightly faster for snappier feel
}: HoldToConfirmButtonProps) {
    const [isHolding, setIsHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const [completed, setCompleted] = useState(false);

    // cleanup on unmount
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    const startHold = (e: React.MouseEvent | React.TouchEvent) => {
        if (disabled || isLoading || completed) return;

        setIsHolding(true);
        startTimeRef.current = Date.now();

        // Start animation loop
        const animate = () => {
            if (!startTimeRef.current) return;

            const elapsed = Date.now() - startTimeRef.current;
            const newProgress = Math.min((elapsed / duration) * 100, 100);

            setProgress(newProgress);

            if (newProgress < 100) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                // Completed!
                setCompleted(true);
                setIsHolding(false);
                startTimeRef.current = null;
                onConfirm();

                // Reset after a delay
                setTimeout(() => {
                    setCompleted(false);
                    setProgress(0);
                }, 2500);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);
    };

    const endHold = () => {
        if (completed || isLoading) return;

        setIsHolding(false);
        startTimeRef.current = null;
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        setProgress(0);
    };

    return (
        <div className={cn("relative w-full h-16 select-none touch-none transform transition-transform duration-200", isHolding ? "scale-[0.98]" : "", className)}>
            {/* Container - Toned down "Amazing" vibe */}
            <div className={cn(
                "absolute inset-0 rounded-2xl overflow-hidden transition-all duration-300 border border-primary/10",
                isHolding
                    ? "bg-primary/10 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)]" // Softer glow
                    : "bg-primary/5 shadow-sm",     // Subtle base
                disabled ? "opacity-50 grayscale" : ""
            )}>

                {/* Dynamic Gradient Background Animation - Very Subtle */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] animate-[shimmer_3s_infinite]" />

                {/* Progress Fill - Clear visual feedback without being too dark */}
                <motion.div
                    className="absolute inset-0 bg-primary/20 origin-left z-0"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: progress / 100 }}
                    style={{ transformOrigin: "left" }}
                    transition={{ duration: 0 }}
                />

                {/* Intense Shine on Progress Edge */}
                {isHolding && (
                    <motion.div
                        className="absolute inset-y-0 w-[1px] bg-primary/50 blur-[2px] z-10"
                        style={{ left: `${progress}%` }}
                    />
                )}
            </div>

            {/* Button Content */}
            <button
                type="button"
                onMouseDown={startHold}
                onMouseUp={endHold}
                onMouseLeave={endHold}
                onTouchStart={startHold}
                onTouchEnd={endHold}
                disabled={disabled || isLoading}
                className={cn(
                    "relative w-full h-full flex items-center justify-center gap-2 rounded-2xl font-bold text-lg tracking-wide z-20 transition-all duration-200 text-primary",
                )}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span>Processing...</span>
                    </>
                ) : completed ? (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-2 text-emerald-600"
                    >
                        <Sparkles className="w-5 h-5 fill-current" />
                        <span>Confirmed!</span>
                    </motion.div>
                ) : (
                    <div className="flex items-center gap-1">
                        <span className={cn("transition-all duration-200", isHolding ? "scale-105" : "")}>
                            {text}
                        </span>
                        {!isHolding && (
                            <ChevronRight className="w-5 h-5 opacity-60 animate-pulse-subtle" />
                        )}
                    </div>
                )}
            </button>

            {/* Progress Ring / Border Animation */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 rounded-2xl overflow-visible">
                <rect
                    width="100%"
                    height="100%"
                    rx="16"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeDasharray="400"
                    strokeDashoffset={400 - (progress / 100) * 400} // Approximate animation
                    className={cn("opacity-0 transition-opacity", isHolding ? "opacity-30" : "")}
                />
            </svg>
        </div>
    );
}
