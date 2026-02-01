"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { SuiProvider } from "@/components/providers/SuiProvider";
import { WalletContextProvider } from "@/contexts/WalletContext";
import { OnboardingTourProvider } from "@/components/ui/OnboardingTour";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <SuiProvider>
        <WalletContextProvider>
          <TooltipProvider delayDuration={200}>
            <OnboardingTourProvider>
              {children}
            </OnboardingTourProvider>
            <Toaster />
            <Sonner
              position="bottom-right"
              toastOptions={{
                classNames: {
                  toast: "bg-card border-border",
                  title: "text-foreground",
                  description: "text-muted-foreground",
                },
              }}
            />
          </TooltipProvider>
        </WalletContextProvider>
      </SuiProvider>
    </ThemeProvider>
  );
}
