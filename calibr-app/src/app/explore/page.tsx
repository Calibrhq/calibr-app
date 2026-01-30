"use client";

import { useState } from "react";
import { MarketCard } from "@/components/markets/MarketCard";
import { mockMarkets } from "@/data/mockMarkets";
import { cn } from "@/lib/utils";

const categories = ["All", "Macro", "Crypto", "Governance", "Tech", "Climate"];

export default function ExplorePage() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredMarkets = selectedCategory === "All"
    ? mockMarkets
    : mockMarkets.filter((m) => m.category === selectedCategory);

  return (
    <div className="container py-8 md:py-12">
      <div className="max-w-3xl mb-10">
        <h1 className="mb-3">Explore Markets</h1>
        <p className="text-lg text-muted-foreground">
          Make predictions on real-world events. Your reputation reflects how well 
          your confidence matches reality.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              selectedCategory === category
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {filteredMarkets.map((market, index) => (
          <div
            key={market.id}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <MarketCard
              id={market.id}
              question={market.question}
              category={market.category}
              yesPercentage={market.yesPercentage}
              volume={market.volume}
              isTrending={market.isTrending}
              resolveDate={market.resolveDate}
            />
          </div>
        ))}
      </div>

      {filteredMarkets.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No markets found in this category.</p>
        </div>
      )}
    </div>
  );
}
