"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  side: "yes" | "no";
  confidence: number;
  riskAmount: number;
  question: string;
  stakeAmount?: number;
}

export function ConfirmationModal({
  open,
  onClose,
  side,
  confidence,
  riskAmount,
  question,
  stakeAmount,
}: ConfirmationModalProps) {
  const router = useRouter();

  const handleConfirm = () => {
    toast.success("Prediction submitted", {
      description: "Your prediction has been recorded.",
    });
    onClose();
    router.push("/dashboard");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Your Prediction</DialogTitle>
          <DialogDescription className="sr-only">
            Review your prediction before submitting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            &quot;{question}&quot;
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className={cn(
              "rounded-xl p-4 text-center",
              side === "yes" ? "bg-primary/10" : "bg-muted"
            )}>
              <span className="text-xs text-muted-foreground block mb-1">Position</span>
              <span className={cn(
                "text-xl font-semibold capitalize",
                side === "yes" ? "text-primary" : "text-foreground"
              )}>
                {side}
              </span>
            </div>

            <div className="rounded-xl p-4 text-center bg-secondary">
              <span className="text-xs text-muted-foreground block mb-1">Confidence</span>
              <span className="text-xl font-semibold font-mono-numbers">{confidence}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {stakeAmount && (
              <div className="rounded-xl p-4 text-center bg-secondary">
                <span className="text-xs text-muted-foreground block mb-1">Stake</span>
                <span className="text-xl font-semibold font-mono-numbers">{stakeAmount}</span>
              </div>
            )}

            <div className={cn(
              "rounded-xl p-4 text-center bg-secondary",
              !stakeAmount && "col-span-2"
            )}>
              <span className="text-xs text-muted-foreground block mb-1">At Risk</span>
              <span className="text-xl font-semibold font-mono-numbers text-primary">{riskAmount}</span>
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Overconfidence is punished. Calibration matters. Your reputation score
              will adjust based on how well your confidence matches reality.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Go Back
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              Submit Prediction
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
