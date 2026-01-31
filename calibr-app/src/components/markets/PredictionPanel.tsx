"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfidenceSliderEnhanced } from "./ConfidenceSliderEnhanced";
import { ConfirmationModal } from "./ConfirmationModal";
import { cn } from "@/lib/utils";
import { ThumbsUp, ThumbsDown, Sparkles, AlertCircle, UserPlus, Wallet, Coins } from "lucide-react";
import { toast } from "sonner";
import { useWalletContext } from "@/contexts/WalletContext";
import { buildPlacePredictionWithPointsTx } from "@/lib/points-transactions";
import { getErrorMessage } from "@/lib/calibr-types";
import { usePointsBalance } from "@/hooks/usePointsBalance";
import Link from "next/link";

interface PredictionPanelProps {
  marketId: string;
  question: string;
}

// Calculate risk based on Calibr's formula
function calculateRisk(confidence: number): number {
  return Math.max(5, Math.round(100 * (confidence - 50) / 40));
}

export function PredictionPanel({ marketId, question }: PredictionPanelProps) {
  const {
    isConnected,
    hasProfile,
    userProfile,
    maxConfidence,
    createProfile,
    signAndExecuteTransaction,
    refreshProfile,
  } = useWalletContext();

  // Get user's points balance
  const { data: pointsBalance, refetch: refetchPoints } = usePointsBalance();

  const [selectedSide, setSelectedSide] = useState<"yes" | "no" | null>(null);
  const [confidence, setConfidence] = useState(60);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  // Fixed stake of 100 (as per Calibr protocol)
  const stake = 100;
  const risk = calculateRisk(confidence);
  const potentialLoss = risk;
  const protectedAmount = stake - risk;

  const handleSideSelect = (side: "yes" | "no") => {
    setSelectedSide(side);
    toast.info(`Selected ${side.toUpperCase()}`, {
      description: "Now choose your confidence level",
      duration: 2000,
    });
  };

  const handleReview = () => {
    if (!selectedSide) {
      toast.error("Please select YES or NO first");
      return;
    }
    setShowConfirmation(true);
  };

  const handleCreateProfile = async () => {
    setIsCreatingProfile(true);
    try {
      const result = await createProfile();
      if (result.success) {
        toast.success("Profile created!", {
          description: "You can now make predictions",
        });
      } else {
        toast.error("Failed to create profile", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("Failed to create profile", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleConfirm = async () => {
    if (!userProfile?.id || !selectedSide) {
      toast.error("Missing profile or selection");
      return;
    }

    if (!pointsBalance?.id) {
      toast.error("No points balance found", {
        description: "Please buy points first to make predictions",
      });
      return;
    }

    if (pointsBalance.balance < stake) {
      toast.error("Insufficient points", {
        description: `You have ${pointsBalance.balance} points, need ${stake}`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Build the transaction with points balance
      const tx = buildPlacePredictionWithPointsTx(
        userProfile.id,
        marketId,
        pointsBalance.id,
        selectedSide === "yes",
        confidence
      );

      // Sign and execute
      const result = await signAndExecuteTransaction(tx);

      if (result) {
        toast.success("Prediction placed!", {
          description: `${selectedSide.toUpperCase()} at ${confidence}% confidence`,
          duration: 4000,
        });

        // Refresh profile and points balance
        await refreshProfile();
        await refetchPoints();

        // Reset form
        setShowConfirmation(false);
        setSelectedSide(null);
        setConfidence(60);
      } else {
        toast.error("Transaction failed");
      }
    } catch (error) {
      console.error("Place prediction error:", error);

      // Try to extract abort code from error
      let errorMessage = "Transaction failed";
      if (error instanceof Error) {
        const match = error.message.match(/MoveAbort.*?(\d+)/);
        if (match) {
          errorMessage = getErrorMessage(parseInt(match[1]));
        } else {
          errorMessage = error.message;
        }
      }

      toast.error("Prediction failed", {
        description: errorMessage,
      });
    } finally {
      setShowConfirmation(false);
      setIsSubmitting(false);
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-medium">Make a Prediction</h3>
          </div>
        </div>
        <div className="p-6 text-center">
          <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Connect your wallet to make predictions
          </p>
        </div>
      </div>
    );
  }

  // No profile state
  if (!hasProfile) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-medium">Make a Prediction</h3>
          </div>
        </div>
        <div className="p-6 text-center">
          <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Create a profile to start making predictions and building your reputation
          </p>
          <Button
            onClick={handleCreateProfile}
            disabled={isCreatingProfile}
            className="gap-2"
          >
            {isCreatingProfile ? (
              <>
                <span className="animate-spin">⏳</span>
                Creating Profile...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Create Profile
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // No points balance state
  if (!pointsBalance || pointsBalance.balance < stake) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-medium">Make a Prediction</h3>
          </div>
        </div>
        <div className="p-6 text-center">
          <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">
            {pointsBalance ? `You have ${pointsBalance.balance} points` : "No points balance found"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            You need at least {stake} points to make a prediction
          </p>
          <Link href="/points">
            <Button className="gap-2">
              <Coins className="h-4 w-4" />
              Buy Points
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-medium">Make a Prediction</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Fixed stake: {stake} pts
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSideSelect("yes")}
              className={cn(
                "relative py-3 px-4 rounded-xl font-bold text-lg transition-all duration-300",
                "flex flex-col items-center gap-2 border-2",
                "active:scale-95 hover:shadow-md",
                selectedSide === "yes"
                  ? "bg-gradient-to-br from-green-500 to-green-600 border-green-600 text-white shadow-green-500/25 shadow-lg scale-[1.02]"
                  : "bg-background border-border text-muted-foreground hover:border-green-500/50 hover:bg-green-500/5 hover:text-green-600 hover:-translate-y-0.5"
              )}
            >
              <ThumbsUp className={cn(
                "h-6 w-6 transition-transform",
                selectedSide === "yes" ? "scale-110 rotate-[-12deg]" : "scale-100 group-hover:rotate-[-12deg]"
              )} strokeWidth={2.5} />
              <span>YES</span>
              {selectedSide === "yes" && (
                <div className="absolute top-2 right-2">
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                </div>
              )}
            </button>
            <button
              onClick={() => handleSideSelect("no")}
              className={cn(
                "relative py-3 px-4 rounded-xl font-bold text-lg transition-all duration-300",
                "flex flex-col items-center gap-2 border-2",
                "active:scale-95 hover:shadow-md",
                selectedSide === "no"
                  ? "bg-gradient-to-br from-red-500 to-red-600 border-red-600 text-white shadow-red-500/25 shadow-lg scale-[1.02]"
                  : "bg-background border-border text-muted-foreground hover:border-red-500/50 hover:bg-red-500/5 hover:text-red-600 hover:-translate-y-0.5"
              )}
            >
              <ThumbsDown className={cn(
                "h-6 w-6 transition-transform",
                selectedSide === "no" ? "scale-110 rotate-[12deg]" : "scale-100 group-hover:rotate-[12deg]"
              )} strokeWidth={2.5} />
              <span>NO</span>
              {selectedSide === "no" && (
                <div className="absolute top-2 right-2">
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                </div>
              )}
            </button>
          </div>

          {selectedSide && (
            <div className="animate-fade-in space-y-6 pt-4 border-t border-border">
              {/* Enhanced Confidence Slider */}
              <ConfidenceSliderEnhanced
                value={confidence}
                onChange={setConfidence}
                maxValue={maxConfidence}
              />

              {/* Payout Summary */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium mb-3">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span>Potential Outcomes</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                    <p className="text-xs text-green-600 dark:text-green-400 mb-1">If Correct</p>
                    <p className="text-lg font-bold font-mono-numbers text-green-600 dark:text-green-400">
                      +{risk} <span className="text-xs font-normal">+ share of pool</span>
                    </p>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                    <p className="text-xs text-red-600 dark:text-red-400 mb-1">If Wrong</p>
                    <p className="text-lg font-bold font-mono-numbers text-red-600 dark:text-red-400">
                      -{potentialLoss}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Keep {protectedAmount} protected
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleReview}
                className="w-full gap-2"
                size="lg"
              >
                <Sparkles className="h-4 w-4" />
                Review Prediction
              </Button>

              {/* Confidence Cap Warning */}
              {maxConfidence < 90 && (
                <p className="text-xs text-center text-muted-foreground">
                  Your confidence is capped at {maxConfidence}% based on your reputation.
                  <br />
                  Build your track record to unlock higher confidence.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        side={selectedSide || "yes"}
        confidence={confidence}
        riskAmount={risk}
        question={question}
        stakeAmount={stake}
        onConfirm={handleConfirm}
        isLoading={isSubmitting}
      />
    </>
  );
}

