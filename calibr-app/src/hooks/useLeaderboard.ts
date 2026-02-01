import { useQuery } from "@tanstack/react-query";
import { useSuiClient } from "@mysten/dapp-kit";
import { getPackageId, DEFAULT_NETWORK } from "@/lib/sui-config";

export interface LeaderboardUser {
    rank: number;
    address: string;
    reputation: number;
    predictions: number;
    winRate: number;
    tier: "new" | "proven" | "elite";
    isYou: boolean;
}

interface UserStats {
    address: string;
    reputation: number;
    predictions: number;
    wins: number;
    lastEventTime: number;
}

export function useLeaderboard(currentUserAddress?: string | null) {
    const client = useSuiClient();
    const packageId = getPackageId(DEFAULT_NETWORK);

    return useQuery({
        queryKey: ["leaderboard", packageId, currentUserAddress],
        queryFn: async (): Promise<LeaderboardUser[]> => {
            const userMap = new Map<string, UserStats>();

            // 1. Fetch ProfileCreated events (to populate initial list)
            // We fetch effectively "all" by setting a high limit or iterating.
            // For hackathon, 50 is probably enough, but we should try to get more.
            // There isn't a "get all" efficiently without loop, but let's just get 50 latest 
            // and assume that covers active users for now or iterate if we want to be perfect.
            // Let's iterate a bit.

            // Helper to get all events of a type
            const getAllEvents = async (eventType: string) => {
                const events = [];
                let cursor = null;
                let hasNextPage = true;

                // Safety limit to prevent infinite loops if network is weird
                let pages = 0;
                const MAX_PAGES = 10;

                while (hasNextPage && pages < MAX_PAGES) {
                    const result = await client.queryEvents({
                        query: { MoveEventType: eventType },
                        cursor,
                        limit: 50,
                        order: "ascending"
                    });

                    events.push(...result.data);
                    cursor = result.nextCursor;
                    hasNextPage = result.hasNextPage;
                    pages++;
                }
                return events;
            };

            const [profileEvents, repEvents] = await Promise.all([
                getAllEvents(`${packageId}::events::ProfileCreated`),
                getAllEvents(`${packageId}::events::ReputationUpdated`)
            ]);

            // Process Profiles
            profileEvents.forEach((e) => {
                const data = e.parsedJson as any;
                const addr = data.user;
                if (!userMap.has(addr)) {
                    userMap.set(addr, {
                        address: addr,
                        reputation: Number(data.initial_reputation || 700),
                        predictions: 0,
                        wins: 0,
                        lastEventTime: 0,
                    });
                }
            });

            // Process Reputation Updates
            repEvents.forEach((e) => {
                const data = e.parsedJson as any;
                const addr = data.user;

                // If we missed profile creation (e.g. older than query limit), init now
                if (!userMap.has(addr)) {
                    userMap.set(addr, {
                        address: addr,
                        reputation: 700, // Fallback
                        predictions: 0,
                        wins: 0,
                        lastEventTime: 0,
                    });
                }

                const stats = userMap.get(addr)!;

                // Increment counts (each event is a settled prediction)
                stats.predictions += 1;
                if (data.prediction_was_correct) {
                    stats.wins += 1;
                }

                // Update reputation if this event is newer
                const eventTime = Number(e.timestampMs || 0);
                if (eventTime >= stats.lastEventTime) {
                    stats.reputation = Number(data.new_score);
                    stats.lastEventTime = eventTime;
                }
            });

            // Convert to array and sort
            const sortedUsers = Array.from(userMap.values())
                .sort((a, b) => b.reputation - a.reputation)
                .map((stats, index) => {
                    const winRate = stats.predictions > 0
                        ? Math.round((stats.wins / stats.predictions) * 100)
                        : 0;

                    let tier: "new" | "proven" | "elite" = "new";
                    if (stats.reputation > 850) tier = "elite";
                    else if (stats.reputation >= 700) tier = "proven";

                    return {
                        rank: index + 1,
                        address: stats.address,
                        reputation: stats.reputation,
                        predictions: stats.predictions,
                        winRate,
                        tier,
                        isYou: currentUserAddress ? stats.address === currentUserAddress : false
                    };
                });

            return sortedUsers;
        },
        refetchInterval: 30000, // Refresh every 30s
    });
}
