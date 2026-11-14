import { useEffect, useState } from "react";
import { getTest } from "../api";

const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS = 60_000;

interface UseZusammenfassungResult {
  zusammenfassung: string | null;
  timedOut: boolean;
}

export function useZusammenfassung(
  testId: string | null,
): UseZusammenfassungResult {
  const [zusammenfassung, setZusammenfassung] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!testId) return;

    let cancelled = false;
    let pollTimeoutId: ReturnType<typeof setTimeout>;

    const deadlineTimeoutId = setTimeout(() => {
      if (!cancelled) setTimedOut(true);
      cancelled = true;
      clearTimeout(pollTimeoutId);
    }, TIMEOUT_MS);

    const check = async () => {
      if (cancelled) return;
      try {
        const session = await getTest(testId);
        if (cancelled) return;
        if (session?.zusammenfassung) {
          clearTimeout(deadlineTimeoutId);
          setZusammenfassung(session.zusammenfassung);
          return;
        }
      } catch {
        // ignore, retry
      }
      if (!cancelled) {
        pollTimeoutId = setTimeout(check, POLL_INTERVAL_MS);
      }
    };

    check();

    return () => {
      cancelled = true;
      clearTimeout(pollTimeoutId);
      clearTimeout(deadlineTimeoutId);
    };
  }, [testId]);

  return { zusammenfassung, timedOut };
}
