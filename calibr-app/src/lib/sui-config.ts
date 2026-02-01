// Supported networks
export const SUPPORTED_NETWORKS = ["testnet", "mainnet", "devnet"] as const;
export type NetworkType = (typeof SUPPORTED_NETWORKS)[number];

// Network URLs for Sui (gRPC endpoints)
export const NETWORK_URLS: Record<NetworkType, string> = {
  testnet: "https://fullnode.testnet.sui.io:443",
  mainnet: "https://fullnode.mainnet.sui.io:443",
  devnet: "https://fullnode.devnet.sui.io:443",
};

// Deployment addresses per network
export const CONTRACT_IDS = {
  testnet: {
    packageId: "0xf4963058f286a7da4a0e8b5e766523815f4d5f60b6e3cecdc10b32fbf72ccf70",
    adminCapId: "0xc293b77b644f967095f155b8bf162458e296f5d3023e2f91e4b2b05ed4d763bf",
    treasuryId: "0xb86a1763ff452e325df061dc0212406eef6c1b6488fdba9d195ae5e6466ba313",
    pointsMarketConfigId: "0x091fe4e98d56e2c2febf5b00dd3ec7aa18da9efa075735bca965f2e73764bd32",
    balanceRegistryId: "0x770b0fb36844181c9e34a4c49659beb7573496b8e6d8f7ecaa7573fef2beea80",
  },
  devnet: {
    packageId: "",
    adminCapId: "",
    treasuryId: "",
    pointsMarketConfigId: "",
    balanceRegistryId: "",
  },
  mainnet: {
    packageId: "",
    adminCapId: "",
    treasuryId: "",
    pointsMarketConfigId: "",
    balanceRegistryId: "",
  }
};

// Default network for the app
export const DEFAULT_NETWORK: NetworkType = "testnet";

import { createNetworkConfig } from "@mysten/dapp-kit";
export const { networkConfig, useNetworkVariable } = createNetworkConfig({
  testnet: { url: "https://fullnode.testnet.sui.io:443" },
  mainnet: { url: "https://fullnode.mainnet.sui.io:443" },
  devnet: { url: "https://fullnode.devnet.sui.io:443" },
} as any);

// Helper to get explorer URL for transactions
export function getExplorerUrl(type: "tx" | "object" | "address", id: string, network: NetworkType = DEFAULT_NETWORK) {
  const baseUrl = `https://suiscan.xyz/${network}`;

  const pathMap = {
    tx: "tx",
    object: "object",
    address: "account",
  };

  return `${baseUrl}/${pathMap[type]}/${id}`;
}

// Get package ID for current network
// Get package ID for current network
export function getPackageId(network: NetworkType = DEFAULT_NETWORK): string {
  return CONTRACT_IDS[network].packageId;
}

// Fixed stake amount as per Calibr protocol
export const FIXED_STAKE = 100;

// Confidence limits
export const MIN_CONFIDENCE = 50;
export const MAX_CONFIDENCE_DEFAULT = 70; // New users start at 70%

// Tier thresholds for confidence caps
export const TIER_THRESHOLDS = {
  NEW: { maxRep: 699, cap: 70 },
  PROVEN: { maxRep: 850, cap: 80 },
  ELITE: { maxRep: 1000, cap: 90 },
} as const;

// Calculate max confidence based on reputation
export function getMaxConfidence(reputation: number): number {
  if (reputation < TIER_THRESHOLDS.NEW.maxRep) {
    return TIER_THRESHOLDS.NEW.cap;
  }
  if (reputation <= TIER_THRESHOLDS.PROVEN.maxRep) {
    return TIER_THRESHOLDS.PROVEN.cap;
  }
  return TIER_THRESHOLDS.ELITE.cap;
}

// Calculate risk based on confidence (Calibr formula)
export function calculateRisk(confidence: number): number {
  return Math.max(5, Math.round(100 * (confidence - 50) / 40));
}
