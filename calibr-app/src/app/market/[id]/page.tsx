"use client";
/* eslint-disable */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { MarketInsightPanel } from "@/components/markets/MarketInsightPanel";
import { PredictionPanel } from "@/components/markets/PredictionPanel";
import { ArrowLeft, Clock, Users, FileText, Loader2, AlertCircle } from "lucide-react";
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
          </div>

          {/* Market Stats */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Market Statistics
              </h3>
            </div>

            {/* Yes/No Distribution */}
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-green-600 dark:text-green-400 font-medium">
                  YES: {market.yesPercentage}%
                </span>
                <span className="text-red-600 dark:text-red-400 font-medium">
                  NO: {100 - market.yesPercentage}%
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                  style={{ width: `${market.yesPercentage}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold font-mono-numbers">{market.yesCount}</p>
                  <p className="text-xs text-muted-foreground">YES predictions</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold font-mono-numbers">{market.noCount}</p>
                  <p className="text-xs text-muted-foreground">NO predictions</p>
                </div>
              </div>

              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  Total Risk Pool: <span className="font-mono-numbers font-medium">{market.yesRiskTotal + market.noRiskTotal}</span> pts
                </p>
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
    </div>
  );
}
