"use client";

import { cn } from "@/lib/utils";
import { Brain, CheckCircle2, Loader2, Radio } from "lucide-react";

interface AIPulseProps {
    status: "active" | "resolving" | "resolved";
    className?: string;
}

export function AIPulse({ status, className }: AIPulseProps) {
    if (status === "active") {
        return (
            <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium", className)}>
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="flex items-center gap-1">
                    <Radio className="w-3 h-3" />
                    AI Monitoring
                </span>
            </div>
        );
    }

    if (status === "resolving") {
        return (
            <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium animate-pulse", className)}>
                <Brain className="w-3 h-3 animate-pulse" />
                <span>AI Analyzing...</span>
            </div>
        );
    }

    if (status === "resolved") {
        return (
            <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium", className)}>
                <CheckCircle2 className="w-3 h-3" />
                <span>AI Verified</span>
            </div>
        );
    }

    return null;
}
