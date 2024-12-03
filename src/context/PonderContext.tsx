import { createContext, useContext, type ReactNode } from "react";
import { type PonderSDK } from "@/index";

const PonderContext = createContext<PonderSDK | undefined>(undefined);

export function PonderProvider({
  sdk,
  children,
}: {
  sdk: PonderSDK;
  children: ReactNode;
}) {
  return (
    <PonderContext.Provider value={sdk}>{children}</PonderContext.Provider>
  );
}

export function usePonderSDK() {
  const context = useContext(PonderContext);
  if (!context) {
    throw new Error("usePonderSDK must be used within a PonderProvider");
  }
  return context;
}
