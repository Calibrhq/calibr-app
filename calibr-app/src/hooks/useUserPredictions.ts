"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { getPackageId, DEFAULT_NETWORK, NETWORK_URLS } from "@/lib/sui-config";

export interface UserPrediction {
    predictionId: string;
    marketId: string;
    side: boolean; // true = YES, false = NO
    confidence: number;
    risk: number;
    stake: number;
    status: "active" | "won" | "lost";
    payout?: number;
    profit?: number;
    loss?: number;
}

// Helper for JSON-RPC calls
async function rpc(method: string, params: unknown[]): Promise<any> {
    const url = NETWORK_URLS[DEFAULT_NETWORK];
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method,
            params
        })
    });
    const json = await res.json();
    if (json.error) {
        console.error("RPC Error:", json.error);
        return null;
    }
    return json.result;
}

export function useUserPredictions() {
    const { address } = useWallet();
    const packageId = getPackageId(DEFAULT_NETWORK);

    return useQuery({
        queryKey: ["user-predictions", address, DEFAULT_NETWORK],
        enabled: !!address,
        queryFn: async (): Promise<UserPrediction[]> => {
            if (!address) return [];

            // 1. Fetch PredictionPlaced events for this user
            const placedEvents = await rpc("suix_queryEvents", [
                { MoveEventType: `${packageId}::events::PredictionPlaced` },
                null,
                100,
                true
            ]);

            if (!placedEvents?.data) return [];

            // Filter events for this user
            const userPlacements = placedEvents.data.filter(
                (e: any) => e.parsedJson?.user === address
            );

            // 2. Fetch PredictionSettled events for this user
            const settledEvents = await rpc("suix_queryEvents", [
                { MoveEventType: `${packageId}::events::PredictionSettled` },
                null,
                100,
                true
            ]);

            // Create a map of settled predictions
            const settledMap = new Map<string, any>();
            if (settledEvents?.data) {
                for (const e of settledEvents.data) {
                    if (e.parsedJson?.user === address) {
                        settledMap.set(e.parsedJson.prediction_id, e.parsedJson);
                    }
                }
            }

            // 3. Combine into UserPrediction format
            const predictions: UserPrediction[] = userPlacements.map((e: any) => {
                const placed = e.parsedJson;
                const settled = settledMap.get(placed.prediction_id);

                return {
                    predictionId: placed.prediction_id,
                    marketId: placed.market_id,
                    side: placed.side,
                    confidence: parseInt(placed.confidence),
                    risk: parseInt(placed.risk),
                    stake: parseInt(placed.stake),
                    status: settled ? (settled.won ? "won" : "lost") : "active",
                    payout: settled ? parseInt(settled.payout) : undefined,
                    profit: settled?.won ? parseInt(settled.profit) : undefined,
                    loss: settled && !settled.won ? parseInt(settled.loss) : undefined,
                };
            });

            return predictions;
        },
        refetchInterval: 10000 // Refresh every 10 seconds
    });
}
