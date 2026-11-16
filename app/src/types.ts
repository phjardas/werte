import type { Farbe } from "./farben";
import type { KontextId } from "./kontexte";

export interface Contestant {
  name: string;
  score: number;
  hadBye: boolean;
  buchholz: number;
  opponents: string[];
}

export interface WertInfo {
  name: string;
  kurzbeschreibung: string;
  verwandt: string[];
  farbe: Farbe;
}

export interface Szenario {
  werte: [string, string];
  szenario: string;
  antworten: [string, string];
  version: string;
}

export type Step =
  | "selection"
  | "suggestions"
  | "filter-intro"
  | "filter"
  | "comparison-intro"
  | "comparison";

export interface TournamentState {
  contestants: Contestant[];
  playedMatches: Set<string>;
  currentRound: number;
  totalRounds: number;
  currentPairings: [Contestant, Contestant][];
  currentPairIndex: number;
  matchCount: number;
  totalMatches: number;
}

export interface SerializedTournament {
  contestants: Contestant[];
  playedMatches: string[];
  currentRound: number;
  totalRounds: number;
  currentPairings: [string, string][];
  currentPairIndex: number;
  matchCount: number;
  totalMatches: number;
}

export interface TestState {
  step: Step;
  selectedValues: string[];
  finalValues: string[];
  /** The shuffled order of the values in the selection pages. Missing in tests saved before paging. */
  order?: string[];
  /** The selection page (0-based) the test was left on. */
  page?: number;
  tournament?: SerializedTournament;
}

export type TestStatus = "active" | "completed";

export interface TestSession {
  testId: string;
  status: TestStatus;
  kontext: KontextId;
  state: TestState | null;
  results: Contestant[] | null;
  zusammenfassung: string | null;
  zusammenfassungStatus: "generating" | "completed" | "failed" | null;
  emailGesendet: boolean;
  /** ISO timestamp after which the test is deleted; null for tests created before expiry was introduced. */
  ablaufAm: string | null;
}

export interface Statistik {
  tests: number;
  punkteskala: number[];
  rangliste: { name: string; punkte: number; platzierungen: number[] }[];
}
