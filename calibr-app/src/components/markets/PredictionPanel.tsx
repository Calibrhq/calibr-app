"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfidenceSlider } from "./ConfidenceSlider";
import { ConfirmationModal } from "./ConfirmationModal";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PredictionPanelProps {
  marketId: string;
  question: string;
  maxConfidence?: number;
}

export function PredictionPanel({ marketId, question, maxConfidence = 85 }: PredictionPanelProps) {
  const [selectedSide, setSelectedSide] = useState<"yes" | "no" | null>(null);
  const [confidence, setConfidence] = useState(65);
  const [stakeAmount, setStakeAmount] = useState<string>("50");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const calculateRisk = (conf: number, stake: number) => {
    const riskMultiplier = (conf - 50) / 50;
    return Math.round(stake * (1 + riskMultiplier));
  };

  const stake = parseFloat(stakeAmount) || 0;
  const riskAmount = calculateRisk(confidence, stake);
  const costPerShare = (confidence / 100).toFixed(2);

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <h3 className="text-lg font-medium">Make a Prediction</h3>

        {/* YES/NO Toggle */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedSide("yes")}
            className={cn(
              "py-4 px-6 rounded-xl font-medium text-lg transition-all",
              selectedSide === "yes"
                ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            Yes
          </button>
          <button
            onClick={() => setSelectedSide("no")}
            className={cn(
              "py-4 px-6 rounded-xl font-medium text-lg transition-all",
              selectedSide === "no"
                ? "bg-muted-foreground text-background ring-2 ring-muted-foreground ring-offset-2 ring-offset-background"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            No
          </button>
        </div>

        {selectedSide && (
          <div className="animate-fade-in space-y-6 pt-4 border-t border-border">
            {/* Confidence Slider with Tooltip */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Confidence Level</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Confidence reflects how sure you are. Higher confidence increases both reward and penalty.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <ConfidenceSlider
                value={confidence}
                onChange={setConfidence}
                maxValue={maxConfidence}
              />
            </div>

            {/* Stake Input */}
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground">Stake Amount</label>
              <Input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="Enter stake"
                className="font-mono-numbers"
                min="1"
              />
            </div>

            {/* Summary Box */}
            <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Position</span>
                <span className="font-medium capitalize">{selectedSide}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-medium font-mono-numbers">{confidence}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cost per share</span>
                <span className="font-medium font-mono-numbers">{costPerShare}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted-foreground">Total at risk</span>
                <span className="font-semibold font-mono-numbers text-primary">{riskAmount} pts</span>
              </div>
            </div>

            <Button
              onClick={() => setShowConfirmation(true)}
              className="w-full"
              size="lg"
              disabled={stake <= 0}
            >
              Review Prediction
            </Button>
          </div>
        )}
      </div>

      <ConfirmationModal
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        side={selectedSide || "yes"}
        confidence={confidence}
        riskAmount={riskAmount}
        question={question}
        stakeAmount={stake}
      />
    </>
  );
}
