export interface Contestant {
  name: string;
  score: number;
  hadBye: boolean;
  buchholz: number;
  opponents: string[];
}

export interface Szenario {
  werte: [string, string];
  szenario: string;
  antworten: [string, string];
  version: string;
}

export type Step =
  | "intro"
  | "selection"
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
  tournament?: SerializedTournament;
}

export type TestStatus = "active" | "completed";

export interface TestSession {
  testId: string;
  status: TestStatus;
  state: TestState | null;
  results: Contestant[] | null;
  zusammenfassung: string | null;
  zusammenfassungStatus: "generating" | "completed" | "failed" | null;
  firstName: string | null;
  emailGesendet: boolean;
}

export interface Statistik {
  tests: number;
  punkteskala: number[];
  rangliste: { name: string; punkte: number; platzierungen: number[] }[];
}
