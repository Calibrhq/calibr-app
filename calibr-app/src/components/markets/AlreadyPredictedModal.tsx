"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, TrendingUp, TrendingDown, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface AlreadyPredictedModalProps {
    isOpen: boolean;
    onClose: () => void;
    prediction: {
        side: boolean;
        confidence: number;
        risk: number;
    };
    marketQuestion: string;
}

export function AlreadyPredictedModal({
    isOpen,
    onClose,
    prediction,
    marketQuestion,
}: AlreadyPredictedModalProps) {
    if (!isOpen) return null;

    const sideLabel = prediction.side ? "YES" : "NO";
    const sideColor = prediction.side ? "text-green-500" : "text-red-500";
    const sideBgColor = prediction.side
        ? "bg-green-500/10 border-green-500/30"
        : "bg-red-500/10 border-red-500/30";

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
                    >
                        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />

                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors z-10"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>

                            {/* Content */}
                            <div className="relative p-6">
                                {/* Header with icon */}
                                <div className="flex flex-col items-center text-center mb-6">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4 border border-blue-500/30">
                                        <CheckCircle2 className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">
                                        You've Already Predicted
                                    </h3>
                                    <p className="text-slate-400 text-sm max-w-xs">
                                        Each user can only place one prediction per market for fair calibration scoring.
                                    </p>
                                </div>

                                {/* Your prediction card */}
                                <div className={`rounded-xl border ${sideBgColor} p-4 mb-6`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm text-slate-400">Your Prediction</span>
                                        <div className="flex items-center gap-1.5 text-amber-400">
                                            <Clock className="w-4 h-4" />
                                            <span className="text-xs font-medium">Awaiting Resolution</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 mb-3">
                                        {prediction.side ? (
                                            <TrendingUp className="w-6 h-6 text-green-500" />
                                        ) : (
                                            <TrendingDown className="w-6 h-6 text-red-500" />
                                        )}
                                        <span className={`text-2xl font-bold ${sideColor}`}>
                                            {sideLabel}
                                        </span>
                                        <span className="text-slate-300 text-lg">
                                            @ {prediction.confidence}% confidence
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">Risk at stake</span>
                                        <span className="text-white font-medium">
                                            {prediction.risk} pts
                                        </span>
                                    </div>
                                </div>

                                {/* Market question reminder */}
                                <div className="bg-slate-800/50 rounded-lg p-3 mb-6 border border-slate-700/50">
                                    <p className="text-sm text-slate-300 line-clamp-2">
                                        "{marketQuestion}"
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        className="flex-1 bg-transparent border-slate-700 hover:bg-slate-800"
                                        onClick={onClose}
                                    >
                                        Close
                                    </Button>
                                    <Link href="/dashboard" className="flex-1">
                                        <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                            View Dashboard
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
