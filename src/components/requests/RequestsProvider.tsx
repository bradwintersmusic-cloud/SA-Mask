"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { RequestsSnapshot } from "@/lib/studio-assistant/types";
import { mergeRequestsSnapshot } from "@/lib/studio-assistant/request-snapshot";

const RequestsContext = createContext<{
  snapshot: RequestsSnapshot;
  acceptSnapshot: (next: RequestsSnapshot) => void;
} | null>(null);

export function RequestsProvider({ initialSnapshot, children }: {
  initialSnapshot: RequestsSnapshot;
  children: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [previousInitial, setPreviousInitial] = useState(initialSnapshot);
  if (initialSnapshot !== previousInitial) {
    setPreviousInitial(initialSnapshot);
    setSnapshot(previous => mergeRequestsSnapshot(previous, initialSnapshot));
  }
  const acceptSnapshot = useCallback((next: RequestsSnapshot) => {
    setSnapshot(previous => mergeRequestsSnapshot(previous, next));
  }, []);
  return <RequestsContext.Provider value={{ snapshot, acceptSnapshot }}>{children}</RequestsContext.Provider>;
}

export function useRequestsSnapshot(initialSnapshot?: RequestsSnapshot) {
  const context = useContext(RequestsContext);
  if (!context) throw new Error("RequestsProvider is required.");
  const { acceptSnapshot } = context;
  // Page navigation can deliver a fresh snapshot while the shell stays mounted.
  useEffect(() => {
    if (initialSnapshot) acceptSnapshot(initialSnapshot);
  }, [initialSnapshot, acceptSnapshot]);
  return context;
}
