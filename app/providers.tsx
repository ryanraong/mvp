"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useTripStore } from "@/lib/store";

const noopSubscribe = () => () => {};

function useHasHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const hasHydrated = useHasHydrated();

  useEffect(() => {
    useTripStore.getState().ensureSeedTrip();
  }, []);

  if (!hasHydrated) {
    return <div className="flex-1" />;
  }

  return <>{children}</>;
}
