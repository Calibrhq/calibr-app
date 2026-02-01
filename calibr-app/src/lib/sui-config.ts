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
    packageId: "0x6567fe2b950fc8cfbec126d53201c820c03d20558bceda178f1d85f645c6cc20",
    adminCapId: "0xbdfd6d3a1bff91706ea1fc5fbf4ecece83f30f0a3426f653678e93253f5a2c49",
    treasuryId: "0x2903eb0693676a627fcf85e99889cf54b629cfd1281145da258e7de671ad73ca",
    pointsMarketConfigId: "0x09905061f14a72658b45f52a302335188db2b070eeb4fe5be14944326e6ca6e8",
    balanceRegistryId: "0xbea773000732899e8e198f952c6e0c13fd164fcc6e18e4f28b6088f20caa619d",
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
