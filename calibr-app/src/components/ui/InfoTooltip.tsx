"use client";

import React, { useState, useRef, useEffect, ReactNode } from "react";
import { Info } from "lucide-react";

interface InfoTooltipProps {
    content: ReactNode;
    title?: string;
    children?: ReactNode;
    className?: string;
    position?: "top" | "bottom" | "left" | "right";
}

/**
 * InfoTooltip - Educational tooltip with hover popup.
 * 
 * Shows a (?) icon that reveals helpful information when hovered.
 * Used to explain complex concepts in the Points Economy.
 */
export function InfoTooltip({
    content,
    title,
    children,
    className = "",
    position = "top",
}: InfoTooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    // Position the tooltip
    useEffect(() => {
        if (isVisible && triggerRef.current && tooltipRef.current) {
            const trigger = triggerRef.current.getBoundingClientRect();
            const tooltip = tooltipRef.current.getBoundingClientRect();

            let x = 0;
            let y = 0;

            switch (position) {
                case "top":
                    x = trigger.left + trigger.width / 2 - tooltip.width / 2;
                    y = trigger.top - tooltip.height - 8;
                    break;
                case "bottom":
                    x = trigger.left + trigger.width / 2 - tooltip.width / 2;
                    y = trigger.bottom + 8;
                    break;
                case "left":
                    x = trigger.left - tooltip.width - 8;
                    y = trigger.top + trigger.height / 2 - tooltip.height / 2;
                    break;
                case "right":
                    x = trigger.right + 8;
                    y = trigger.top + trigger.height / 2 - tooltip.height / 2;
                    break;
            }

            // Keep tooltip on screen
            x = Math.max(8, Math.min(x, window.innerWidth - tooltip.width - 8));
            y = Math.max(8, y);

            setCoords({ x, y });
        }
    }, [isVisible, position]);

    return (
        <span className={`inline-flex items-center ${className}`}>
            {children}
            <button
                ref={triggerRef}
                type="button"
                className="ml-1.5 text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full"
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                onFocus={() => setIsVisible(true)}
                onBlur={() => setIsVisible(false)}
                aria-label="More information"
            >
                <Info className="w-4 h-4" />
            </button>

            {isVisible && (
                <div
                    ref={tooltipRef}
                    className="fixed z-[100] max-w-xs p-4 bg-popover border border-border rounded-xl shadow-xl animate-fade-in"
                    style={{
                        left: coords.x,
                        top: coords.y,
                    }}
                    role="tooltip"
                >
                    {title && (
                        <h4 className="font-semibold text-sm text-foreground mb-2">{title}</h4>
                    )}
                    <div className="text-sm text-muted-foreground leading-relaxed">
                        {content}
                    </div>
                </div>
            )}
        </span>
    );
}

/**
 * EducationalBanner - Full-width banner for important explanations.
 */
interface EducationalBannerProps {
    title: string;
    content: ReactNode;
    icon?: ReactNode;
    variant?: "info" | "warning" | "success";
}

export function EducationalBanner({
    title,
    content,
    icon,
    variant = "info",
}: EducationalBannerProps) {
    const variantStyles = {
        info: "border-primary/30 bg-primary/5",
        warning: "border-yellow-500/30 bg-yellow-500/5",
        success: "border-green-500/30 bg-green-500/5",
    };

    return (
        <div className={`p-4 rounded-xl border ${variantStyles[variant]}`}>
            <div className="flex items-start gap-3">
                {icon && (
                    <div className="flex-shrink-0 mt-0.5 text-primary">
                        {icon}
                    </div>
                )}
                <div>
                    <h4 className="font-medium text-sm text-foreground mb-1">{title}</h4>
                    <div className="text-sm text-muted-foreground">{content}</div>
                </div>
            </div>
        </div>
    );
}
