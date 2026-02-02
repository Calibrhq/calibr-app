"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const TICKER_ITEMS = [
    { pair: "BTC > $100k", value: "72%", change: "+4.2%", up: true },
    { pair: "ETH > $4k", value: "45%", change: "-1.8%", up: false },
    { pair: "SOL > $200", value: "88%", change: "+12%", up: true },
    { pair: "Fed Rates Cut", value: "60%", change: "0%", up: null },
    { pair: "SpaceX Launch", value: "95%", change: "+1.5%", up: true },
    { pair: "GPT-5 Release", value: "30%", change: "-5%", up: false },
];

export function LiveTicker() {
    return (
        <div className="w-full overflow-hidden whitespace-nowrap mask-linear-fade">
            <div className="inline-flex animate-ticker gap-8 py-3">
                {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/50 border border-border/50 backdrop-blur-sm shadow-sm"
                    >
                        <span className="text-xs font-bold text-foreground/80">{item.pair}</span>
                        <span className="text-xs font-mono font-medium">{item.value}</span>
                        <span
                            className={cn(
                                "text-[10px] font-medium flex items-center gap-0.5",
                                item.up === true
                                    ? "text-emerald-500"
                                    : item.up === false
                                        ? "text-rose-500"
                                        : "text-muted-foreground"
                            )}
                        >
                            {item.up === true ? (
                                <TrendingUp className="w-3 h-3" />
                            ) : item.up === false ? (
                                <TrendingDown className="w-3 h-3" />
                            ) : (
                                <Minus className="w-3 h-3" />
                            )}
                            {item.change}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
