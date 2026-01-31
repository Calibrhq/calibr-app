"use client";
/* eslint-disable */

import { ReactNode, useMemo, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createDAppKitInstance } from "@/lib/sui-config";

interface SuiProviderProps {
  children: ReactNode;
}

export function SuiProvider({ children }: SuiProviderProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [DAppKitProvider, setDAppKitProvider] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dAppKit, setDAppKit] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  // Create query client with proper configuration
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      }),
    []
  );

  // Initialize dApp Kit on client side only
  useEffect(() => {
    setIsClient(true);

    // Dynamic import to avoid SSR issues
    const initDAppKit = async () => {
      try {
        const [module, dAppKitInstance] = await Promise.all([
          import("@mysten/dapp-kit-react"),
          createDAppKitInstance(),
        ]);
        setDAppKitProvider(() => module.DAppKitProvider);
        setDAppKit(dAppKitInstance);
      } catch (error) {
        console.error("Failed to load dApp Kit:", error);
      }
    };

    initDAppKit();
  }, []);

  // Show children without wallet features during SSR or while loading
  if (!isClient || !DAppKitProvider || !dAppKit) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  const Provider = DAppKitProvider;

  return (
    <QueryClientProvider client={queryClient}>
      <Provider dAppKit={dAppKit}>
        {children}
      </Provider>
    </QueryClientProvider>
  );
}
