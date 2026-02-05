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
    packageId: "0x75ac97b98aceeeab79b2c7177266799528b0ecb16a56e8698ffde75d5da26667",
    adminCapId: "0x108534a9cebf7eff2a968bbac578b9c24bc60fc6637f6c987d6a60397ffcdf0e",
    treasuryId: "0xc90e7dc8b61899cf6d21bacb6223f7fe563bcc3e051fac06eeee22d3a94f780e",
    pointsMarketConfigId: "0x55895949dc612b1f9dac92ab8327e75d5ab95215cedd9e0f9541c69a407c2e22",
    balanceRegistryId: "0xa94d7ecbcfe896be288353075c89a3764f0f7fc4f338e8e8b07ba8f8536a44f1",
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
