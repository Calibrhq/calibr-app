"use client";
/* eslint-disable */

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from "react";
import { DEFAULT_NETWORK, getExplorerUrl, getPackageId } from "@/lib/sui-config";
import { buildCreateProfileTx } from "@/lib/calibr-transactions";
import { Transaction } from "@mysten/sui/transactions";

interface UserProfile {
  id: string;
  owner: string;
  reputationScore: number;
  reputationCount: number;
  maxConfidence: number;
  tier: "New" | "Proven" | "Elite";
}

interface WalletContextValue {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
  isLoading: boolean;

  // Account info
  address: string | null;
  shortAddress: string | null;

  // Wallet info
  walletName: string | null;
  walletIcon: string | null;

  // Balance
  balance: string;

  // User profile from Calibr contracts
  userProfile: UserProfile | null;
  isLoadingProfile: boolean;
  hasProfile: boolean;
  reputation: number;
  maxConfidence: number;
  tier: "New" | "Proven" | "Elite";

  // Actions
  disconnect: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  createProfile: () => Promise<{ success: boolean; error?: string }>;
  signAndExecuteTransaction: (tx: Transaction) => Promise<{ digest: string } | null>;

  // Utilities
  shortenAddress: (address: string) => string;
  getAddressExplorerUrl: () => string;
}

const defaultValue: WalletContextValue = {
  isConnected: false,
  isConnecting: false,
  isDisconnected: true,
  isLoading: true,
  address: null,
  shortAddress: null,
  walletName: null,
  walletIcon: null,
  balance: "0",
  userProfile: null,
  isLoadingProfile: false,
  hasProfile: false,
  reputation: 700,
  maxConfidence: 70,
  tier: "New",
  disconnect: async () => { },
  refreshProfile: async () => { },
  refreshBalance: async () => { },
  createProfile: async () => ({ success: false, error: "Not connected" }),
  signAndExecuteTransaction: async () => null,
  shortenAddress: (address: string) => address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "",
  getAddressExplorerUrl: () => "",
};

const WalletContext = createContext<WalletContextValue>(defaultValue);

export function useWalletContext() {
  return useContext(WalletContext);
}

// Helper to get max confidence based on reputation
function getMaxConfidence(reputation: number): number {
  if (reputation < 700) return 70;
  if (reputation <= 850) return 80;
  return 90;
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletContextProvider({ children }: WalletProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [hooks, setHooks] = useState<{
    useCurrentAccount: () => { address?: string } | null;
    useCurrentWallet: () => { name?: string; icon?: string } | null;
    useWalletConnection: () => { status: string };
    useCurrentClient: () => unknown;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useDAppKit: () => any;
  } | null>(null);

  // Load hooks on client side
  useEffect(() => {
    import("@mysten/dapp-kit-react").then((module) => {
      setHooks({
        useCurrentAccount: module.useCurrentAccount,
        useCurrentWallet: module.useCurrentWallet,
        useWalletConnection: module.useWalletConnection,
        useCurrentClient: module.useCurrentClient,
        useDAppKit: module.useDAppKit,
      });
      setIsLoading(false);
    }).catch((error) => {
      console.error("Failed to load wallet hooks:", error);
      setIsLoading(false);
    });
  }, []);

  if (isLoading || !hooks) {
    return (
      <WalletContext.Provider value={defaultValue}>
        {children}
      </WalletContext.Provider>
    );
  }

  return (
    <WalletProviderInner hooks={hooks}>
      {children}
    </WalletProviderInner>
  );
}

interface WalletProviderInnerProps {
  children: ReactNode;
  hooks: {
    useCurrentAccount: () => { address?: string } | null;
    useCurrentWallet: () => { name?: string; icon?: string } | null;
    useWalletConnection: () => { status: string };
    useCurrentClient: () => unknown;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useDAppKit: () => any;
  };
}

function WalletProviderInner({ children, hooks }: WalletProviderInnerProps) {
  const currentAccount = hooks.useCurrentAccount();
  const currentWallet = hooks.useCurrentWallet();
  const connection = hooks.useWalletConnection();
  const client = hooks.useCurrentClient();
  const dAppKit = hooks.useDAppKit();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [balance, setBalance] = useState<string>("0");

  const isConnected = connection.status === "connected";
  const isConnecting = connection.status === "connecting";
  const isDisconnected = connection.status === "disconnected";

  const shortenAddress = useCallback((address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!currentAccount?.address || !client) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientAny = client as any;
      const balanceResult = await clientAny.core?.getBalance?.({
        owner: currentAccount.address,
      });

      if (balanceResult) {
        const totalBalance = balanceResult?.totalBalance || balanceResult?.balance || "0";
        const suiBalance = Number(totalBalance) / 1_000_000_000;
        setBalance(suiBalance.toFixed(4));
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance("0");
    }
  }, [currentAccount?.address, client]);

  const fetchUserProfile = useCallback(async () => {
    if (!currentAccount?.address) {
      setUserProfile(null);
      return;
    }

    setIsLoadingProfile(true);

    try {
      const packageId = getPackageId(DEFAULT_NETWORK);
      const structType = `${packageId}::calibr::UserProfile`;

      // Use direct RPC fetch instead of dAppKit client for reliability
      const response = await fetch("https://fullnode.testnet.sui.io:443", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "suix_getOwnedObjects",
          params: [
            currentAccount.address,
            { filter: { StructType: structType }, options: { showContent: true } }
          ],
        }),
      });

      const result = await response.json();
      console.log("Profile fetch result:", result);

      if (result.result?.data?.length > 0) {
        const objData = result.result.data[0].data;
        if (objData?.content?.dataType === "moveObject") {
          const fields = objData.content.fields;

          if (fields && typeof fields === 'object') {
            const repScore = Number(fields.reputation_score || 700);
            const tier = repScore < 700 ? "New" : repScore <= 850 ? "Proven" : "Elite";

            setUserProfile({
              id: fields.id?.id || objData.objectId || "",
              owner: fields.owner || "",
              reputationScore: repScore,
              reputationCount: Number(fields.reputation_count || 0),
              maxConfidence: Number(fields.max_confidence || 70),
              tier,
            });
            setIsLoadingProfile(false);
            return;
          }
        }
      }

      setUserProfile(null);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUserProfile(null);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [currentAccount?.address]);

  const disconnect = useCallback(async () => {
    try {
      await dAppKit?.disconnectWallet();
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  }, [dAppKit]);

  useEffect(() => {
    if (isConnected && currentAccount?.address) {
      fetchBalance();
      fetchUserProfile();
    } else {
      setBalance("0");
      setUserProfile(null);
    }
  }, [isConnected, currentAccount?.address, fetchBalance, fetchUserProfile]);

  const getAddressExplorerUrl = useCallback(() => {
    if (!currentAccount?.address) return "";
    return getExplorerUrl("address", currentAccount.address);
  }, [currentAccount?.address]);

  // Sign and execute a transaction
  const signAndExecuteTransaction = useCallback(async (tx: Transaction): Promise<{ digest: string } | null> => {
    if (!dAppKit?.signAndExecuteTransaction) {
      console.error("signAndExecuteTransaction not available");
      return null;
    }
    try {
      const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
      return result;
    } catch (error) {
      console.error("Transaction failed:", error);
      throw error;
    }
  }, [dAppKit]);

  // Create a new profile
  const createProfile = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isConnected) {
      return { success: false, error: "Wallet not connected" };
    }
    if (userProfile) {
      return { success: false, error: "Profile already exists" };
    }
    try {
      const tx = buildCreateProfileTx();
      const result = await signAndExecuteTransaction(tx);
      if (result) {
        // Wait a bit for chain to index the new object, then refresh with retries
        console.log("Profile created, waiting for chain to index...");

        // Retry up to 5 times with increasing delays
        for (let attempt = 0; attempt < 5; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 1000 + attempt * 500));
          await fetchUserProfile();

          // Check if profile was found (small delay to let state update)
          await new Promise(resolve => setTimeout(resolve, 100));

          // Get fresh check - we'll check after calling this function in the component
          console.log(`Profile fetch attempt ${attempt + 1}`);
        }

        return { success: true };
      }
      return { success: false, error: "Transaction failed" };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMsg };
    }
  }, [isConnected, userProfile, signAndExecuteTransaction, fetchUserProfile]);

  const value: WalletContextValue = {
    isConnected,
    isConnecting,
    isDisconnected,
    isLoading: false,
    address: currentAccount?.address || null,
    shortAddress: currentAccount?.address ? shortenAddress(currentAccount.address) : null,
    walletName: currentWallet?.name || null,
    walletIcon: currentWallet?.icon || null,
    balance,
    userProfile,
    isLoadingProfile,
    hasProfile: userProfile !== null,
    reputation: userProfile?.reputationScore ?? 700,
    maxConfidence: userProfile?.maxConfidence ?? getMaxConfidence(700),
    tier: userProfile?.tier ?? "New",
    disconnect,
    refreshProfile: fetchUserProfile,
    refreshBalance: fetchBalance,
    createProfile,
    signAndExecuteTransaction,
    shortenAddress,
    getAddressExplorerUrl,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
