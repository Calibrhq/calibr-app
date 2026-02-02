"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ConfidenceSliderEnhanced } from "./ConfidenceSliderEnhanced";
import { ConfirmationModal } from "./ConfirmationModal";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { SharePredictionModal } from "./SharePredictionModal";
import { AlreadyPredictedModal } from "./AlreadyPredictedModal";
import { cn } from "@/lib/utils";
import { ThumbsUp, ThumbsDown, Sparkles, AlertCircle, UserPlus, Wallet, Coins, CheckCircle2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useWalletContext } from "@/contexts/WalletContext";
import { buildPlacePredictionWithPointsTx } from "@/lib/points-transactions";
import { getErrorMessage } from "@/lib/calibr-types";
import { usePointsBalance } from "@/hooks/usePointsBalance";
import { useUserPredictions, type UserPrediction } from "@/hooks/useUserPredictions";
import { triggerConfetti } from "@/lib/confetti";
import Link from "next/link";
import { HoldToConfirmButton } from "@/components/ui/HoldToConfirmButton";

interface PredictionPanelProps {
  marketId: string;
  question: string;
  onPredictionSuccess?: () => void;
}

// Calculate risk based on Calibr's formula
function calculateRisk(confidence: number): number {
  return Math.max(5, Math.round(100 * (confidence - 50) / 40));
}

export function PredictionPanel({ marketId, question, onPredictionSuccess }: PredictionPanelProps) {
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

  // Get user's predictions to check for duplicates
  const { data: userPredictions, refetch: refetchPredictions } = useUserPredictions();

  const [localPrediction, setLocalPrediction] = useState<UserPrediction | null>(null);

  // Check if user already has a prediction on this market
  const existingPrediction = useMemo(() => {
    if (localPrediction) return localPrediction;
    if (!userPredictions) return null;
    return userPredictions.find(p => p.marketId === marketId);
  }, [userPredictions, marketId, localPrediction]);

  const [selectedSide, setSelectedSide] = useState<"yes" | "no" | null>(null);
  const [confidence, setConfidence] = useState(60);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAlreadyPredicted, setShowAlreadyPredicted] = useState(false);
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
        // 🎉 Trigger confetti celebration!
        triggerConfetti({ type: "success" });

        toast.success("Prediction placed!", {
          description: `${selectedSide.toUpperCase()} at ${confidence}% confidence`,
          duration: 4000,
        });

        // 1. Optimistic Update: Set local prediction immediately
        // This ensures the UI updates to "Already Predicted" instantly without waiting for indexing
        setLocalPrediction({
          predictionId: "pending-" + Date.now(),
          marketId,
          side: selectedSide === "yes",
          confidence,
          risk,
          stake,
          status: "active"
        });

        // 2. UI Updates: Close confirm, Open share
        setShowConfirmation(false);
        setShowShareModal(true);
        setIsSubmitting(false); // Stop loading manually

        // 3. Background Refetch
        // We don't await this so the UI is responsive
        Promise.all([
          refreshProfile(),
          refetchPoints(),
          refetchPredictions(),
        ]).then(() => {
          if (onPredictionSuccess) {
            onPredictionSuccess();
          }
        });

      } else {
        toast.error("Transaction failed");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Place prediction error:", error);
      setIsSubmitting(false);

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
      // ensure modal is closed if we haven't already
      if (!showShareModal) {
        setShowConfirmation(false);
      }
      // We only set isSubmitting false if we didn't succeed (success handles it earlier)
      // But safe to set it again
      setIsSubmitting(false);
    }
  };

  // Render logic as a helper function to avoid early return issues with hooks/modals
  const renderContent = () => {
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

    // Already predicted on this market
    if (existingPrediction) {
      const sideLabel = existingPrediction.side ? "YES" : "NO";
      const sideColor = existingPrediction.side ? "text-green-500" : "text-red-500";
      const sideBg = existingPrediction.side
        ? "bg-green-500/10 border-green-500/30"
        : "bg-red-500/10 border-red-500/30";

      return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
              <h3 className="font-medium">Prediction Placed</h3>
            </div>
          </div>
          <div className="p-6">
            {/* Success message */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-sm">You've already predicted on this market</p>
                <p className="text-xs text-muted-foreground">One prediction per market ensures fair calibration</p>
              </div>
            </div>

            {/* Prediction card */}
            <div className={`rounded-lg border ${sideBg} p-4 mb-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Your Prediction</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30">
                  Awaiting Resolution
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold ${sideColor}`}>{sideLabel}</span>
                <span className="text-muted-foreground">@</span>
                <span className="font-medium">{existingPrediction.confidence}% confidence</span>
              </div>
              <div className="flex items-center justify-between mt-3 text-sm">
                <span className="text-muted-foreground">Risk at stake</span>
                <span className="font-medium">{existingPrediction.risk} pts</span>
              </div>
            </div>

            {/* Share Button (Dashboard removed as requested) */}
            <Button
              variant="outline"
              className="w-full gap-2 h-11 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
              onClick={() => {
                // Set state for the modal based on the existing prediction
                const side = existingPrediction.side ? "yes" : "no";
                setSelectedSide(side);
                setConfidence(existingPrediction.confidence);
                setShowShareModal(true);
              }}
            >
              <Share2 className="h-4 w-4" />
              Share Prediction
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-sm">Make a Prediction</h3>
            <InfoTooltip content="Fixed 100 pt stake. Your confidence determines the risk vs. reward." />
          </div>
          <p className="text-xs text-muted-foreground">
            Fixed stake: {stake} pts
          </p>
        </div>

        <div className="p-5 space-y-6">
          <div className="flex gap-3">
            <button
              onClick={() => handleSideSelect("yes")}
              className={cn(
                "relative py-2 px-3 rounded-xl font-bold text-base transition-all duration-300 w-full",
                "flex flex-col items-center gap-1 border-2",
                "active:scale-95 hover:shadow-md",
                selectedSide === "yes"
                  ? "bg-gradient-to-br from-green-500 to-green-600 border-green-600 text-white shadow-green-500/25 shadow-lg scale-[1.02]"
                  : "bg-background border-border text-muted-foreground hover:border-green-500/50 hover:bg-green-500/5 hover:text-green-600 hover:-translate-y-0.5"
              )}
            >
              <ThumbsUp className={cn(
                "h-5 w-5 transition-transform",
                selectedSide === "yes" ? "scale-110 -rotate-12" : "scale-100 group-hover:-rotate-12"
              )} strokeWidth={2.5} />
              <span>YES</span>
              {selectedSide === "yes" && (
                <div className="absolute top-1.5 right-1.5">
                  <span className="flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                  </span>
                </div>
              )}
            </button>
            <button
              onClick={() => handleSideSelect("no")}
              className={cn(
                "relative py-2 px-3 rounded-xl font-bold text-base transition-all duration-300 w-full",
                "flex flex-col items-center gap-1 border-2",
                "active:scale-95 hover:shadow-md",
                selectedSide === "no"
                  ? "bg-gradient-to-br from-red-500 to-red-600 border-red-600 text-white shadow-red-500/25 shadow-lg scale-[1.02]"
                  : "bg-background border-border text-muted-foreground hover:border-red-500/50 hover:bg-red-500/5 hover:text-red-600 hover:-translate-y-0.5"
              )}
            >
              <ThumbsDown className={cn(
                "h-5 w-5 transition-transform",
                selectedSide === "no" ? "scale-110 rotate-[12deg]" : "scale-100 group-hover:rotate-[12deg]"
              )} strokeWidth={2.5} />
              <span>NO</span>
              {selectedSide === "no" && (
                <div className="absolute top-1.5 right-1.5">
                  <span className="flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                  </span>
                </div>
              )}
            </button>
          </div>

          {selectedSide && (
            <div className="animate-fade-in space-y-6 pt-4 border-t border-border">
              {/* Enhanced Confidence Slider */}
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

              {/* Hold to Predict Button */}
              <HoldToConfirmButton
                onConfirm={handleReview}
                text="Hold to Review"
                holdingText="Reviewing..."
                className="w-full"
              />

              {/* Confidence Cap Warning */}

            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {renderContent()}

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

      <SharePredictionModal
        open={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          // Reset form on close
          setSelectedSide(null);
          setConfidence(60);
        }}
        question={question}
        side={selectedSide || "yes"}
        confidence={confidence}
      />

      {existingPrediction && (
        <AlreadyPredictedModal
          isOpen={showAlreadyPredicted}
          onClose={() => setShowAlreadyPredicted(false)}
          prediction={existingPrediction}
          marketQuestion={question}
        />
      )}
    </>
  );
}
