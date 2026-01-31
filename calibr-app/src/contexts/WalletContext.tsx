"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from "react";
import {
  useCurrentAccount,
  useCurrentWallet,
  useSignAndExecuteTransaction,
  useDisconnectWallet,
  useSuiClient
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { getPackageId, DEFAULT_NETWORK } from "@/lib/sui-config";
import { toast } from "sonner";

// Define UserProfile locally to avoid import issues
interface UserProfile {
  id: string;
  owner: string;
  reputationScore: number;
  reputationCount: number;
  maxConfidence: number;
  tier: "New" | "Proven" | "Elite";
}

interface WalletContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  isLoading: boolean;
  address: string | null;
  shortAddress: string | null;
  walletName: string | null;
  walletIcon: string | null;
  balance: string;
  userProfile: UserProfile | null;
  isLoadingProfile: boolean;
  hasProfile: boolean;
  // Computed reputation properties
  reputation: number;
  maxConfidence: number;
  tier: "New" | "Proven" | "Elite";
  // Actions
  disconnect: () => void;
  refreshProfile: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  createProfile: () => Promise<{ success: boolean; error?: string }>;
  signAndExecuteTransaction: (tx: Transaction) => Promise<{ digest: string } | null>;
  // Helpers
  shortenAddress: (address: string) => string;
  getAddressExplorerUrl: () => string;
}

const defaultValue: WalletContextValue = {
  isConnected: false,
  isConnecting: false,
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
  const currentAccount = useCurrentAccount();
  const currentWallet = useCurrentWallet();
  const { mutate: signAndExecuteTransactionMutation } = useSignAndExecuteTransaction();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const client = useSuiClient();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [balance, setBalance] = useState<string>("0");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isConnected = !!currentAccount;
  const isConnecting = false; // dapp-kit manages this

  const shortenAddress = useCallback((address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!currentAccount?.address) return;
    try {
      const balanceResult = await client.getBalance({
        owner: currentAccount.address,
      });

      const totalBalance = balanceResult?.totalBalance || "0";
      const suiBalance = Number(totalBalance) / 1_000_000_000;
      setBalance(suiBalance.toFixed(4));
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

      const result = await client.getOwnedObjects({
        owner: currentAccount.address,
        filter: { StructType: structType },
        options: { showContent: true }
      });

      if (result.data && result.data.length > 0) {
        const objData = result.data[0].data;
        if (objData?.content?.dataType === "moveObject") {
          const fields = objData.content.fields as any;

          if (fields) {
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
  }, [currentAccount?.address, client]);

  // Effects
  useEffect(() => {
    fetchBalance();
    fetchUserProfile();
  }, [fetchBalance, fetchUserProfile]);

  // Actions
  const handleDisconnect = useCallback(() => {
    disconnectWallet();
    setUserProfile(null);
    setBalance("0");
  }, [disconnectWallet]);

  const handleSignAndExecute = useCallback(async (tx: Transaction): Promise<{ digest: string } | null> => {
    if (!currentAccount) {
      toast.error("Wallet not connected");
      return null;
    }

    return new Promise((resolve) => {
      signAndExecuteTransactionMutation(
        {
          transaction: tx,
          chain: `sui:${DEFAULT_NETWORK}`,
        },
        {
          onSuccess: (result) => {
            resolve(result);
            // Refresh data after transaction
            setTimeout(() => {
              fetchBalance();
              fetchUserProfile();
            }, 1000);
          },
          onError: (error) => {
            console.error("Transaction failed:", error);
            toast.error("Transaction failed: " + error.message);
            resolve(null);
          }
        }
      );
    });
  }, [currentAccount, signAndExecuteTransactionMutation, fetchBalance, fetchUserProfile]);

  const createProfile = async () => {
    // This is handled by a transaction usually.
    // We defer to the page component to build and execute the tx, then this context just refreshes.
    await fetchUserProfile();
    return { success: true };
  };

  // Derived state
  const reputation = userProfile?.reputationScore || 700;
  const maxConfidence = userProfile?.maxConfidence || getMaxConfidence(reputation);
  const tier = userProfile?.tier || (reputation < 700 ? "New" : reputation <= 850 ? "Proven" : "Elite");

  const value: WalletContextValue = {
    isConnected,
    isConnecting,
    isLoading: !isClient,
    address: currentAccount?.address || null,
    shortAddress: currentAccount?.address ? shortenAddress(currentAccount.address) : null,
    walletName: currentWallet?.currentWallet?.name || null,
    walletIcon: currentWallet?.currentWallet?.icon || null,
    balance,
    userProfile,
    isLoadingProfile,
    hasProfile: !!userProfile,
    reputation,
    maxConfidence,
    tier,
    disconnect: handleDisconnect,
    refreshProfile: fetchUserProfile,
    refreshBalance: fetchBalance,
    createProfile,
    signAndExecuteTransaction: handleSignAndExecute,
    shortenAddress,
    getAddressExplorerUrl: () => "",
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
