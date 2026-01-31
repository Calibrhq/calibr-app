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
    packageId: "0xdb05c1410aacbc50253049280eb64226eef1b78c1f59b2da398a333a7a12aebe",
    adminCapId: "0xee91dd6333518aa4d450c15b7b2ba79b32c5bc4159352cb0bee96dbfa75bdeb3",
    treasuryId: "0x261a86c9c5e963ea8a2cd586934519cd3576651badc6c3c77ac432775ba53116",
    pointsMarketConfigId: "0x4094ea5bc1bd756b90ac1a06a13846b103bfd1c2606d99b6fa0074acd2a9638b",
    balanceRegistryId: "0x9cd41e2f97564fd4d570a72ddbb33fe1a07280aed46c64c3ca34dbcdf01ce1b5",
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

// Factory function to create dAppKit instance (called only on client side)
// This is async and must be awaited
export async function createDAppKitInstance() {
  // Dynamic import to avoid SSR issues (ESM modules)
  const [dappKitModule, suiModule] = await Promise.all([
    import("@mysten/dapp-kit-react"),
    import("@mysten/sui/grpc"),
  ]);

  const { createDAppKit } = dappKitModule;
  const { SuiGrpcClient } = suiModule;

  return createDAppKit({
    networks: [...SUPPORTED_NETWORKS] as unknown as ["testnet", "mainnet", "devnet"],
    defaultNetwork: DEFAULT_NETWORK,
    createClient(network: string) {
      return new SuiGrpcClient({
        network,
        baseUrl: NETWORK_URLS[network as NetworkType],
      });
    },
    autoConnect: true,
  });
}

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
