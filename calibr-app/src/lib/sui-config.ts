// Supported networks
export const SUPPORTED_NETWORKS = ["testnet", "mainnet", "devnet"] as const;
export type NetworkType = (typeof SUPPORTED_NETWORKS)[number];

// Network URLs for Sui (gRPC endpoints)
export const NETWORK_URLS: Record<NetworkType, string> = {
  testnet: "https://fullnode.testnet.sui.io:443",
  mainnet: "https://fullnode.mainnet.sui.io:443",
  devnet: "https://fullnode.devnet.sui.io:443",
};

// Package IDs per network
export const PACKAGE_IDS: Record<NetworkType, string> = {
  testnet: "0x98282ab2bd75ccad7e6fbbfb8b6d6824dc1648318208c0631d9b289629785f04",
  mainnet: "", // TODO: Update with mainnet deployment
  devnet: "", // TODO: Update with devnet deployment
};

// Admin Cap IDs per network (for market creation)
export const ADMIN_CAP_IDS: Record<NetworkType, string> = {
  testnet: "0xf408df574b2c37d985bf1df15e312919cdcd841f7661605ea7949b0655772c2f",
  mainnet: "",
  devnet: "",
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
export function getPackageId(network: NetworkType = DEFAULT_NETWORK): string {
  return PACKAGE_IDS[network];
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
