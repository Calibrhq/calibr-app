"use client";

import { Button } from "@/components/ui/button";
import { Wallet, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWallets, useDAppKit } from "@mysten/dapp-kit-react";
import type { UiWallet } from "@mysten/dapp-kit-core";

interface ConnectWalletModalContentProps {
  onClose: () => void;
}

export function ConnectWalletModalContent({ onClose }: ConnectWalletModalContentProps) {
  const wallets = useWallets();
  const dAppKit = useDAppKit();
  const [connectingTo, setConnectingTo] = useState<string | null>(null);

  const handleConnect = async (wallet: UiWallet) => {
    setConnectingTo(wallet.name);
    try {
      await dAppKit.connectWallet({ wallet });
      toast.success(`Connected to ${wallet.name}`);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      if (!message.toLowerCase().includes("reject") && !message.toLowerCase().includes("cancel")) {
        toast.error(message);
      }
    } finally {
      setConnectingTo(null);
    }
  };

  const walletList: UiWallet[] = Array.isArray(wallets) ? wallets : [];

  if (walletList.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No Sui wallets detected. Install a wallet like Sui Wallet or Backpack to get started.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {walletList.map((wallet) => (
        <li key={wallet.name}>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start gap-3 h-12 px-4",
              "border-border hover:border-primary/40 hover:bg-primary/5",
              "text-foreground font-medium"
            )}
            onClick={() => handleConnect(wallet)}
            disabled={!!connectingTo}
          >
            {connectingTo === wallet.name ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
            ) : wallet.icon ? (
              <img
                src={wallet.icon}
                alt=""
                className="h-5 w-5 shrink-0 rounded"
              />
            ) : (
              <Wallet className="h-5 w-5 shrink-0 text-primary" />
            )}
            <span>{wallet.name}</span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
