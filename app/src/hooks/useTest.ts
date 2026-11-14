import { useCallback, useEffect, useState } from "react";
import { getTest } from "../api";
import type { TestSession } from "../types";

interface UseTestResult {
  session: TestSession | null;
  isLoading: boolean;
  error?: Error;
  refetch: () => void;
}

export function useTest(testId: string): UseTestResult {
  const [session, setSession] = useState<TestSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(undefined);

    getTest(testId)
      .then((s) => {
        if (cancelled) return;
        if (s === null) setError(
            new Error(
              "Diesen Test gibt es nicht oder nicht mehr. Tests werden 12 Monate nach dem Start gelöscht.",
            ),
          );
        else setSession(s);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [testId, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { session, isLoading, error, refetch };
}
