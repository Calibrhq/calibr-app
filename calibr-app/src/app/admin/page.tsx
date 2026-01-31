"use client";

import { useState } from "react";
import { useWalletContext } from "@/contexts/WalletContext";
import { useMarkets } from "@/hooks/useMarkets";
import { CONTRACT_IDS } from "@/lib/sui-config";
import {
    buildCreateMarketTx,
    buildLockMarketTx,
    buildResolveMarketTx
} from "@/lib/calibr-transactions";
import { toast } from "sonner";
import { Shield, Plus, Lock, Check, X, RefreshCw, Calendar } from "lucide-react";

export default function AdminPage() {
    const { isConnected, address, signAndExecuteTransaction } = useWalletContext();
    const { data: markets, isLoading, refetch } = useMarkets();
    const [activeTab, setActiveTab] = useState<"create" | "manage">("create");

    // Create Market Form State
    const [question, setQuestion] = useState("");
    const [deadlineDate, setDeadlineDate] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const adminCapId = CONTRACT_IDS.testnet.adminCapId;

    // --- Actions ---

    const handleCreateMarket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isConnected || !address) {
            toast.error("Please connect wallet");
            return;
        }

        if (!question || !deadlineDate) {
            toast.error("Please fill all fields");
            return;
        }

        try {
            setIsCreating(true);
            const deadlineMs = new Date(deadlineDate).getTime();

            // Current time check
            if (deadlineMs < Date.now()) {
                toast.error("Deadline must be in the future");
                setIsCreating(false);
                return;
            }

            const tx = buildCreateMarketTx(
                adminCapId,
                question,
                deadlineMs,
                address
            );

            const result = await signAndExecuteTransaction(tx);
            if (result) {
                toast.success("Market created successfully!");
                setQuestion("");
                setDeadlineDate("");
                refetch();
            }
        } catch (error) {
            console.error("Create market error:", error);
            toast.error("Failed to create market");
        } finally {
            setIsCreating(false);
        }
    };

    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [confirmOutcome, setConfirmOutcome] = useState<boolean>(false);
    const [isLocking, setIsLocking] = useState<string | null>(null);



    const handleLock = async (marketId: string) => {
        if (!isConnected || isLocking) return;
        try {
            setIsLocking(marketId);
            const tx = buildLockMarketTx(adminCapId, marketId);
            const result = await signAndExecuteTransaction(tx);
            if (result) {
                toast.success("Market locked successfully");
                refetch();
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to lock market");
        } finally {
            setIsLocking(null);
        }
    };

    const initiateResolve = (e: React.MouseEvent, marketId: string, outcome: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setConfirmingId(marketId);
        setConfirmOutcome(outcome);
    };

    const executeResolve = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isConnected || !confirmingId) return;
        if (resolvingId) return;

        try {
            setResolvingId(confirmingId);
            const tx = buildResolveMarketTx(adminCapId, confirmingId, confirmOutcome);
            const result = await signAndExecuteTransaction(tx);
            if (result) {
                toast.success(`Market resolved: ${confirmOutcome ? "YES" : "NO"}`);
                setConfirmingId(null);
                refetch();
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to resolve market");
        } finally {
            setResolvingId(null);
        }
    };

    // --- Render Helpers ---

    if (!isConnected) {
        return (
            <div className="container py-20 flex flex-col items-center justify-center text-center">
                <Shield className="w-16 h-16 text-muted-foreground mb-4" />
                <h1 className="text-2xl font-bold mb-2">Admin Access Required</h1>
                <p className="text-muted-foreground">Please connect your wallet to access the admin dashboard.</p>
            </div>
        );
    }

    return (
        <div className="container py-8 max-w-5xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Shield className="w-8 h-8 text-primary" />
                        Admin Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Create markets, manage deadlines, and resolve outcomes.
                    </p>
                </div>
                <div className="flex gap-2 bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab("create")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "create"
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        Create Market
                    </button>
                    <button
                        onClick={() => setActiveTab("manage")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "manage"
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        Manage Markets
                    </button>
                </div>
            </div>

            {activeTab === "create" ? (
                <div className="max-w-xl mx-auto">
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
                            <Plus className="w-5 h-5 text-primary" />
                            <h2 className="font-semibold text-lg">Create New Market</h2>
                        </div>

                        <form onSubmit={handleCreateMarket} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Question</label>
                                <textarea
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    placeholder="e.g. Will Bitcoin reach $100k by Dec 2025?"
                                    className="w-full min-h-[100px] p-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Resolution Deadline</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="datetime-local"
                                        value={deadlineDate}
                                        onChange={(e) => setDeadlineDate(e.target.value)}
                                        className="w-full pl-10 p-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Market will be resolvable after this time.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isCreating}
                                className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isCreating ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        Create Market
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-lg">Active Markets</h2>
                        <button
                            onClick={() => refetch()}
                            className="p-2 hover:bg-muted rounded-full transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        </button>
                    </div>

                    <div className="grid gap-4">
                        {markets?.map((market) => (
                            <div
                                key={market.id}
                                className="bg-card border border-border rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-start justify-between">
                                        <h3 className="font-medium">{market.question}</h3>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${market.status === 'resolved'
                                            ? "bg-green-500/10 text-green-600 border-green-500/20"
                                            : market.status === 'resolving'
                                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                            }`}>
                                            {market.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span>Deadline: {market.resolveDate}</span>
                                        <span>ID: {market.id.slice(0, 8)}...</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {market.status === 'active' && (
                                        <button
                                            onClick={() => handleLock(market.id)}
                                            disabled={!!isLocking}
                                            className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/80 flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isLocking === market.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                            Lock
                                        </button>
                                    )}

                                    {market.status === 'resolving' && (
                                        <>
                                            {confirmingId === market.id ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-muted-foreground mr-1">
                                                        Confirm {confirmOutcome ? "YES" : "NO"}?
                                                    </span>
                                                    <button
                                                        onClick={(e) => executeResolve(e)}
                                                        disabled={!!resolvingId}
                                                        className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 flex items-center gap-1"
                                                    >
                                                        {resolvingId ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                        Confirm
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setConfirmingId(null);
                                                        }}
                                                        disabled={!!resolvingId}
                                                        className="px-3 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-lg hover:bg-muted/80"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={(e) => initiateResolve(e, market.id, true)}
                                                        disabled={!!resolvingId || !!confirmingId}
                                                        className="px-4 py-2 bg-green-500/10 text-green-600 border border-green-500/20 text-sm font-medium rounded-lg hover:bg-green-500/20 flex items-center gap-2 disabled:opacity-50"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                        Yes
                                                    </button>
                                                    <button
                                                        onClick={(e) => initiateResolve(e, market.id, false)}
                                                        disabled={!!resolvingId || !!confirmingId}
                                                        className="px-4 py-2 bg-red-500/10 text-red-600 border border-red-500/20 text-sm font-medium rounded-lg hover:bg-red-500/20 flex items-center gap-2 disabled:opacity-50"
                                                    >
                                                        <X className="w-4 h-4" />
                                                        No
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    )}

                                    {market.status === 'resolved' && (
                                        <div className="text-sm font-medium text-muted-foreground px-3 py-1 bg-muted rounded">
                                            Outcome: {market.yesPercentage > 50 ? "YES" : "NO"} (Implied)
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
