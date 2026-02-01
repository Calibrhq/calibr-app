import { useQuery } from "@tanstack/react-query";
import { useSuiClient } from "@mysten/dapp-kit";
import { getPackageId, DEFAULT_NETWORK } from "@/lib/sui-config";
import { subDays, isAfter, startOfWeek, startOfMonth } from "date-fns";

export type TimeFrame = "All Time" | "This Month" | "This Week";

export interface LeaderboardUser {
    rank: number;
    address: string;
    reputation: number;
    predictions: number;
    winRate: number;
    tier: "new" | "proven" | "elite";
    isYou: boolean;
    pnl: number;          // Net Profit/Loss in SUI
    streak: number;       // Current winning streak
    form: boolean[];      // Last 5 results (true=win)
}

interface UserStats {
    address: string;
    reputation: number;
    predictions: number;
    wins: number;
    lastEventTime: number;
    pnl: number;
    streak: number;
    form: boolean[];
    // For calculating streak/form correctly we need to store results in order
    history: { result: boolean; time: number }[];
}

export function useLeaderboard(currentUserAddress?: string | null, timeFrame: TimeFrame = "All Time") {
    const client = useSuiClient();
    const packageId = getPackageId(DEFAULT_NETWORK);

    return useQuery({
        queryKey: ["leaderboard", packageId, currentUserAddress, timeFrame],
        queryFn: async (): Promise<LeaderboardUser[]> => {
            const userMap = new Map<string, UserStats>();

            // Helper to get all events of a type
            const getAllEvents = async (eventType: string) => {
                const events = [];
                let cursor = null;
                let hasNextPage = true;
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

            const [profileEvents, repEvents, settledEvents] = await Promise.all([
                getAllEvents(`${packageId}::events::ProfileCreated`),
                getAllEvents(`${packageId}::events::ReputationUpdated`),
                getAllEvents(`${packageId}::events::PredictionSettled`)
            ]);

            // 1. Initialize Users from Profiles
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
                        pnl: 0,
                        streak: 0,
                        form: [],
                        history: []
                    });
                }
            });

            // 2. Process Reputation Updates (to get latest Reputation Score)
            // Note: Reputation is always "Current" regardless of timeframe
            repEvents.forEach((e) => {
                const data = e.parsedJson as any;
                const addr = data.user;
                if (!userMap.has(addr)) return; // Should exist if profile created

                const stats = userMap.get(addr)!;
                const eventTime = Number(e.timestampMs || 0);

                // Update reputation to latest known
                if (eventTime >= stats.lastEventTime) {
                    stats.reputation = Number(data.new_score);
                    stats.lastEventTime = eventTime;
                }
            });

            // 3. Process Settled Predictions (PnL, Wins, Form, Streak)
            // This is where we apply the TimeFrame filter
            const now = new Date();
            let startTime = 0;
            if (timeFrame === "This Week") startTime = startOfWeek(now).getTime();
            if (timeFrame === "This Month") startTime = startOfMonth(now).getTime();

            settledEvents.forEach((e) => {
                const data = e.parsedJson as any;
                const addr = data.user;
                // If profile missing (index lag), skip or init? Init for safety
                if (!userMap.has(addr)) {
                    userMap.set(addr, {
                        address: addr,
                        reputation: 700,
                        predictions: 0,
                        wins: 0,
                        lastEventTime: 0,
                        pnl: 0,
                        streak: 0,
                        form: [],
                        history: []
                    });
                }

                const stats = userMap.get(addr)!;
                const eventTime = Number(e.timestampMs || 0);

                // Add to history (for form/streak - always track ALL history for correct form)
                // Wait, streak/form is "current" form, so we use all history sorted by time.
                // But PnL and WinRate are filtered.
                stats.history.push({ result: data.won, time: eventTime });

                // Filter for PnL / WinRate stats
                if (eventTime >= startTime) {
                    stats.predictions += 1;
                    if (data.won) stats.wins += 1;

                    // PnL in MIST -> SUI
                    const profit = Number(data.profit || 0);
                    const loss = Number(data.loss || 0);
                    const netMist = profit - loss;
                    stats.pnl += (netMist / 1_000_000_000);
                }
            });

            // 4. Calculate Derived Stats (Streak, Form) from full history
            userMap.forEach((stats) => {
                // Sort history by time ascending
                stats.history.sort((a, b) => a.time - b.time);

                // Calculate Streak (from end)
                let currentStreak = 0;
                for (let i = stats.history.length - 1; i >= 0; i--) {
                    if (stats.history[i].result) currentStreak++;
                    else break;
                }
                stats.streak = currentStreak;

                // Calculate Form (last 5)
                stats.form = stats.history.slice(-5).map(h => h.result);
            });

            // 5. Sort & Format
            // If TimeFrame == All Time, sort by Reputation
            // Else, sort by PnL (or Win Rate? PnL is more definitive for comps)
            const sortedUsers = Array.from(userMap.values())
                .sort((a, b) => {
                    if (timeFrame === "All Time") {
                        return b.reputation - a.reputation;
                    } else {
                        return b.pnl - a.pnl; // Highest earnings first
                    }
                })
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
                        isYou: currentUserAddress ? stats.address === currentUserAddress : false,
                        pnl: stats.pnl,
                        streak: stats.streak,
                        form: stats.form
                    };
                });

            return sortedUsers;
        },
        refetchInterval: 30000,
    });
}
