import { useCallback, useRef, useState } from "react";
import type { Contestant, SerializedTournament } from "../types";

function matchKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function generatePairings(
  contestants: Contestant[],
  playedMatches: Set<string>,
): { pairings: [Contestant, Contestant][]; byePlayer: Contestant | null } {
  const sorted = [...contestants].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Math.random() - 0.5;
  });

  let remaining = [...sorted];
  let byePlayer: Contestant | null = null;

  if (remaining.length % 2 === 1) {
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (!remaining[i].hadBye) {
        byePlayer = remaining.splice(i, 1)[0];
        byePlayer.score++;
        byePlayer.hadBye = true;
        break;
      }
    }
    if (!byePlayer) {
      byePlayer = remaining.pop()!;
      byePlayer.score++;
    }
  }

  const pairings: [Contestant, Contestant][] = [];
  const used = new Set<number>();

  for (let i = 0; i < remaining.length; i++) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < remaining.length; j++) {
      if (used.has(j)) continue;
      const key = matchKey(remaining[i].name, remaining[j].name);
      if (!playedMatches.has(key)) {
        pairings.push([remaining[i], remaining[j]]);
        used.add(i);
        used.add(j);
        break;
      }
    }
  }

  const unpaired: Contestant[] = [];
  for (let i = 0; i < remaining.length; i++) {
    if (!used.has(i)) unpaired.push(remaining[i]);
  }
  const usedInFallback = new Set<number>();
  for (let i = 0; i < unpaired.length; i++) {
    if (usedInFallback.has(i)) continue;
    for (let j = i + 1; j < unpaired.length; j++) {
      if (usedInFallback.has(j)) continue;
      const key = matchKey(unpaired[i].name, unpaired[j].name);
      if (!playedMatches.has(key)) {
        pairings.push([unpaired[i], unpaired[j]]);
        usedInFallback.add(i);
        usedInFallback.add(j);
        break;
      }
    }
  }

  return { pairings, byePlayer };
}

function computeResults(contestants: Contestant[]): Contestant[] {
  const results = contestants.map((c) => ({
    ...c,
    buchholz: c.opponents.reduce((sum, oppName) => {
      const opp = contestants.find((x) => x.name === oppName);
      return sum + (opp ? opp.score : 0);
    }, 0),
  }));

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.buchholz - a.buchholz;
  });

  return results;
}

export interface TournamentProgress {
  matchCount: number;
  totalMatches: number;
  currentRound: number;
  totalRounds: number;
}

export interface UseTournamentResult {
  currentMatch: [Contestant, Contestant] | null;
  progress: TournamentProgress;
  isComplete: boolean;
  results: Contestant[];
  vote: (index: 0 | 1) => void;
  snapshot: () => SerializedTournament | null;
}

export function useTournament(
  values: string[],
  initialTournament?: SerializedTournament,
): UseTournamentResult {
  const contestantsRef = useRef<Contestant[]>([]);
  const playedMatchesRef = useRef(new Set<string>());
  const currentPairingsRef = useRef<[Contestant, Contestant][]>([]);
  const currentPairIndexRef = useRef(0);
  const currentRoundRef = useRef(0);
  const totalRoundsRef = useRef(0);
  const matchCountRef = useRef(0);
  const totalMatchesRef = useRef(0);
  const initializedRef = useRef(false);

  const [currentMatch, setCurrentMatch] = useState<
    [Contestant, Contestant] | null
  >(null);
  const [progress, setProgress] = useState<TournamentProgress>({
    matchCount: 0,
    totalMatches: 0,
    currentRound: 0,
    totalRounds: 0,
  });
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<Contestant[]>([]);

  const updateProgress = useCallback(() => {
    setProgress({
      matchCount: matchCountRef.current,
      totalMatches: totalMatchesRef.current,
      currentRound: currentRoundRef.current,
      totalRounds: totalRoundsRef.current,
    });
  }, []);

  const showMatch = useCallback(() => {
    if (currentPairIndexRef.current >= currentPairingsRef.current.length) {
      nextRound();
      return;
    }

    const pair = currentPairingsRef.current[currentPairIndexRef.current];
    matchCountRef.current++;
    setCurrentMatch(pair);
    updateProgress();
  }, []);

  const nextRound = useCallback(() => {
    currentRoundRef.current++;
    if (currentRoundRef.current > totalRoundsRef.current) {
      const finalResults = computeResults(contestantsRef.current);
      setResults(finalResults);
      setIsComplete(true);
      return;
    }

    const { pairings } = generatePairings(
      contestantsRef.current,
      playedMatchesRef.current,
    );
    currentPairingsRef.current = pairings;
    currentPairIndexRef.current = 0;

    if (pairings.length === 0) {
      const finalResults = computeResults(contestantsRef.current);
      setResults(finalResults);
      setIsComplete(true);
      return;
    }

    updateProgress();
    showMatch();
  }, [showMatch, updateProgress]);

  if (!initializedRef.current) {
    if (initialTournament) {
      // Restore from saved state
      initializedRef.current = true;
      contestantsRef.current = initialTournament.contestants;
      playedMatchesRef.current = new Set(initialTournament.playedMatches);
      currentRoundRef.current = initialTournament.currentRound;
      totalRoundsRef.current = initialTournament.totalRounds;
      currentPairIndexRef.current = initialTournament.currentPairIndex;
      matchCountRef.current = initialTournament.matchCount;
      totalMatchesRef.current = initialTournament.totalMatches;

      const contestantMap = new Map(
        initialTournament.contestants.map((c) => [c.name, c]),
      );
      currentPairingsRef.current = initialTournament.currentPairings
        .map(
          ([a, b]) =>
            [contestantMap.get(a)!, contestantMap.get(b)!] as [
              Contestant,
              Contestant,
            ],
        )
        .filter(([a, b]) => a && b);

      const pair =
        currentPairingsRef.current[currentPairIndexRef.current] ?? null;
      if (pair) {
        setCurrentMatch(pair);
        setProgress({
          matchCount: matchCountRef.current,
          totalMatches: totalMatchesRef.current,
          currentRound: currentRoundRef.current,
          totalRounds: totalRoundsRef.current,
        });
      }
    } else if (values.length > 0) {
      // Fresh start
      initializedRef.current = true;

      contestantsRef.current = values.map((name) => ({
        name,
        score: 0,
        hadBye: false,
        buchholz: 0,
        opponents: [],
      }));

      playedMatchesRef.current = new Set();
      currentRoundRef.current = 0;
      totalRoundsRef.current = Math.ceil(Math.log2(values.length));
      matchCountRef.current = 0;
      totalMatchesRef.current =
        totalRoundsRef.current * Math.floor(values.length / 2);

      currentRoundRef.current = 1;
      const { pairings } = generatePairings(
        contestantsRef.current,
        playedMatchesRef.current,
      );
      currentPairingsRef.current = pairings;
      currentPairIndexRef.current = 0;
      matchCountRef.current = 1;

      if (pairings.length > 0) {
        setCurrentMatch(pairings[0]);
        setProgress({
          matchCount: 1,
          totalMatches: totalMatchesRef.current,
          currentRound: 1,
          totalRounds: totalRoundsRef.current,
        });
      }
    }
  }

  const vote = useCallback(
    (index: 0 | 1) => {
      const pair = currentPairingsRef.current[currentPairIndexRef.current];
      if (!pair) return;

      const [a, b] = pair;
      const winner = index === 0 ? a : b;
      winner.score++;

      a.opponents.push(b.name);
      b.opponents.push(a.name);

      playedMatchesRef.current.add(matchKey(a.name, b.name));
      currentPairIndexRef.current++;

      if (
        currentPairIndexRef.current >= currentPairingsRef.current.length
      ) {
        nextRound();
      } else {
        showMatch();
      }
    },
    [nextRound, showMatch],
  );

  const snapshot = useCallback((): SerializedTournament | null => {
    if (!initializedRef.current) return null;
    return {
      contestants: contestantsRef.current,
      playedMatches: [...playedMatchesRef.current],
      currentRound: currentRoundRef.current,
      totalRounds: totalRoundsRef.current,
      currentPairings: currentPairingsRef.current.map(([a, b]) => [
        a.name,
        b.name,
      ]),
      currentPairIndex: currentPairIndexRef.current,
      matchCount: matchCountRef.current,
      totalMatches: totalMatchesRef.current,
    };
  }, []);

  return { currentMatch, progress, isComplete, results, vote, snapshot };
}
