"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wallet, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ConnectWalletModalProps {
  open: boolean;
  onClose: () => void;
}

export function ConnectWalletModal({ open, onClose }: ConnectWalletModalProps) {
  const [Content, setContent] = useState<React.ComponentType<{ onClose: () => void }> | null>(null);

  useEffect(() => {
    if (open && !Content) {
      import("@/components/wallet/ConnectWalletModalContent").then((mod) =>
        setContent(() => mod.ConnectWalletModalContent)
      );
    }
  }, [open, Content]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className={cn(
          "sm:max-w-md w-[calc(100%-2rem)]",
          "bg-background text-foreground",
          "border-2 border-primary/20",
          "shadow-xl shadow-primary/5",
          "rounded-xl p-0 gap-0 overflow-hidden"
        )}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            Connect a wallet on Sui
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5">
          {Content ? (
            <Content onClose={onClose} />
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
