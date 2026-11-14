/**
 * Points per rank, index 0 is rank 1. Ranks beyond the scale score 0.
 * The scale is applied when the statistics are read, so changing it re-scores all past tests.
 */
export const PUNKTE = [10, 6, 4, 3, 2, 1];

/** How many ranks per test are counted. The test ends with at most 10 values. */
export const ERFASSTE_RAENGE = 10;

export interface StatistikRohdaten {
  /** Number of completed tests. */
  tests: number;
  /** Per value, how often it reached each rank (index 0 is rank 1). */
  platzierungen: Record<string, number[]>;
}

export interface StatistikRepository {
  /** Counts one completed test with its values in ranked order. */
  recordTest(werte: string[]): Promise<void>;
  get(): Promise<StatistikRohdaten>;
}

export interface RanglistenEintrag {
  name: string;
  punkte: number;
  platzierungen: number[];
}

export interface Statistik {
  tests: number;
  punkteskala: number[];
  rangliste: RanglistenEintrag[];
}

export function berechneStatistik(roh: StatistikRohdaten, punkteskala: number[] = PUNKTE): Statistik {
  const rangliste = Object.entries(roh.platzierungen)
    .map(([name, platzierungen]) => ({
      name,
      platzierungen,
      punkte: platzierungen.reduce((sum, anzahl, i) => sum + (anzahl ?? 0) * (punkteskala[i] ?? 0), 0),
    }))
    .filter((e) => e.punkte > 0)
    .sort((a, b) => b.punkte - a.punkte || a.name.localeCompare(b.name, "de"));
  return { tests: roh.tests, punkteskala, rangliste };
}
