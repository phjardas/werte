import { useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { completeTest } from "../api";
import { useStateSync } from "../hooks/useStateSync";
import { useTest } from "../hooks/useTest";
import { useTournament } from "../hooks/useTournament";
import type { KontextId } from "../kontexte";
import type { SerializedTournament, Step, TestState } from "../types";
import { ComparisonIntroStep } from "./ComparisonIntroStep";
import { ComparisonStep } from "./ComparisonStep";
import { ErrorScreen } from "./ErrorScreen";
import { FilterStep } from "./FilterStep";
import { ResultsScreen } from "./ResultsScreen";
import { SelectionStep } from "./SelectionStep";

export function TestSessionPage() {
  const { testId } = useParams({ from: "/tests/$testId" });
  const { session, isLoading, error, refetch } = useTest(testId);

  if (isLoading) {
    return (
      <div className="screen active step-loading">
        <span className="spinner spinner-lg" />
      </div>
    );
  }

  if (error || !session)
    return (
      <ErrorScreen
        title="Test nicht gefunden"
        message={
          error?.message ??
          "Der angeforderte Test konnte nicht gefunden werden."
        }
      />
    );

  // A backend without contexts returns none; those tests are Berufsleben.
  const kontext = session.kontext ?? "beruf";

  if (session.status === "completed" && session.results) {
    return (
      <ResultsScreen
        testId={testId}
        kontext={kontext}
        results={session.results}
        emailGesendet={session.emailGesendet}
        ablaufAm={session.ablaufAm}
      />
    );
  }

  // status === "active"
  return <ActiveTest testId={testId} kontext={kontext} initialState={session.state} />;
}

interface ActiveTestProps {
  testId: string;
  kontext: KontextId;
  initialState: TestState | null;
}

function ActiveTest({ testId, kontext, initialState }: ActiveTestProps) {
  const [step, setStep] = useState<Step>(
    // Tests saved before the intro step was removed may still carry "intro".
    initialState?.step && (initialState.step as string) !== "intro"
      ? initialState.step
      : "selection",
  );
  const [selectedValues, setSelectedValues] = useState<string[]>(
    initialState?.selectedValues ?? [],
  );
  const [finalValues, setFinalValues] = useState<string[]>(
    initialState?.finalValues ?? [],
  );
  const [completed, setCompleted] = useState(false);

  const { syncState, saveStatus } = useStateSync(testId);

  const tournament = useTournament(
    step === "comparison" ? finalValues : [],
    step === "comparison"
      ? (initialState?.tournament as SerializedTournament | undefined)
      : undefined,
  );

  const buildState = useCallback(
    (
      overrides: Partial<
        Pick<TestState, "step" | "selectedValues" | "finalValues"> & {
          tournament: SerializedTournament | undefined;
        }
      >,
    ): TestState => ({
      step: overrides.step ?? step,
      selectedValues: overrides.selectedValues ?? selectedValues,
      finalValues: overrides.finalValues ?? finalValues,
      tournament: overrides.tournament,
    }),
    [step, selectedValues, finalValues],
  );

  const handleSelectionNext = useCallback(
    (selected: string[]) => {
      setSelectedValues(selected);
      if (selected.length <= 10) {
        setFinalValues(selected);
        setStep("comparison-intro");
        syncState(
          buildState({
            step: "comparison-intro",
            selectedValues: selected,
            finalValues: selected,
          }),
        );
      } else {
        setStep("filter");
        syncState(
          buildState({
            step: "filter",
            selectedValues: selected,
            finalValues: [],
          }),
        );
      }
    },
    [buildState, syncState],
  );

  const handleFilterNext = useCallback(
    (final: string[]) => {
      setFinalValues(final);
      setStep("comparison-intro");
      syncState(buildState({ step: "comparison-intro", finalValues: final }));
    },
    [buildState, syncState],
  );

  const handleFilterBack = useCallback(() => {
    setStep("selection");
  }, []);

  const handleVote = useCallback(
    (index: 0 | 1) => {
      tournament.vote(index);
      // Refs are updated synchronously — snapshot captures current state
      const snap = tournament.snapshot() ?? undefined;
      syncState(buildState({ tournament: snap }));
    },
    [tournament, buildState, syncState],
  );

  // Complete the test when tournament finishes
  useEffect(() => {
    if (step === "comparison" && tournament.isComplete && !completed) {
      setCompleted(true);
      completeTest(testId, tournament.results).catch(console.error);
    }
  }, [step, tournament.isComplete, tournament.results, testId, completed]);

  const handleStartComparison = useCallback(() => {
    setStep("comparison");
    syncState(buildState({ step: "comparison" }));
  }, [buildState, syncState]);

  if (step === "comparison" && tournament.isComplete) {
    return <ResultsScreen testId={testId} kontext={kontext} results={tournament.results} />;
  }

  const tournamentWithWrappedVote = { ...tournament, vote: handleVote };

  return (
    <>
      <SaveIndicator status={saveStatus} />
      {step === "selection" && <SelectionStep kontext={kontext} onNext={handleSelectionNext} />}
      {step === "filter" && (
        <FilterStep
          values={selectedValues}
          onNext={handleFilterNext}
          onBack={handleFilterBack}
        />
      )}
      {step === "comparison-intro" && (
        <ComparisonIntroStep
          kontext={kontext}
          valueCount={finalValues.length}
          onNext={handleStartComparison}
        />
      )}
      {step === "comparison" && (
        <ComparisonStep kontext={kontext} tournament={tournamentWithWrappedVote} />
      )}
    </>
  );
}

function SaveIndicator({ status }: { status: string }) {
  if (status === "idle") return null;
  return <div className={`save-indicator save-${status}`} aria-live="polite" />;
}
