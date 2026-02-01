"use client";

import confetti from "canvas-confetti";

interface ConfettiOptions {
    type?: "success" | "celebration" | "subtle";
}

export function triggerConfetti({ type = "success" }: ConfettiOptions = {}) {
    const defaults = {
        origin: { y: 0.7 },
        zIndex: 9999,
    };

    switch (type) {
        case "celebration":
            // Full celebration with multiple bursts
            const count = 200;
            const fire = (particleRatio: number, opts: confetti.Options) => {
                confetti({
                    ...defaults,
                    ...opts,
                    particleCount: Math.floor(count * particleRatio),
                });
            };

            fire(0.25, {
                spread: 26,
                startVelocity: 55,
                origin: { x: 0.5, y: 0.7 },
            });
            fire(0.2, {
                spread: 60,
                origin: { x: 0.5, y: 0.7 },
            });
            fire(0.35, {
                spread: 100,
                decay: 0.91,
                scalar: 0.8,
                origin: { x: 0.5, y: 0.7 },
            });
            fire(0.1, {
                spread: 120,
                startVelocity: 25,
                decay: 0.92,
                scalar: 1.2,
                origin: { x: 0.5, y: 0.7 },
            });
            fire(0.1, {
                spread: 120,
                startVelocity: 45,
                origin: { x: 0.5, y: 0.7 },
            });
            break;

        case "subtle":
            // Subtle sparkle effect
            confetti({
                ...defaults,
                particleCount: 30,
                spread: 50,
                startVelocity: 30,
                gravity: 0.8,
                scalar: 0.8,
                colors: ["#22c55e", "#10b981", "#34d399"],
            });
            break;

        case "success":
        default:
            // Standard success burst
            confetti({
                ...defaults,
                particleCount: 80,
                spread: 70,
                startVelocity: 40,
                colors: ["#22c55e", "#10b981", "#6366f1", "#8b5cf6", "#fbbf24"],
            });
            break;
    }
}

// Convenient hook-style function for component use
export function useConfetti() {
    return {
        fire: (options?: ConfettiOptions) => triggerConfetti(options),
        success: () => triggerConfetti({ type: "success" }),
        celebration: () => triggerConfetti({ type: "celebration" }),
        subtle: () => triggerConfetti({ type: "subtle" }),
    };
}
