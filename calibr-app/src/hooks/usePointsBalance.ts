"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { getPackageId, DEFAULT_NETWORK, NETWORK_URLS } from "@/lib/sui-config";

export interface PointsBalance {
    id: string;
    balance: number;
    owner: string;
}

// Helper for JSON-RPC calls (same pattern as useMarkets)
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

export function usePointsBalance() {
    const { address } = useWallet();
    const packageId = getPackageId(DEFAULT_NETWORK);

    return useQuery({
        queryKey: ["points-balance", address, DEFAULT_NETWORK],
        enabled: !!address,
        queryFn: async (): Promise<PointsBalance | null> => {
            if (!address) return null;

            // Struct type for PointsBalance
            const structType = `${packageId}::points_token::PointsBalance`;

            // suix_getOwnedObjects params: [owner, query, cursor, limit]
            const result = await rpc("suix_getOwnedObjects", [
                address,
                {
                    filter: { StructType: structType },
                    options: { showContent: true }
                },
                null,
                1
            ]);

            if (!result || !result.data || result.data.length === 0) return null;

            // User should have exactly one PointsBalance
            const obj = result.data[0];
            const content = obj.data?.content;

            if (!content || !content.fields) return null;

            return {
                id: obj.data?.objectId || "",
                balance: parseInt(content.fields.balance || "0"),
                owner: address
            };
        },
        refetchInterval: 5000 // Refresh often to show updated balance
    });
}
