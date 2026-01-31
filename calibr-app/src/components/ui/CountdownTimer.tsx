import { useEffect, useState } from "react";
import { formatDistanceToNowStrict, differenceInSeconds } from "date-fns";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
    targetDate: string | number;
    size?: "sm" | "md" | "lg";
    showIcon?: boolean;
}

export function CountdownTimer({ targetDate, size = "sm", showIcon = true }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState("");
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const target = new Date(targetDate).getTime();

        const updateTimer = () => {
            const now = Date.now();
            const diff = target - now;

            if (diff <= 0) {
                setIsExpired(true);
                setTimeLeft("Ended");
                return;
            }

            // Calculate days, hours, minutes, seconds manually for precise "ticker" look
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            let text = "";
            if (days > 0) text += `${days}d `;
            text += `${hours}h ${minutes}m ${seconds}s`;

            setTimeLeft(text);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    const textSize = {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base font-medium",
    }[size];

    return (
        <div className={`flex items-center gap-1.5 ${textSize} ${isExpired ? "text-red-500" : "text-primary"} font-mono-numbers`}>
            {showIcon && <Clock className="w-4 h-4" />}
            <span>{timeLeft}</span>
        </div>
    );
}
