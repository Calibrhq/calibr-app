"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Copy, CheckCircle2, X, Sparkles, TrendingUp, TrendingDown, Fingerprint } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface SharePredictionModalProps {
    open: boolean;
    onClose: () => void;
    question: string;
    side: "yes" | "no";
    confidence: number;
}

export function SharePredictionModal({
    open,
    onClose,
    question,
    side,
    confidence,
}: SharePredictionModalProps) {
    const [copied, setCopied] = useState(false);

    // Tilt Logic
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const text = `I just predicted ${confidence}% ${side.toUpperCase()} on "${question}"`;
    const url = "https://calibr.app";
    const hashtags = "Calibr,PredictionMarket";

    // Construct URL for X Intent
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;

    // Construct text for Clipboard
    const shareText = `${text} on Calibr.\n\nBet against me or join the prediction market: ${url} #${hashtags.split(",").join(" #")}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareText);
        setCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    const isYes = side === "yes";
    // Accents
    const accentColor = isYes ? "text-green-500" : "text-red-500";
    const accentBg = isYes ? "bg-green-500" : "bg-red-500";
    const accentBorder = isYes ? "border-green-500/20" : "border-red-500/20";
    const accentGlow = isYes ? "shadow-green-500/20" : "shadow-red-500/20";

    // Ticket visual elements
    const dateStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase();

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[420px] bg-background/80 backdrop-blur-md border border-border/50 p-0 overflow-hidden shadow-2xl">

                <div className="p-8 flex flex-col items-center gap-6">
                    <div className="text-center space-y-1">
                        <h2 className="text-lg font-semibold tracking-tight">Prediction Placed</h2>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">Hover to Verify</p>
                    </div>

                    {/* INTERACTIVE 3D CARD */}
                    <div className="perspective-1000 w-full flex justify-center py-2">
                        <motion.div
                            ref={ref}
                            style={{
                                rotateX,
                                rotateY,
                                transformStyle: "preserve-3d",
                            }}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            className={cn(
                                "relative w-full aspect-[4/5] max-w-[280px] rounded-xl border bg-gradient-to-br from-card to-muted/50",
                                accentBorder,
                                "shadow-2xl transition-shadow duration-500",
                                accentGlow
                            )}
                        >
                            {/* Card Shine Effect */}
                            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none z-20">
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 mix-blend-overlay transition-opacity duration-300 hover:opacity-100" />
                            </div>

                            {/* Card Content - Layered for 3D */}
                            <div className="relative h-full flex flex-col p-6 isolate">
                                {/* Background Grid */}
                                <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:16px_16px]" />

                                {/* Top Badge */}
                                <div className="flex justify-between items-start mb-auto transform translate-z-10">
                                    <div className="flex items-center gap-1.5 p-1.5 pr-3 rounded-full bg-secondary/50 border border-border">
                                        <div className={cn("w-2 h-2 rounded-full animate-pulse", accentBg)} />
                                        <span className="text-[10px] font-mono text-muted-foreground font-medium">LIVE PREDICTION</span>
                                    </div>
                                    <Fingerprint className="w-8 h-8 text-muted-foreground/20" />
                                </div>

                                {/* Main Stats */}
                                <div className="space-y-6 my-auto text-center transform translate-z-20">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground font-mono">POSITION</p>
                                        <h3 className={cn("text-5xl font-black tracking-tighter", accentColor)}>
                                            {side.toUpperCase()}
                                        </h3>
                                    </div>

                                    <div className="w-full h-px bg-border/50" />

                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground font-mono">CONFIDENCE</p>
                                        <div className="flex items-center justify-center gap-2">
                                            {isYes ? <TrendingUp className="w-4 h-4 text-foreground/70" /> : <TrendingDown className="w-4 h-4 text-foreground/70" />}
                                            <span className="text-3xl font-bold text-foreground/90">{confidence}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Info */}
                                <div className="mt-auto transform translate-z-10 bg-secondary/30 -mx-6 -mb-6 p-4 border-t border-border/50">
                                    <p className="text-xs text-muted-foreground font-medium line-clamp-2 mb-3 leading-relaxed">
                                        "{question}"
                                    </p>
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 font-mono uppercase">
                                        <span className="flex items-center gap-1">
                                            <div className="w-3 h-3 rounded-full bg-primary flex items-center justify-center text-primary-foreground">C</div>
                                            Calibr Verified
                                        </span>
                                        <span>{dateStr}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-center gap-4 w-full pt-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCopy}
                            className="rounded-full h-12 w-12 border border-border hover:bg-secondary/50 hover:scale-105 transition-all"
                        >
                            {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
                        </Button>
                        <Button
                            asChild
                            className="flex-1 rounded-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm hover:scale-[1.02] transition-all shadow-lg shadow-primary/20"
                        >
                            <a href={tweetUrl} target="_blank" rel="noopener noreferrer">
                                <Share2 className="w-4 h-4 mr-2" />
                                Post on X
                            </a>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
