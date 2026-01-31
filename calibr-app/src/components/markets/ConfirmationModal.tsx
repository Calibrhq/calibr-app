"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, CheckCircle2, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  side: "yes" | "no";
  confidence: number;
  riskAmount: number;
  question: string;
  stakeAmount?: number;
  onConfirm?: () => void;
  isLoading?: boolean;
}

export function ConfirmationModal({
  open,
  onClose,
  side,
  confidence,
  riskAmount,
  question,
  stakeAmount = 100,
  onConfirm,
  isLoading = false,
}: ConfirmationModalProps) {
  const router = useRouter();
  const protectedAmount = stakeAmount - riskAmount;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
      router.push("/dashboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={isLoading ? undefined : onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Confirm Your Prediction
          </DialogTitle>
          <DialogDescription>
            Review your prediction before submitting to the blockchain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Question */}
          <div className="bg-muted/30 rounded-xl p-4">
            <p className="text-sm leading-relaxed">
              &quot;{question}&quot;
            </p>
          </div>

          {/* Position and Confidence */}
          <div className="grid grid-cols-2 gap-3">
            <div className={cn(
              "rounded-xl p-4 text-center border-2 transition-colors",
              side === "yes"
                ? "bg-green-500/10 border-green-500/30"
                : "bg-red-500/10 border-red-500/30"
            )}>
              <div className="flex items-center justify-center gap-2 mb-2">
                {side === "yes"
                  ? <ThumbsUp className="h-5 w-5 text-green-500" />
                  : <ThumbsDown className="h-5 w-5 text-red-500" />
                }
                <span className="text-xs text-muted-foreground">Position</span>
              </div>
              <span className={cn(
                "text-xl font-bold capitalize",
                side === "yes" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {side}
              </span>
            </div>

            <div className="rounded-xl p-4 text-center bg-primary/10 border-2 border-primary/30">
              <span className="text-xs text-muted-foreground block mb-2">Confidence</span>
              <span className="text-xl font-bold font-mono-numbers text-primary">{confidence}%</span>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Stake Amount</span>
              <span className="font-semibold font-mono-numbers">{stakeAmount} pts</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Risk (R)</span>
              <span className="font-semibold font-mono-numbers text-orange-500">{riskAmount} pts</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-border">
              <span className="text-muted-foreground">Protected if wrong</span>
              <span className="font-semibold font-mono-numbers text-green-500">{protectedAmount} pts</span>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                Calibration matters
              </p>
              <p className="text-yellow-600/80 dark:text-yellow-400/80 text-xs leading-relaxed">
                Your reputation adjusts based on how well your confidence matches reality.
                High confidence + wrong = bigger penalty.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Go Back
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Confirm Prediction"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
