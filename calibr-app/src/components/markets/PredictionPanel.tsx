"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfidenceSliderEnhanced } from "./ConfidenceSliderEnhanced";
import { ConfirmationModal } from "./ConfirmationModal";
import { cn } from "@/lib/utils";
import { ThumbsUp, ThumbsDown, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PredictionPanelProps {
  marketId: string;
  question: string;
  maxConfidence?: number;
}

// Calculate risk based on Calibr's formula
function calculateRisk(confidence: number): number {
  return Math.max(5, Math.round(100 * (confidence - 50) / 40));
}

export function PredictionPanel({ marketId, question, maxConfidence = 70 }: PredictionPanelProps) {
  const [selectedSide, setSelectedSide] = useState<"yes" | "no" | null>(null);
  const [confidence, setConfidence] = useState(60);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleConfirm = async () => {
    setIsSubmitting(true);
    
    // TODO: Actual contract call will go here
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success("Prediction placed!", {
      description: `${selectedSide?.toUpperCase()} at ${confidence}% confidence`,
      duration: 4000,
    });
    
    setShowConfirmation(false);
    setIsSubmitting(false);
    setSelectedSide(null);
    setConfidence(60);
  };

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
          {/* YES/NO Toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSideSelect("yes")}
              className={cn(
                "relative py-5 px-6 rounded-xl font-medium text-lg transition-all duration-300",
                "flex flex-col items-center gap-2",
                selectedSide === "yes"
                  ? "bg-green-500 text-white ring-2 ring-green-500 ring-offset-2 ring-offset-background shadow-lg"
                  : "bg-secondary text-secondary-foreground hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30 border border-transparent"
              )}
            >
              <ThumbsUp className={cn(
                "h-6 w-6 transition-transform",
                selectedSide === "yes" && "scale-110"
              )} />
              <span>Yes</span>
              {selectedSide === "yes" && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                </div>
              )}
            </button>
            <button
              onClick={() => handleSideSelect("no")}
              className={cn(
                "relative py-5 px-6 rounded-xl font-medium text-lg transition-all duration-300",
                "flex flex-col items-center gap-2",
                selectedSide === "no"
                  ? "bg-red-500 text-white ring-2 ring-red-500 ring-offset-2 ring-offset-background shadow-lg"
                  : "bg-secondary text-secondary-foreground hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30 border border-transparent"
              )}
            >
              <ThumbsDown className={cn(
                "h-6 w-6 transition-transform",
                selectedSide === "no" && "scale-110"
              )} />
              <span>No</span>
              {selectedSide === "no" && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
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
