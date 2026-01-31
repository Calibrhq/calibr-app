"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from "react";
import { DEFAULT_NETWORK, getExplorerUrl, getPackageId } from "@/lib/sui-config";

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
  reputation: number;
  maxConfidence: number;
  tier: "New" | "Proven" | "Elite";
  
  // Actions
  disconnect: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  
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
  reputation: 700,
  maxConfidence: 70,
  tier: "New",
  disconnect: async () => {},
  refreshProfile: async () => {},
  refreshBalance: async () => {},
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
  const [hooks, setHooks] = useState<{
    useCurrentAccount: () => { address?: string } | null;
    useCurrentWallet: () => { name?: string; icon?: string } | null;
    useWalletConnection: () => { status: string };
    useCurrentClient: () => unknown;
    useDAppKit: () => { disconnectWallet: () => Promise<void> } | null;
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
    useDAppKit: () => { disconnectWallet: () => Promise<void> } | null;
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
    if (!currentAccount?.address || !client) {
      setUserProfile(null);
      return;
    }

    setIsLoadingProfile(true);
    
    try {
      const packageId = getPackageId(DEFAULT_NETWORK);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientAny = client as any;
      
      let objects;
      try {
        objects = await clientAny.core?.getOwnedObjects?.({
          owner: currentAccount.address,
          filter: {
            StructType: `${packageId}::calibr::UserProfile`,
          },
          options: {
            showContent: true,
          },
        });
      } catch {
        setUserProfile(null);
        setIsLoadingProfile(false);
        return;
      }

      if (objects?.data?.length > 0 && objects.data[0].data?.content?.dataType === "moveObject") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const content = objects.data[0].data.content as any;
        const fields = content.fields;
        
        if (fields && typeof fields === 'object') {
          const repScore = Number(fields.reputation_score || 700);
          const tier = repScore < 700 ? "New" : repScore <= 850 ? "Proven" : "Elite";
          
          setUserProfile({
            id: fields.id?.id || "",
            owner: fields.owner || "",
            reputationScore: repScore,
            reputationCount: Number(fields.reputation_count || 0),
            maxConfidence: Number(fields.max_confidence || 70),
            tier,
          });
        } else {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUserProfile(null);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [currentAccount?.address, client]);

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
    reputation: userProfile?.reputationScore ?? 700,
    maxConfidence: userProfile?.maxConfidence ?? getMaxConfidence(700),
    tier: userProfile?.tier ?? "New",
    disconnect,
    refreshProfile: fetchUserProfile,
    refreshBalance: fetchBalance,
    shortenAddress,
    getAddressExplorerUrl,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
