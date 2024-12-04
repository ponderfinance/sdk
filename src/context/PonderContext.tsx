import { createContext, useContext, type ReactNode } from "react";
import { type PonderSDK } from "@/index";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const PonderContext = createContext<PonderSDK | undefined>(undefined);

export function PonderProvider({
  sdk,
  children,
  queryClient,
}: {
  sdk: PonderSDK;
  children: ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <PonderContext.Provider value={sdk}>{children}</PonderContext.Provider>
    </QueryClientProvider>
  );
}

export function usePonderSDK() {
  const context = useContext(PonderContext);
  if (!context) {
    throw new Error("usePonderSDK must be used within a PonderProvider");
  }
  return context;
}
