"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  // Lazy-init so each tab gets its own client (Next StrictMode safe)
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, err: unknown) => {
              // Don't retry auth failures — let the axios refresh interceptor handle it,
              // and if it fails the user is bounced to /login.
              const status =
                (err as { response?: { status?: number } } | null)?.response?.status;
              if (status === 401 || status === 403) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
