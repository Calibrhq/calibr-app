"use client";

import { useQuery } from "@tanstack/react-query";
import { getPackageId, DEFAULT_NETWORK, NETWORK_URLS } from "@/lib/sui-config";
import { Market } from "@/data/mockMarkets";

// Simple RPC helper to avoid library version mismatches
async function rpc(method: string, params: any[]) {
    const url = NETWORK_URLS[DEFAULT_NETWORK];
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method,
            params,
        }),
    });

    const json = await response.json();
    if (json.error) {
        throw new Error(json.error.message);
    }
    return json.result;
}

export function useMarkets(category?: string) {
    const packageId = getPackageId(DEFAULT_NETWORK);

    return useQuery({
        queryKey: ["markets", DEFAULT_NETWORK, category],
        queryFn: async (): Promise<Market[]> => {
            // 1. Fetch MarketCreated events
            const eventsResult = await rpc("suix_queryEvents", [{
                query: { MoveEvent: `${packageId}::events::MarketCreated` },
                limit: 50,
                order: "Descending"
            }]);

            if (!eventsResult || !eventsResult.data || eventsResult.data.length === 0) {
                return [];
            }

            // 2. Extract market IDs and creation info
            const events = eventsResult.data;
            const marketIds = events.map((e: any) => e.parsedJson.market_id);

            const marketCreationInfo = new Map<string, any>();
            events.forEach((e: any) => {
                marketCreationInfo.set(e.parsedJson.market_id, {
                    timestampMs: e.timestampMs
                });
            });

            // 3. Fetch Market Object details
            const objectsResult = await rpc("sui_multiGetObjects", [
                marketIds,
                {
                    showContent: true,
                    showDisplay: true
                }
            ]);

            if (!objectsResult) return [];

            // 4. Transform to Market interface
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const markets: Market[] = objectsResult.map((obj: any) => {
                const id = obj.data?.objectId || "";
                const content = obj.data?.content;
                const fields = content?.fields;

                if (!fields) return null;

                // Decode question
                let question = "Unknown Question";
                if (typeof fields.question === 'string') {
                    question = fields.question;
                } else if (Array.isArray(fields.question)) {
                    try {
                        question = new TextDecoder().decode(new Uint8Array(fields.question));
                    } catch (e) {
                        console.error("Failed to decode question", e);
                    }
                }

                const yesRisk = parseInt(fields.yes_risk_total || "0");
                const noRisk = parseInt(fields.no_risk_total || "0");
                const totalRisk = yesRisk + noRisk;

                // Calculate Yes % (implied probability)
                const yesPercentage = totalRisk > 0
                    ? Math.round((yesRisk / totalRisk) * 100)
                    : 50;

                // Volume (count * 100)
                const yesCount = parseInt(fields.yes_count || "0");
                const noCount = parseInt(fields.no_count || "0");
                const volume = (yesCount + noCount) * 100;

                // Status
                let status: "active" | "resolving" | "resolved" = "active";
                if (fields.resolved) {
                    status = "resolved";
                } else if (fields.locked) {
                    status = "resolving";
                }

                // Creation date
                const creationInfo = marketCreationInfo.get(id);
                const startDate = creationInfo
                    ? new Date(parseInt(creationInfo.timestampMs)).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0];

                return {
                    id: id,
                    question: question,
                    category: deriveCategory(question),
                    yesPercentage: yesPercentage,
                    volume: volume,
                    isTrending: volume > 5000,
                    resolutionCriteria: "Resolves based on real-world outcome verified by admin.",
                    status: status,
                    startDate: startDate,
                    resolveDate: fields.locked ? "Locked" : "Open",
                };
            }).filter((m: any): m is Market => m !== null);

            // Filter by category if provided and not "All"
            if (category && category !== "All") {
                return markets.filter(m => m.category === category);
            }

            return markets;
        },
        // Refresh every 10 seconds
        refetchInterval: 10000,
    });
}

function deriveCategory(question: string): "Macro" | "Crypto" | "Governance" | "Tech" | "Climate" {
    const q = question.toLowerCase();
    if (q.includes("bitcoin") || q.includes("eth") || q.includes("sol") || q.includes("crypto")) return "Crypto";
    if (q.includes("rate") || q.includes("inflation") || q.includes("fed") || q.includes("economy")) return "Macro";
    if (q.includes("election") || q.includes("law") || q.includes("bill") || q.includes("vote")) return "Governance";
    if (q.includes("ai") || q.includes("apple") || q.includes("google") || q.includes("tech")) return "Tech";
    if (q.includes("temp") || q.includes("climate") || q.includes("carbon") || q.includes("warming")) return "Climate";
    return "Macro"; // Default fallback
}
