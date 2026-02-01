"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// Tour step definition
interface TourStep {
    id: string;
    title: string;
    description: string;
    target?: string; // CSS selector for highlight (optional)
    position?: "top" | "bottom" | "left" | "right";
}

// Default tour steps for first-time users
const defaultTourSteps: TourStep[] = [
    {
        id: "welcome",
        title: "Welcome to Calibr! 👋",
        description: "Calibr is a prediction market that rewards calibration, not gambling. Let's show you how it works.",
    },
    {
        id: "confidence",
        title: "Confidence Matters",
        description: "Unlike other markets, you choose HOW confident you are (50-90%). Higher confidence = higher stakes if you're wrong.",
    },
    {
        id: "reputation",
        title: "Build Your Reputation",
        description: "Your reputation tracks how well-calibrated you are over time. Consistent accuracy unlocks higher confidence caps.",
    },
    {
        id: "explore",
        title: "Explore Markets",
        description: "Browse active markets and make predictions on real-world events. Start with lower confidence to build your track record!",
    },
];

// Context for tour state
interface TourContextType {
    isActive: boolean;
    currentStep: number;
    steps: TourStep[];
    startTour: () => void;
    endTour: () => void;
    nextStep: () => void;
    prevStep: () => void;
    skipTour: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function useTour() {
    const context = useContext(TourContext);
    if (!context) {
        throw new Error("useTour must be used within OnboardingTourProvider");
    }
    return context;
}

// Local storage key
const TOUR_COMPLETED_KEY = "calibr_tour_completed";

// Provider component
export function OnboardingTourProvider({
    children,
    steps = defaultTourSteps
}: {
    children: ReactNode;
    steps?: TourStep[];
}) {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

    // Check if tour was completed before
    useEffect(() => {
        const completed = localStorage.getItem(TOUR_COMPLETED_KEY);
        if (!completed) {
            // Auto-start tour for first-time users after a delay
            const timer = setTimeout(() => {
                setIsActive(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
        setHasCheckedStorage(true);
    }, []);

    const startTour = () => {
        setCurrentStep(0);
        setIsActive(true);
    };

    const endTour = () => {
        setIsActive(false);
        localStorage.setItem(TOUR_COMPLETED_KEY, "true");
    };

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            endTour();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const skipTour = () => {
        endTour();
    };

    return (
        <TourContext.Provider
            value={{
                isActive,
                currentStep,
                steps,
                startTour,
                endTour,
                nextStep,
                prevStep,
                skipTour,
            }}
        >
            {children}
            {isActive && <TourOverlay />}
        </TourContext.Provider>
    );
}

// Tour overlay component
function TourOverlay() {
    const { currentStep, steps, nextStep, prevStep, skipTour } = useTour();
    const step = steps[currentStep];

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300"
                onClick={skipTour}
            />

            {/* Tour Card */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <Sparkles className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">{step.title}</h3>
                                <p className="text-xs text-muted-foreground">
                                    Step {currentStep + 1} of {steps.length}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={skipTour}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Content */}
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                        {step.description}
                    </p>

                    {/* Progress dots */}
                    <div className="flex items-center justify-center gap-1.5 mb-6">
                        {steps.map((_, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "w-2 h-2 rounded-full transition-all duration-300",
                                    index === currentStep
                                        ? "w-6 bg-primary"
                                        : index < currentStep
                                            ? "bg-primary/50"
                                            : "bg-muted"
                                )}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={skipTour}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Skip tour
                        </button>
                        <div className="flex gap-2">
                            {currentStep > 0 && (
                                <Button variant="outline" size="sm" onClick={prevStep}>
                                    Back
                                </Button>
                            )}
                            <Button size="sm" onClick={nextStep} className="gap-1.5">
                                {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// Hook to manually trigger tour restart
export function useRestartTour() {
    return () => {
        localStorage.removeItem(TOUR_COMPLETED_KEY);
        window.location.reload();
    };
}
