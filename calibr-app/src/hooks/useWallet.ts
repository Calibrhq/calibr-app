"use client";

import { useWalletContext } from "@/contexts/WalletContext";

// Re-export the hook for easier usage
export function useWallet() {
  return useWalletContext();
}
