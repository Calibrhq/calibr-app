"use client";

import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Wallet, 
  ChevronDown, 
  Copy, 
  ExternalLink, 
  LogOut, 
  User,
  Trophy,
  Coins,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ConnectWalletModal } from "./ConnectWalletModal";

interface WalletButtonProps {
  className?: string;
  showBalance?: boolean;
}

export function WalletButton({ className, showBalance = true }: WalletButtonProps) {
  const { 
    isConnected,
    isLoading,
    shortAddress, 
    address,
    balance,
    reputation,
    tier,
    disconnect,
    getAddressExplorerUrl,
    walletIcon
  } = useWallet();
  
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard");
    }
  };

  const openExplorer = () => {
    const url = getAddressExplorerUrl();
    if (url) {
      window.open(url, "_blank");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Button variant="outline" className={cn("gap-2", className)} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (!isConnected) {
    return (
      <>
        <Button
          className={cn("gap-2", className)}
          onClick={() => setConnectModalOpen(true)}
        >
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </Button>
        <ConnectWalletModal
          open={connectModalOpen}
          onClose={() => setConnectModalOpen(false)}
        />
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn("gap-2 font-normal", className)}
        >
          {walletIcon && (
            <img 
              src={walletIcon} 
              alt="wallet" 
              className="w-4 h-4 rounded"
            />
          )}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-mono text-sm">{shortAddress}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* Wallet Info Header */}
        <div className="px-3 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Connected Wallet</span>
            <div className="flex items-center gap-1 text-xs text-green-500">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Connected
            </div>
          </div>
          <div className="flex items-center gap-2">
            {walletIcon && (
              <img 
                src={walletIcon} 
                alt="wallet" 
                className="w-8 h-8 rounded-lg"
              />
            )}
            <div>
              <p className="font-mono text-sm font-medium">{shortAddress}</p>
              {showBalance && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  {balance} SUI
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Reputation Info */}
        <div className="px-3 py-2 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Reputation</span>
            <div className="flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-sm font-semibold">{reputation}</span>
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded",
                tier === "Elite" && "bg-purple-500/10 text-purple-500",
                tier === "Proven" && "bg-blue-500/10 text-blue-500",
                tier === "New" && "bg-gray-500/10 text-gray-500"
              )}>
                {tier}
              </span>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-1">
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <User className="h-4 w-4 mr-2" />
              View Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="cursor-pointer">
              <Trophy className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator />

        <div className="py-1">
          <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
            <Copy className="h-4 w-4 mr-2" />
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openExplorer} className="cursor-pointer">
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Explorer
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator />

        <div className="py-1">
          <DropdownMenuItem 
            onClick={() => disconnect()}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for mobile
export function WalletButtonCompact({ className }: { className?: string }) {
  const { isConnected, isLoading, shortAddress, disconnect } = useWallet();
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" className={cn("gap-2", className)} disabled>
        <Loader2 className="h-3 w-3 animate-spin" />
      </Button>
    );
  }

  if (!isConnected) {
    return (
      <>
        <Button
          size="sm"
          className={cn("gap-2", className)}
          onClick={() => setConnectModalOpen(true)}
        >
          <Wallet className="h-4 w-4" />
          Connect
        </Button>
        <ConnectWalletModal
          open={connectModalOpen}
          onClose={() => setConnectModalOpen(false)}
        />
      </>
    );
  }

  return (
    <Button 
      variant="outline" 
      className={cn("gap-2", className)}
      onClick={() => disconnect()}
    >
      <div className="w-2 h-2 rounded-full bg-green-500" />
      <span className="font-mono text-xs">{shortAddress}</span>
    </Button>
  );
}
