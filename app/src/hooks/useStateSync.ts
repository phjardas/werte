import { useCallback, useEffect, useRef, useState } from "react";
import { updateTestState } from "../api";
import type { TestState } from "../types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseStateSyncResult {
  syncState: (state: TestState) => void;
  saveStatus: SaveStatus;
}

export function useStateSync(testId: string): UseStateSyncResult {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<TestState | null>(null);

  const save = useCallback(
    async (state: TestState, attempt = 1) => {
      setSaveStatus("saving");
      try {
        await updateTestState(testId, state);
        setSaveStatus("saved");
      } catch {
        if (attempt < 3) {
          const delay = 1000 * Math.pow(2, attempt - 1);
          setTimeout(() => save(state, attempt + 1), delay);
        } else {
          setSaveStatus("error");
        }
      }
    },
    [testId],
  );

  const syncState = useCallback(
    (state: TestState) => {
      pendingRef.current = state;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (pendingRef.current) save(pendingRef.current);
      }, 500);
    },
    [save],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { syncState, saveStatus };
}
