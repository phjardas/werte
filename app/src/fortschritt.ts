import type { Step } from "./types";

/**
 * Rough progress of a test in percent, for motivation only. The selection (pages, suggestions, filter) makes up
 * the first half and starts at 10 %, the comparisons make up the second half. `match` is 1-based.
 */
export function fortschritt(step: Step, seite: number, seiten: number, match: number, matches: number): number {
  switch (step) {
    case "selection":
      return 10 + (30 * seite) / Math.max(seiten, 1);
    case "suggestions":
      return 40;
    case "filter-intro":
      return 43;
    case "filter":
      return 46;
    case "comparison-intro":
      return 50;
    case "comparison":
      return 50 + (50 * Math.max(match - 1, 0)) / Math.max(matches, 1);
  }
}
