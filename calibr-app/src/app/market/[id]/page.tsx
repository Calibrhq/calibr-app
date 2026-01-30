"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MarketInsightPanel } from "@/components/markets/MarketInsightPanel";
import { PredictionPanel } from "@/components/markets/PredictionPanel";
import { mockMarkets } from "@/data/mockMarkets";
import { ArrowLeft, Clock, Calendar, FileText } from "lucide-react";
import { format, differenceInDays, differenceInHours } from "date-fns";

export default function MarketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const market = mockMarkets.find((m) => m.id === id);

  if (!market) {
    return (
      <div className="container py-16 text-center">
        <h1 className="mb-4">Market not found</h1>
        <Link href="/explore" className="text-primary hover:underline">
          Back to markets
        </Link>
      </div>
    );
  }

  const resolveDate = new Date(market.resolveDate);
  const startDate = new Date(market.startDate);
  const now = new Date();
  const daysRemaining = differenceInDays(resolveDate, now);
  const hoursRemaining = differenceInHours(resolveDate, now) % 24;

  const getStatusBadge = () => {
    switch (market.status) {
      case "active":
        return <span className="badge-active">Active</span>;
      case "resolving":
        return <span className="badge-resolving">Resolving</span>;
      case "resolved":
        return <span className="badge-resolved">Resolved</span>;
    }
  };

  return (
    <div className="container py-8 md:py-12">
      <Link
        href="/explore"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to markets
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-1 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground">
                {market.category}
              </span>
              {getStatusBadge()}
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight text-balance">
              {market.question}
            </h1>
          </div>

          {/* Market Insight Panel */}
          <MarketInsightPanel
            yesPercentage={market.yesPercentage}
            startDate={market.startDate}
            resolveDate={market.resolveDate}
            daysRemaining={daysRemaining}
            hoursRemaining={hoursRemaining}
            status={market.status}
          />

          {/* Resolution Criteria */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Resolution Criteria
              </h3>
            </div>
            <p className="text-foreground leading-relaxed">
              {market.resolutionCriteria}
            </p>
          </div>

          {/* Timeline Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Start Date</span>
              </div>
              <p className="font-medium">{format(startDate, "MMMM d, yyyy")}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Resolution Date</span>
              </div>
              <p className="font-medium">{format(resolveDate, "MMMM d, yyyy")}</p>
            </div>
          </div>
        </div>

        {/* Prediction Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <PredictionPanel 
              marketId={market.id} 
              question={market.question}
              maxConfidence={85}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
