"use client";
/* eslint-disable */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { MarketInsightPanel } from "@/components/markets/MarketInsightPanel";
import { PredictionPanel } from "@/components/markets/PredictionPanel";
import { ArrowLeft, Clock, Users, FileText, Loader2, AlertCircle, TrendingUp } from "lucide-react";
import { getPackageId, DEFAULT_NETWORK } from "@/lib/sui-config";
import { ParsedMarket, parseMarket, decodeQuestion } from "@/lib/calibr-types";
// ... imports


// Fetch market data from chain
async function fetchMarketFromChain(marketId: string): Promise<ParsedMarket | null> {
  try {
    const response = await fetch(`https://fullnode.testnet.sui.io:443`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sui_getObject",
        params: [
          marketId,
          { showContent: true, showType: true }
        ],
      }),
    });

    const data = await response.json();

    if (data.error || !data.result?.data?.content) {
      console.error("Failed to fetch market:", data.error);
      return null;
    }

    const content = data.result.data.content;
    if (content.dataType !== "moveObject") {
      return null;
    }

    const packageId = getPackageId(DEFAULT_NETWORK);
    const expectedType = `${packageId}::calibr::Market`;

    // Check if it's a Market object
    if (!content.type?.includes("::calibr::Market")) {
      console.error("Object is not a Market:", content.type);
      return null;
    }

    const fields = content.fields;
    return parseMarket(marketId, {
      id: marketId,
      question: fields.question || [],
      deadline: Number(fields.deadline || 0),
      yes_risk_total: Number(fields.yes_risk_total || 0),
      no_risk_total: Number(fields.no_risk_total || 0),
      yes_count: Number(fields.yes_count || 0),
      no_count: Number(fields.no_count || 0),
      locked: fields.locked || false,
      resolved: fields.resolved || false,
      outcome: fields.outcome,
      authority: fields.authority || "",
    });
  } catch (error) {
    console.error("Error fetching market:", error);
    return null;
  }
}

export default function MarketDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [market, setMarket] = useState<ParsedMarket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMarket = useCallback(async () => {
    if (!id) return;

    // Check if it looks like an object ID (starts with 0x)
    if (!id.startsWith("0x")) {
      setError("Invalid market ID. Please use a valid Sui object ID.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const marketData = await fetchMarketFromChain(id);

    if (marketData) {
      setMarket(marketData);
    } else {
      setError("Market not found or failed to load.");
    }

    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    loadMarket();
  }, [loadMarket]);

  // Loading state
  if (isLoading) {
    return (
      <div className="container py-16 text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
        <p className="text-muted-foreground">Loading market...</p>
      </div>
    );
  }

  // Error state
  if (error || !market) {
    return (
      <div className="container py-16 text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <h1 className="text-xl font-semibold mb-2">Market Not Found</h1>
        <p className="text-muted-foreground mb-6">{error || "Could not load market data."}</p>
        <Link href="/explore" className="text-primary hover:underline">
          Back to markets
        </Link>
      </div>
    );
  }

  // Determine market status
  const getStatus = (): "active" | "resolving" | "resolved" => {
    if (market.resolved) return "resolved";
    if (market.locked) return "resolving";
    return "active";
  };

  const status = getStatus();

  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return <span className="badge-active">Active</span>;
      case "resolving":
        return <span className="badge-resolving">Locked</span>;
      case "resolved":
        return (
          <span className="badge-resolved">
            Resolved: {market.outcome === true ? "YES" : market.outcome === false ? "NO" : "Unknown"}
          </span>
        );
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
                Prediction Market
              </span>
              {getStatusBadge()}
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight text-balance">
              {market.question}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CountdownTimer targetDate={market.deadline || 0} size="md" />
              </div>
              <div className="w-1 h-1 rounded-full bg-border" />
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>{market.yesCount + market.noCount} votes</span>
              </div>
            </div>
          </div>

          {/* Market Stats */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Market Statistics
              </h3>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 divide-x divide-border/40">
              <div className="px-2">
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Volume</p>
                  <InfoTooltip
                    title="Volume"
                    content="Total points currently staked on this market."
                  />
                </div>
                <p className="text-xl font-semibold font-mono-numbers text-foreground">
                  {(market.yesRiskTotal + market.noRiskTotal).toLocaleString()} pts
                </p>
              </div>
              <div className="px-4">
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Predictions</p>
                  <InfoTooltip
                    title="Prediction Count"
                    content="Total number of individual predictions made."
                  />
                </div>
                <p className="text-xl font-semibold font-mono-numbers text-foreground">
                  {market.yesCount + market.noCount}
                </p>
              </div>
              <div className="px-4">
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">YES Return</p>
                  <InfoTooltip
                    title="Estimated Return (YES)"
                    content="The estimated payout multiplier if YES wins. 1:1.50 means you receive 1.5x your stake."
                  />
                </div>
                <p className="text-xl font-semibold font-mono-numbers text-green-600 dark:text-green-500">
                  {market.yesRiskTotal > 0
                    ? `1:${(1 + (market.noRiskTotal / market.yesRiskTotal)).toFixed(2)}`
                    : "-"}
                </p>
              </div>
              <div className="px-4">
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">NO Return</p>
                  <InfoTooltip
                    title="Estimated Return (NO)"
                    content="The estimated payout multiplier if NO wins."
                  />
                </div>
                <p className="text-xl font-semibold font-mono-numbers text-red-600 dark:text-red-500">
                  {market.noRiskTotal > 0
                    ? `1:${(1 + (market.yesRiskTotal / market.noRiskTotal)).toFixed(2)}`
                    : "-"}
                </p>
              </div>
            </div>

            {/* Yes/No Distribution Bar */}
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                    <TrendingUp className="w-3 h-3" />
                  </div>
                  <span className="font-semibold text-foreground">YES {market.yesPercentage}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">NO {100 - market.yesPercentage}%</span>
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20">
                    <TrendingUp className="w-3 h-3 transform rotate-180" />
                  </div>
                </div>
              </div>

              <div className="h-5 bg-muted rounded-full overflow-hidden shadow-inner flex ring-1 ring-border/50">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500 relative group"
                  style={{ width: `${market.yesPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-500 relative group"
                  style={{ width: `${100 - market.yesPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <div className="flex justify-between text-xs text-muted-foreground pt-1 font-medium">
                <span>{market.yesCount} predictions</span>
                <span>{market.noCount} predictions</span>
              </div>
            </div>


          </div>

          {/* Market Info */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Market Details
              </h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Market ID:</span>
                <span className="font-mono text-xs">{market.id.slice(0, 10)}...{market.id.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="capitalize">{status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Predictions:</span>
                <span className="font-mono-numbers">{market.totalPredictions}</span>
              </div>
              {market.resolved && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outcome:</span>
                  <span className={market.outcome ? "text-green-600" : "text-red-600"}>
                    {market.outcome ? "YES" : "NO"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Prediction Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            {market.locked ? (
              <div className="bg-card border border-border rounded-xl p-6 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Market Locked</h3>
                <p className="text-sm text-muted-foreground">
                  This market is no longer accepting predictions.
                  {market.resolved ? " The outcome has been determined." : " Awaiting resolution."}
                </p>
              </div>
            ) : (
              <PredictionPanel
                marketId={market.id}
                question={market.question}
              />
            )}
          </div>
        </div>
      </div>
    </div >
  );
}
