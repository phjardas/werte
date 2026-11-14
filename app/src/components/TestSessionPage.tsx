import { useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { completeTest } from "../api";
import { useStateSync } from "../hooks/useStateSync";
import { useTest } from "../hooks/useTest";
import { useTournament } from "../hooks/useTournament";
import type { SerializedTournament, Step, TestState } from "../types";
import { ComparisonIntroStep } from "./ComparisonIntroStep";
import { ComparisonStep } from "./ComparisonStep";
import { ErrorScreen } from "./ErrorScreen";
import { FilterStep } from "./FilterStep";
import { IntroStep } from "./IntroStep";
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

  if (session.status === "completed" && session.results) {
    return <ResultsScreen testId={testId} firstName={session.firstName} results={session.results} />;
  }

  // status === "active"
  return <ActiveTest testId={testId} firstName={session.firstName} initialState={session.state} />;
}

interface ActiveTestProps {
  testId: string;
  firstName: string | null;
  initialState: TestState | null;
}

function ActiveTest({ testId, firstName, initialState }: ActiveTestProps) {
  const [step, setStep] = useState<Step>(initialState?.step ?? "intro");
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
      completeTest(testId, tournament.results.slice(0, 5)).catch(console.error);
    }
  }, [step, tournament.isComplete, tournament.results, testId, completed]);

  const handleStartComparison = useCallback(() => {
    setStep("comparison");
    syncState(buildState({ step: "comparison" }));
  }, [buildState, syncState]);

  if (step === "comparison" && tournament.isComplete) {
    return <ResultsScreen testId={testId} firstName={firstName} results={tournament.results} />;
  }

  const tournamentWithWrappedVote = { ...tournament, vote: handleVote };

  return (
    <>
      <SaveIndicator status={saveStatus} />
      {step === "intro" && <IntroStep firstName={firstName} onNext={() => setStep("selection")} />}
      {step === "selection" && <SelectionStep onNext={handleSelectionNext} />}
      {step === "filter" && (
        <FilterStep
          values={selectedValues}
          onNext={handleFilterNext}
          onBack={handleFilterBack}
        />
      )}
      {step === "comparison-intro" && (
        <ComparisonIntroStep
          firstName={firstName}
          valueCount={finalValues.length}
          onNext={handleStartComparison}
        />
      )}
      {step === "comparison" && (
        <ComparisonStep tournament={tournamentWithWrappedVote} />
      )}
    </>
  );
}

function SaveIndicator({ status }: { status: string }) {
  if (status === "idle") return null;
  return <div className={`save-indicator save-${status}`} aria-live="polite" />;
}
